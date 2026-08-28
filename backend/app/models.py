from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(32), default="learner", index=True)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    consent_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32), default="learner")
    claimed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PrivacyAuditEvent(Base):
    __tablename__ = "privacy_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event: Mapped[str] = mapped_column(String(40), index=True)
    anonymous_ref: Mapped[str] = mapped_column(String(64), index=True)
    consent_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    domain: Mapped[str] = mapped_column(String(32))
    risk_level: Mapped[str] = mapped_column(String(8))
    disclaimer: Mapped[str] = mapped_column(String(240))
    conclusion: Mapped[str] = mapped_column(String(300))
    steps: Mapped[list[dict[str, str]]] = mapped_column(JSON)
    quiz: Mapped[dict[str, object]] = mapped_column(JSON)
    content_status: Mapped[str] = mapped_column(String(32), default="internal_demo")


class CourseVersion(Base):
    __tablename__ = "course_versions"
    __table_args__ = (UniqueConstraint("course_id", "version", name="uq_course_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    objectives: Mapped[list[str]] = mapped_column(JSON, default=list)
    source_refs: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    review_status: Mapped[str] = mapped_column(String(32), default="pending")
    reviewer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    title: Mapped[str | None] = mapped_column(String(180), nullable=True)
    summary: Mapped[str | None] = mapped_column(String(300), nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(8), nullable=True)
    disclaimer: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    steps: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    quiz: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class KnowledgeIndexChunk(Base):
    __tablename__ = "knowledge_index_chunks"
    __table_args__ = (UniqueConstraint("course_version_id", "chunk_key", name="uq_knowledge_version_chunk"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    course_version_id: Mapped[int] = mapped_column(ForeignKey("course_versions.id"), index=True)
    chunk_key: Mapped[str] = mapped_column(String(80))
    domain: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(180))
    section: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    disclaimer: Mapped[str] = mapped_column(Text, default="")
    source_refs: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    indexed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_version_id: Mapped[int] = mapped_column(ForeignKey("course_versions.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer, index=True)
    media_type: Mapped[str] = mapped_column(String(16), index=True)
    title: Mapped[str] = mapped_column(String(180))
    url: Mapped[str] = mapped_column(String(800))
    thumbnail_url: Mapped[str | None] = mapped_column(String(800), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alt_text: Mapped[str] = mapped_column(String(300))
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    copyright_owner: Mapped[str] = mapped_column(String(180))
    license_scope: Mapped[str] = mapped_column(String(240))
    license_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_status: Mapped[str] = mapped_column(String(24), default="draft", index=True)
    reviewer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ContentReview(Base):
    __tablename__ = "content_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_version_id: Mapped[int] = mapped_column(ForeignKey("course_versions.id"), index=True)
    review_type: Mapped[str] = mapped_column(String(24), index=True)
    reviewer: Mapped[str] = mapped_column(String(120))
    decision: Mapped[str] = mapped_column(String(24))
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ContentAuditEvent(Base):
    __tablename__ = "content_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_version_id: Mapped[int] = mapped_column(ForeignKey("course_versions.id"), index=True)
    action: Mapped[str] = mapped_column(String(40), index=True)
    actor: Mapped[str] = mapped_column(String(120))
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    details: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LearningSession(Base):
    __tablename__ = "learning_sessions"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    course_version_id: Mapped[int | None] = mapped_column(ForeignKey("course_versions.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="learning")
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    quiz_attempts: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CoachConversation(Base):
    __tablename__ = "coach_conversations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120), default="新的陪学对话")
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class QuestionRequest(Base):
    __tablename__ = "question_requests"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_user_question_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey("coach_conversations.id"), nullable=True, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    original_text: Mapped[str] = mapped_column(Text)
    understood_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), index=True)
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id"), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(8), default="L0")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_mode: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    knowledge_refs: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list)
    model_provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "attempt_no", name="uq_user_assessment_attempt"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_user_assessment_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(24), index=True)
    assessment_version: Mapped[str] = mapped_column(String(24), default="v0.4-test-2")
    attempt_no: Mapped[int] = mapped_column(Integer, default=1)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    is_official: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(24), default="in_progress")
    answers: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
