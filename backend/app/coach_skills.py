"""Declarative Skill registry for the AI professional learning port.

A Skill is a reviewed teaching workflow, not an unrestricted model plugin.
Only backend tools listed on a Skill may be requested by the orchestrator.
"""

from dataclasses import dataclass
from typing import Literal


SkillOutput = Literal["teacher_text", "lesson_flow", "choice_check", "review_plan"]


@dataclass(frozen=True)
class CoachSkill:
    key: str
    version: str
    title: str
    purpose: str
    trigger_examples: tuple[str, ...]
    allowed_tools: tuple[str, ...]
    output: SkillOutput
    may_write_progress: bool = False


SKILLS: dict[str, CoachSkill] = {
    "answer_housekeeping_question": CoachSkill(
        key="answer_housekeeping_question",
        version="1.0.0",
        title="回答家政问题",
        purpose="从已发布课程中检索依据并给出简短回答",
        trigger_examples=("厨房油污怎么处理", "洗衣前检查什么"),
        allowed_tools=("retrieve_knowledge",),
        output="teacher_text",
    ),
    "teach_course_in_chat": CoachSkill(
        key="teach_course_in_chat",
        version="1.0.0",
        title="在对话中教一门课",
        purpose="读取学习状态，在专业版对话内逐步讲解并保存确认后的进度",
        trigger_examples=("开始学习", "继续上次的课"),
        allowed_tools=("get_learning_state", "retrieve_knowledge", "retrieve_media", "save_learning_progress"),
        output="lesson_flow",
        may_write_progress=True,
    ),
    "check_understanding": CoachSkill(
        key="check_understanding",
        version="1.0.0",
        title="检查是否学会",
        purpose="使用课程自带检查题验证理解并记录结果",
        trigger_examples=("我学会了吗", "出一道题考考我"),
        allowed_tools=("get_learning_state", "submit_learning_check"),
        output="choice_check",
        may_write_progress=True,
    ),
    "review_mistakes": CoachSkill(
        key="review_mistakes",
        version="1.0.0",
        title="根据错题补讲",
        purpose="读取错题和掌握情况，安排有依据的复习",
        trigger_examples=("复习错题", "哪里还没学会"),
        allowed_tools=("get_learning_state", "retrieve_knowledge", "retrieve_media", "schedule_review"),
        output="review_plan",
        may_write_progress=True,
    ),
}


def get_skill(key: str) -> CoachSkill:
    try:
        return SKILLS[key]
    except KeyError as exc:
        raise ValueError(f"Unknown coach skill: {key}") from exc


def validate_tool_request(skill_key: str, tool_name: str) -> None:
    skill = get_skill(skill_key)
    if tool_name not in skill.allowed_tools:
        raise ValueError(f"Tool {tool_name} is not allowed for skill {skill_key}")

