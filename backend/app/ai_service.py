from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass

import httpx
from pydantic import BaseModel, Field, ValidationError

from .models import CourseVersion, QuestionRequest
from .prompt_engineering import GROUNDED_HOUSEKEEPING_ANSWER


PROMPT_VERSION = GROUNDED_HOUSEKEEPING_ANSWER.version


class ModelAnswer(BaseModel):
    answer: str = Field(min_length=8, max_length=900)


@dataclass(frozen=True)
class AnswerResult:
    answer: str
    mode: str
    refs: list[dict[str, object]]
    provider: str | None
    model: str | None
    prompt_version: str
    latency_ms: int


def model_configured() -> bool:
    return bool(os.getenv("AI_API_BASE") and os.getenv("AI_API_KEY") and os.getenv("AI_MODEL"))


def knowledge_refs(version: CourseVersion) -> list[dict[str, object]]:
    refs: list[dict[str, object]] = [
        {
            "type": "course",
            "course_id": version.course_id,
            "course_version_id": version.id,
            "title": version.title or version.course_id,
            "version": version.version,
        }
    ]
    refs.extend({"type": "source", **ref} for ref in (version.source_refs or []))
    return refs


def fallback_answer(version: CourseVersion) -> str:
    steps = version.steps or []
    step_text = "；".join(f"{index + 1}. {item.get('title', '')}：{item.get('body', '')}" for index, item in enumerate(steps[:3]))
    return f"先记住：{version.conclusion or version.summary} 具体可以这样做：{step_text} 安全提醒：{version.disclaimer}"


def answer_from_published_knowledge(question: QuestionRequest, version: CourseVersion) -> AnswerResult:
    started = time.perf_counter()
    refs = knowledge_refs(version)
    if not model_configured():
        return AnswerResult(
            answer=fallback_answer(version),
            mode="knowledge_fallback",
            refs=refs,
            provider=None,
            model=None,
            prompt_version=PROMPT_VERSION,
            latency_ms=round((time.perf_counter() - started) * 1000),
        )

    api_base = os.environ["AI_API_BASE"].rstrip("/")
    api_key = os.environ["AI_API_KEY"]
    model = os.environ["AI_MODEL"]
    provider = os.getenv("AI_PROVIDER", "openai-compatible")
    context = {
        "title": version.title,
        "summary": version.summary,
        "conclusion": version.conclusion,
        "steps": version.steps,
        "disclaimer": version.disclaimer,
    }
    system = GROUNDED_HOUSEKEEPING_ANSWER.system_template
    try:
        with httpx.Client(timeout=float(os.getenv("AI_TIMEOUT_SECONDS", "12"))) as client:
            response = client.post(
                f"{api_base}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": f"用户问题：{question.original_text}\n已审核课程资料：{json.dumps(context, ensure_ascii=False)}"},
                    ],
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            parsed = ModelAnswer.model_validate_json(content)
            if any(term in parsed.answer for term in ("保证就业", "保证考证", "自行混合清洁剂")):
                raise ValueError("unsafe model claim")
            return AnswerResult(
                answer=parsed.answer,
                mode="model",
                refs=refs,
                provider=provider,
                model=model,
                prompt_version=PROMPT_VERSION,
                latency_ms=round((time.perf_counter() - started) * 1000),
            )
    except (httpx.HTTPError, KeyError, TypeError, ValueError, ValidationError):
        return AnswerResult(
            answer=fallback_answer(version),
            mode="knowledge_fallback",
            refs=refs,
            provider=provider,
            model=model,
            prompt_version=PROMPT_VERSION,
            latency_ms=round((time.perf_counter() - started) * 1000),
        )
