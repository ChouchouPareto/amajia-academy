from __future__ import annotations

import hmac
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import ContentAuditEvent, ContentReview, CourseVersion, Lesson
from .schemas import (
    AdminActionIn,
    AdminCourseVersionCreateIn,
    AdminCourseVersionOut,
    AdminCourseVersionUpdateIn,
    AdminReviewDecisionIn,
    ContentReviewOut,
)
from .seed import COURSE_META

router = APIRouter(prefix="/api/v1/admin", tags=["content-admin"])


class AdminContentError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("ADMIN_API_KEY")
    if not expected and os.getenv("APP_ENV", "development") != "production":
        expected = "amajia-local-admin"
    if not expected:
        raise AdminContentError(503, "ADMIN_AUTH_NOT_CONFIGURED", "管理员认证尚未配置")
    if not x_admin_key or not hmac.compare_digest(x_admin_key, expected):
        raise AdminContentError(401, "ADMIN_UNAUTHORIZED", "管理员密钥不正确")


def reviews_for(db: Session, version_id: int) -> list[ContentReview]:
    return list(db.scalars(select(ContentReview).where(ContentReview.course_version_id == version_id).order_by(ContentReview.created_at)))


def serialize_version(db: Session, version: CourseVersion) -> AdminCourseVersionOut:
    lesson = db.get(Lesson, version.course_id)
    if lesson is None:
        raise AdminContentError(404, "COURSE_NOT_FOUND", "课程不存在")
    meta = COURSE_META.get(version.course_id, {})
    return AdminCourseVersionOut(
        id=version.id,
        course_id=version.course_id,
        code=str(meta.get("code", version.course_id)),
        version=version.version,
        title=version.title or lesson.title,
        summary=version.summary or str(meta.get("summary", "")),
        risk_level=version.risk_level or lesson.risk_level,
        disclaimer=version.disclaimer or lesson.disclaimer,
        conclusion=version.conclusion or lesson.conclusion,
        objectives=version.objectives or [lesson.conclusion],
        source_refs=version.source_refs or [],
        steps=version.steps or lesson.steps,
        quiz=version.quiz or lesson.quiz,
        review_status=version.review_status,
        reviewer=version.reviewer,
        reviewed_at=version.reviewed_at,
        published_at=version.published_at,
        suspended_at=version.suspended_at,
        reviews=[ContentReviewOut.model_validate(item) for item in reviews_for(db, version.id)],
    )


def get_version(db: Session, version_id: int) -> CourseVersion:
    version = db.get(CourseVersion, version_id)
    if version is None:
        raise AdminContentError(404, "COURSE_VERSION_NOT_FOUND", "课程版本不存在")
    return version


def repeated_action(db: Session, key: str) -> CourseVersion | None:
    event = db.scalar(select(ContentAuditEvent).where(ContentAuditEvent.idempotency_key == key))
    return db.get(CourseVersion, event.course_version_id) if event else None


def add_audit(db: Session, version: CourseVersion, action: str, actor: str, key: str, details: dict[str, object] | None = None) -> None:
    db.add(ContentAuditEvent(course_version_id=version.id, action=action, actor=actor, idempotency_key=key, details=details or {}))


def apply_snapshot(lesson: Lesson, version: CourseVersion) -> None:
    if not all((version.title, version.summary, version.risk_level, version.disclaimer, version.conclusion, version.steps, version.quiz)):
        raise AdminContentError(409, "COURSE_VERSION_INCOMPLETE", "课程版本内容不完整，不能发布")
    lesson.title = version.title
    lesson.risk_level = version.risk_level
    lesson.disclaimer = version.disclaimer
    lesson.conclusion = version.conclusion
    lesson.steps = version.steps
    lesson.quiz = version.quiz
    lesson.content_status = "published"


@router.get("/course-versions", response_model=list[AdminCourseVersionOut], dependencies=[Depends(require_admin)])
def list_versions(course_id: str | None = None, db: Session = Depends(get_db)):
    statement = select(CourseVersion).order_by(CourseVersion.course_id, CourseVersion.version.desc())
    if course_id:
        statement = statement.where(CourseVersion.course_id == course_id)
    return [serialize_version(db, item) for item in db.scalars(statement)]


