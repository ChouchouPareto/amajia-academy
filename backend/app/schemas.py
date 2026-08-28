from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: str
    status: str
    consent_version: str | None
    consented_at: datetime | None


class InviteLoginIn(BaseModel):
    invitation_code: str = Field(min_length=8, max_length=80)
    display_name: str = Field(min_length=2, max_length=30)
    consent_accepted: bool
    consent_version: str = Field(min_length=4, max_length=40)

    @field_validator("invitation_code", "display_name")
    @classmethod
    def strip_auth_fields(cls, value: str) -> str:
        return value.strip()


class DeleteAccountIn(BaseModel):
    confirmation: str


class DeleteAccountOut(BaseModel):
    deleted: bool
    receipt: str


class InvitationCreateIn(BaseModel):
    label: str = Field(min_length=2, max_length=120)
    expires_days: int = Field(default=14, ge=1, le=30)


class InvitationAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    role: str
    active: bool
    claimed_by_user_id: int | None
    expires_at: datetime | None
    claimed_at: datetime | None
    created_at: datetime


class InvitationIssuedOut(InvitationAdminOut):
    invitation_code: str


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
    answer: str | None
    answer_mode: str | None
    knowledge_refs: list[dict[str, object]] = Field(default_factory=list)
    model_provider: str | None
    model_name: str | None
    prompt_version: str | None
    latency_ms: int | None


class AiCapabilityOut(BaseModel):
    mode: str
    model_configured: bool
    published_knowledge_count: int
    label: str
    message: str


class ProgressIn(BaseModel):
    current_step: int = Field(ge=0, le=10)


class QuizIn(BaseModel):
    answer: str = Field(min_length=1, max_length=80)


class SessionOut(BaseModel):
    id: int
    user_id: int
    lesson_id: str
    course_version_id: int | None
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


class SourceRefIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    url: str = Field(min_length=8, max_length=500)


class AdminCourseVersionUpdateIn(BaseModel):
    objectives: list[str] = Field(min_length=1, max_length=12)
    source_refs: list[SourceRefIn] = Field(min_length=1, max_length=20)
    title: str = Field(min_length=2, max_length=180)
    summary: str = Field(min_length=4, max_length=300)
    risk_level: str = Field(pattern=r"^L[0-3]$")
    disclaimer: str = Field(min_length=8, max_length=500)
    conclusion: str = Field(min_length=8, max_length=500)
    steps: list[dict[str, str]] = Field(min_length=1, max_length=10)
    quiz: dict[str, object]
    actor: str = Field(min_length=2, max_length=120)
    idempotency_key: str = Field(min_length=8, max_length=80)


class AdminCourseVersionCreateIn(AdminCourseVersionUpdateIn):
    pass


class AdminActionIn(BaseModel):
    actor: str = Field(min_length=2, max_length=120)
    comment: str = Field(default="", max_length=1000)
    idempotency_key: str = Field(min_length=8, max_length=80)


class AdminReviewDecisionIn(AdminActionIn):
    review_type: str = Field(pattern=r"^(professional|safety|editorial)$")
    reviewer: str = Field(min_length=2, max_length=120)
    decision: str = Field(pattern=r"^(approved|rejected)$")


class ContentReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_type: str
    reviewer: str
    decision: str
    comment: str
    created_at: datetime


class AdminCourseVersionOut(BaseModel):
    id: int
    course_id: str
    code: str
    version: int
    title: str
    summary: str
    risk_level: str
    disclaimer: str
    conclusion: str
    objectives: list[str]
    source_refs: list[dict[str, str]]
    steps: list[dict[str, str]]
    quiz: dict[str, object]
    review_status: str
    reviewer: str | None
    reviewed_at: datetime | None
    published_at: datetime | None
    suspended_at: datetime | None
    reviews: list[ContentReviewOut]


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
