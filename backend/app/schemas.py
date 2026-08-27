from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    domain: str
    risk_level: str
    disclaimer: str
    conclusion: str
    steps: list[dict[str, str]]
    quiz: dict[str, object]
    content_status: str


class StartLessonIn(BaseModel):
    user_id: int


class QuestionIn(BaseModel):
    user_id: int
    text: str = Field(min_length=4, max_length=200)
    idempotency_key: str = Field(min_length=8, max_length=80)

    @field_validator("text")
    @classmethod
    def question_must_have_content(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 4:
            raise ValueError("请再多写一点")
        return normalized


class QuestionOut(BaseModel):
    id: int
    user_id: int
    original_text: str
    understood_text: str
    status: str
    lesson_id: str | None
    risk_level: str
    message: str | None
    next_action: str | None


class ProgressIn(BaseModel):
    current_step: int = Field(ge=0, le=10)


class QuizIn(BaseModel):
    answer: str = Field(min_length=1, max_length=80)


class SessionOut(BaseModel):
    id: int
    user_id: int
    lesson_id: str
    lesson: LessonOut
    status: str
    current_step: int
    quiz_attempts: int
    completed_at: datetime | None


class QuizResult(BaseModel):
    correct: bool
    message: str
    session: SessionOut


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