@router.post("/courses/{course_id}/versions", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def create_version(course_id: str, payload: AdminCourseVersionCreateIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    lesson = db.get(Lesson, course_id)
    if lesson is None or lesson.domain != "housekeeping":
        raise AdminContentError(404, "COURSE_NOT_FOUND", "家政课程不存在")
    latest = db.scalar(select(CourseVersion).where(CourseVersion.course_id == course_id).order_by(CourseVersion.version.desc()))
    version = CourseVersion(
        course_id=course_id,
        version=(latest.version + 1) if latest else 1,
        objectives=payload.objectives,
        source_refs=[item.model_dump() for item in payload.source_refs],
        review_status="draft",
        title=payload.title,
        summary=payload.summary,
        risk_level=payload.risk_level,
        disclaimer=payload.disclaimer,
        conclusion=payload.conclusion,
        steps=payload.steps,
        quiz=payload.quiz,
        created_by=payload.actor,
    )
    db.add(version)
    db.flush()
    add_audit(db, version, "create_version", payload.actor, payload.idempotency_key)
    db.commit()
    db.refresh(version)
    return serialize_version(db, version)


@router.put("/course-versions/{version_id}", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def update_version(version_id: int, payload: AdminCourseVersionUpdateIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    if version.review_status not in ("draft", "rejected"):
        raise AdminContentError(409, "COURSE_VERSION_LOCKED", "只有草稿或已退回版本可以修改")
    for field in ("objectives", "title", "summary", "risk_level", "disclaimer", "conclusion", "steps", "quiz"):
        setattr(version, field, getattr(payload, field))
    version.source_refs = [item.model_dump() for item in payload.source_refs]
    version.review_status = "draft"
    add_audit(db, version, "update_version", payload.actor, payload.idempotency_key)
    db.commit()
    db.refresh(version)
    return serialize_version(db, version)


@router.post("/course-versions/{version_id}/submit-review", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def submit_review(version_id: int, payload: AdminActionIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    if version.review_status not in ("draft", "rejected"):
        raise AdminContentError(409, "INVALID_REVIEW_TRANSITION", "当前状态不能提交审核")
    if not version.source_refs:
        raise AdminContentError(409, "SOURCE_REQUIRED", "至少补充一条可核验内容来源")
    version.review_status = "in_review"
    add_audit(db, version, "submit_review", payload.actor, payload.idempotency_key, {"comment": payload.comment})
    db.commit()
    return serialize_version(db, version)


@router.post("/course-versions/{version_id}/approve", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def approve_version(version_id: int, payload: AdminReviewDecisionIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    if version.review_status != "in_review":
        raise AdminContentError(409, "INVALID_REVIEW_TRANSITION", "只有审核中的版本可以记录审核决定")
    review = ContentReview(course_version_id=version.id, review_type=payload.review_type, reviewer=payload.reviewer, decision=payload.decision, comment=payload.comment)
    db.add(review)
    db.flush()
    if payload.decision == "rejected":
        version.review_status = "rejected"
        version.reviewer = payload.reviewer
        version.reviewed_at = datetime.now(timezone.utc)
    else:
        approvals = {item.review_type for item in reviews_for(db, version.id) if item.decision == "approved"}
        required = {"professional"}
        if version.risk_level in ("L2", "L3"):
            required.add("safety")
        if required.issubset(approvals):
            version.review_status = "approved"
            version.reviewer = payload.reviewer
            version.reviewed_at = datetime.now(timezone.utc)
    add_audit(db, version, "review_decision", payload.actor, payload.idempotency_key, {"review_type": payload.review_type, "decision": payload.decision})
    db.commit()
    return serialize_version(db, version)


@router.post("/course-versions/{version_id}/publish", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def publish_version(version_id: int, payload: AdminActionIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    if version.review_status != "approved":
        raise AdminContentError(409, "VERSION_NOT_APPROVED", "只有审核通过的版本可以发布")
    lesson = db.get(Lesson, version.course_id)
    if lesson is None:
        raise AdminContentError(404, "COURSE_NOT_FOUND", "课程不存在")
    for other in db.scalars(select(CourseVersion).where(CourseVersion.course_id == version.course_id, CourseVersion.review_status == "published")):
        other.review_status = "approved"
    apply_snapshot(lesson, version)
    version.review_status = "published"
    version.published_at = datetime.now(timezone.utc)
    version.suspended_at = None
    add_audit(db, version, "publish", payload.actor, payload.idempotency_key, {"comment": payload.comment})
    db.commit()
    return serialize_version(db, version)


@router.post("/course-versions/{version_id}/suspend", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def suspend_version(version_id: int, payload: AdminActionIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    if version.review_status != "published":
        raise AdminContentError(409, "VERSION_NOT_PUBLISHED", "只有已发布版本可以下架")
    lesson = db.get(Lesson, version.course_id)
    if lesson:
        lesson.content_status = "suspended"
    version.review_status = "suspended"
    version.suspended_at = datetime.now(timezone.utc)
    add_audit(db, version, "suspend", payload.actor, payload.idempotency_key, {"comment": payload.comment})
    db.commit()
    return serialize_version(db, version)


@router.post("/course-versions/{version_id}/rollback", response_model=AdminCourseVersionOut, dependencies=[Depends(require_admin)])
def rollback_version(version_id: int, payload: AdminActionIn, db: Session = Depends(get_db)):
    existing = repeated_action(db, payload.idempotency_key)
    if existing:
        return serialize_version(db, existing)
    version = get_version(db, version_id)
    approvals = {item.review_type for item in reviews_for(db, version.id) if item.decision == "approved"}
    required = {"professional"}
    if version.risk_level in ("L2", "L3"):
        required.add("safety")
    if not required.issubset(approvals):
        raise AdminContentError(409, "ROLLBACK_REVIEW_REQUIRED", "只能回滚到已经完成必要审核的版本")
    lesson = db.get(Lesson, version.course_id)
    if lesson is None:
        raise AdminContentError(404, "COURSE_NOT_FOUND", "课程不存在")
    for other in db.scalars(select(CourseVersion).where(CourseVersion.course_id == version.course_id, CourseVersion.review_status == "published")):
        other.review_status = "approved"
    apply_snapshot(lesson, version)
    version.review_status = "published"
    version.published_at = datetime.now(timezone.utc)
    version.suspended_at = None
    add_audit(db, version, "rollback", payload.actor, payload.idempotency_key, {"comment": payload.comment})
    db.commit()
    return serialize_version(db, version)
