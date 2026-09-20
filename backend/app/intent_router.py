"""Hybrid intent routing for conversational coaching.

Safety and obvious learning-state intents stay deterministic. Ambiguous
language is classified by a small model, with a conservative local fallback.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from .prompt_engineering import COACH_INTENT_ROUTER
from .runtime_config import ai_api_base, ai_api_key, ai_provider, router_model


Intent = Literal["course_question", "learning_progress", "continue_learning", "career_next_step", "general_chat", "out_of_scope"]


class ModelRoute(BaseModel):
    intent: Intent
    lesson_id: str | None = None
    confidence: float = Field(ge=0, le=1)
    understood_text: str = Field(min_length=2, max_length=120)


@dataclass(frozen=True)
class RouteResult:
    intent: Intent
    lesson_id: str | None
    confidence: float
    understood_text: str
    mode: str
    provider: str | None = None
    model: str | None = None


LESSON_TERMS = {
    "housekeeping-work-basics": ("职业规范", "服务范围", "岗位边界", "家政工作"),
    "service-confirmation": ("上门确认", "任务确认", "服务协议", "新增工作"),
    "workplace-safety": ("燃气", "火灾", "触电", "高处", "滑倒", "紧急"),
    "cleaner-safety": ("清洁剂", "消毒剂", "混用", "通风", "刺激气味"),
    "home-cleaning-sop": ("全屋", "清洁顺序", "先干后湿", "从上到下"),
    "kitchen-order": ("油污", "厨房", "灶台", "油锅"),
    "bathroom-safety": ("卫生间", "厕所", "马桶", "洗手盆"),
    "home-organize": ("收纳", "整理", "东西太多", "收拾", "丢弃"),
    "laundry-basics": ("洗衣", "衣物", "洗标", "晾晒"),
    "communication-handover": ("验收", "交接", "沟通", "褪色", "异常"),
    "employment-rights": ("合同", "工资", "社保", "证书", "招聘", "防骗"),
    "doorstep-simulation": ("上门流程", "完整流程", "模拟", "实操"),
}


def keyword_lesson(text: str) -> str | None:
    normalized = text.strip().lower()
    return next((lesson_id for lesson_id, terms in LESSON_TERMS.items() if any(term in normalized for term in terms)), None)


def _deterministic_route(text: str) -> RouteResult | None:
    normalized = text.strip().lower().rstrip("。！？!?,，")
    if normalized in ("继续", "接着", "懂了", "听懂了", "下一课"):
        return RouteResult("continue_learning", None, 0.98, "你想接着学习", "rule")
    if any(term in normalized for term in ("学到哪", "学了多少", "学得差不多", "学差不多", "学完了吗", "进度")):
        return RouteResult("learning_progress", None, 0.98, "你想知道自己的学习进度和下一步", "rule")
    if any(term in normalized for term in ("继续学", "下一门", "接着学", "下一步")):
        return RouteResult("continue_learning", None, 0.98, "你想继续学下一门家政课", "rule")
    if any(term in normalized for term in ("上岗", "找工作", "考证", "证书")):
        return RouteResult("career_next_step", None, 0.94, "你想了解从学习到上岗的下一步", "rule")
    lesson_id = keyword_lesson(normalized)
    if lesson_id:
        return RouteResult("course_question", lesson_id, 0.96, "你想问一个家政课程里的问题", "rule")
    if normalized in ("你好", "在吗", "你是谁", "谢谢", "好的"):
        return RouteResult("general_chat", None, 0.95, "你想和阿嬷AI老师说说话", "rule")
    return None


def route_coach_message(text: str, recent_turns: list[str], course_catalog: dict[str, str]) -> RouteResult:
    deterministic = _deterministic_route(text)
    if deterministic:
        return deterministic
    base, key, model = ai_api_base(), ai_api_key(), router_model()
    if base and key and model:
        try:
            with httpx.Client(timeout=float(os.getenv("AI_ROUTER_TIMEOUT_SECONDS", "8"))) as client:
                response = client.post(
                    f"{base}/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": model,
                        "temperature": 0,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": COACH_INTENT_ROUTER.system_template},
                            {"role": "user", "content": json.dumps({"message": text, "recent_turns": recent_turns[-6:], "course_catalog": course_catalog}, ensure_ascii=False)},
                        ],
                    },
                )
                response.raise_for_status()
                parsed = ModelRoute.model_validate_json(response.json()["choices"][0]["message"]["content"])
                lesson_id = parsed.lesson_id if parsed.lesson_id in course_catalog else None
                return RouteResult(parsed.intent, lesson_id, parsed.confidence, parsed.understood_text, "model", ai_provider(), model)
        except (httpx.HTTPError, KeyError, TypeError, ValueError, ValidationError):
            pass
    return RouteResult("out_of_scope", None, 0.4, f"你想了解“{text.strip()}”", "fallback")
