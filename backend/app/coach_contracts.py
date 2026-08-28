"""Stable contracts reserved for the v0.5 parent/child coach architecture.

The current runtime remains a single controlled agent. These contracts keep
future specialist results behind the parent agent boundary: child agents may
recommend, but only the parent may produce user-visible output or request a
learning-state mutation.
"""

from typing import Literal

from pydantic import BaseModel, Field


SpecialistRole = Literal["teaching_planner", "knowledge_retriever", "media_selector", "learning_evaluator", "safety_reviewer"]
UiBlockType = Literal["teacher_text", "image_card", "video_card", "choice_check", "action_prompt", "boundary_notice"]


class SourceRef(BaseModel):
    course_version_id: int | None = None
    knowledge_point_id: str | None = None
    asset_id: str | None = None
    asset_version: int | None = None


class UiBlock(BaseModel):
    type: UiBlockType
    text: str | None = Field(default=None, max_length=900)
    asset_id: str | None = None
    asset_version: int | None = None


class ChildAgentResult(BaseModel):
    role: SpecialistRole
    recommendation: str = Field(min_length=1, max_length=1200)
    confidence: float = Field(ge=0, le=1)
    source_refs: list[SourceRef] = Field(default_factory=list)
    requested_action: str | None = None


class CoachAgentOutput(BaseModel):
    reply_text: str = Field(min_length=1, max_length=900)
    speech_text: str | None = Field(default=None, max_length=900)
    ui_blocks: list[UiBlock] = Field(default_factory=list)
    source_refs: list[SourceRef] = Field(default_factory=list)
    next_action: str | None = None
    safety_level: Literal["normal", "caution", "blocked"] = "normal"
    agent_trace_id: str

