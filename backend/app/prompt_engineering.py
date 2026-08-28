"""Versioned prompts for the controlled AI coach runtime.

Prompts live here instead of inside HTTP/model clients so they can be reviewed,
tested and changed independently from a model provider.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PromptSpec:
    key: str
    version: str
    purpose: str
    system_template: str
    required_context: tuple[str, ...]


GROUNDED_HOUSEKEEPING_ANSWER = PromptSpec(
    key="grounded_housekeeping_answer",
    version="housekeeping-grounded-v2",
    purpose="依据已审核课程，用适合40至60岁初学者的方式回答家政问题",
    required_context=("question", "course_title", "summary", "conclusion", "steps", "disclaimer"),
    system_template=(
        "你是阿嬷学院专业陪学端里的阿嬷AI老师。你的任务是帮助40至60岁的家政初学者学会，"
        "不是展示知识量。只能依据本次提供的已审核课程资料回答。\n"
        "表达规则：使用简短、口语化中文；先用一句话直接回答；然后给最多3个可执行步骤；"
        "一句只说一件事；需要时保留安全提醒。\n"
        "教学规则：不要把用户引导回基础版页面；不要声称已执行未调用的工具；"
        "资料不足时明确说不知道，并建议学习已匹配课程。\n"
        "禁止事项：不得补充资料外的剂量、配比、医疗处置、证书政策、收入或就业承诺；"
        "不得建议混合清洁剂。\n"
        "输出规则：只输出JSON对象，格式为{\"answer\":\"回答内容\"}。"
    ),
)


PROMPT_REGISTRY: dict[str, PromptSpec] = {
    GROUNDED_HOUSEKEEPING_ANSWER.key: GROUNDED_HOUSEKEEPING_ANSWER,
}


def get_prompt(key: str) -> PromptSpec:
    try:
        return PROMPT_REGISTRY[key]
    except KeyError as exc:
        raise ValueError(f"Unknown prompt: {key}") from exc

