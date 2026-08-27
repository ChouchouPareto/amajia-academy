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


class CourseVersionOut(BaseModel):
    id: int
    version: int
    objectives: list[str]
    source_refs: list[dict[str, str]]
    review_status: str
    reviewer: str | None
    reviewed_at: datetime | None


class CourseCardOut(BaseModel):
    id: str
    code: str
    title: str
    summary: str
    estimated_minutes: int
    risk_level: str
    content_status: str
    progress_status: str
    progress_percent: int
    version: CourseVersionOut


class LearningOverviewOut(BaseModel):
    housekeeping_status: str
    pre_assessment_status: str
    completed_core_courses: int
    total_core_courses: int
    recommended_action: str
    recommended_course_id: str | None
    post_assessment_status: str
    report_status: str


class AssessmentStartIn(BaseModel):
    user_id: int
    idempotency_key: str = Field(min_length=8, max_length=80)


class AssessmentQuestionOut(BaseModel):
    id: str
    knowledge_point: str
    prompt: str
    options: list[dict[str, str]]
    is_safety_critical: bool


class AssessmentAttemptOut(BaseModel):
    id: int
    kind: str
    status: str
    assessment_version: str
    answers: dict[str, str]
    questions: list[AssessmentQuestionOut]
    score: int | None


class AssessmentAnswerIn(BaseModel):
    selected_answer: str = Field(min_length=1, max_length=20)


class AssessmentSubmitOut(BaseModel):
    attempt_id: int
    kind: str
    status: str
    score: int
    correct_count: int
    question_count: int
    knowledge_point_results: dict[str, bool]
    is_official: bool


class LearningReportOut(BaseModel):
    report_status: str
    pre_score: int | None = None
    post_score: int | None = None
    improvement_points: int | None = None
    relative_improvement: float | None = None
    mastered_knowledge_points: list[str] = Field(default_factory=list)
    review_knowledge_points: list[str] = Field(default_factory=list)
    completed_core_courses: int = 0
    calculation_version: str = "v1"
    missing: list[str] = Field(default_factory=list)
