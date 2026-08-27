from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
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


class LearningSession(Base):
    __tablename__ = "learning_sessions"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="learning")
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    quiz_attempts: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class QuestionRequest(Base):
    __tablename__ = "question_requests"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_user_question_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    original_text: Mapped[str] = mapped_column(Text)
    understood_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), index=True)
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id"), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(8), default="L0")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
