"""Deterministic parent-agent planning for the first production slice.

Model output does not choose permissions. The parent orchestrator selects a
reviewed Skill and Tool allowlist before any model request is made.
"""

import uuid
from typing import Literal

from pydantic import BaseModel

from .coach_skills import get_skill, validate_tool_request
from .coach_tools import get_tool
from .models import QuestionRequest
from .prompt_engineering import GROUNDED_HOUSEKEEPING_ANSWER


class ToolCallPlan(BaseModel):
    name: str
    version: str
    access: Literal["read", "write"]
    requires_confirmation: bool


class CoachPlan(BaseModel):
    trace_id: str
    skill_key: str
    skill_version: str
    prompt_key: str | None
    prompt_version: str | None
    tool_calls: list[ToolCallPlan]
    may_write_progress: bool


def plan_question_answer(question: QuestionRequest) -> CoachPlan:
    if question.risk_level == "L3" or question.status == "blocked":
        raise ValueError("Blocked questions must not enter the teaching orchestrator")
    if question.lesson_id is None:
        raise ValueError("A matched lesson is required before knowledge retrieval")

    skill = get_skill("answer_housekeeping_question")
    tool_name = "retrieve_knowledge"
    validate_tool_request(skill.key, tool_name)
    tool = get_tool(tool_name)
    if tool.access == "write" or skill.may_write_progress:
        raise ValueError("Question answering must remain read-only")

    return CoachPlan(
        trace_id=str(uuid.uuid4()),
        skill_key=skill.key,
        skill_version=skill.version,
        prompt_key=GROUNDED_HOUSEKEEPING_ANSWER.key,
        prompt_version=GROUNDED_HOUSEKEEPING_ANSWER.version,
        tool_calls=[ToolCallPlan(name=tool.name, version=tool.version, access=tool.access, requires_confirmation=tool.requires_confirmation)],
        may_write_progress=False,
    )

