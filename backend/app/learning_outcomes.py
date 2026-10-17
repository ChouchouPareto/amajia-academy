"""Deterministic next steps and human-reviewed teach-back. No model can pass a user."""
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import AuthError, require_content_admin, require_current_user
from .db import get_db
from .models import CourseVersion, LearningSession, Lesson, PracticeAttempt, User
from .seed import COURSE_META
from .coach_skills import validate_tool_request

router = APIRouter(prefix="/api/v1", tags=["learning-outcomes"])
BOUNDARY = "这是线上理解复核，不是实操考核、职业认证或上岗资格。实际操作需由合适的线下教练确认。"
CRITERIA = {"sequence": "能说清操作顺序", "safety": "能说清停止和求助边界", "handover": "能说清检查和交接"}


class SubmitPracticeIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    response_text: str = Field(min_length=20, max_length=1200)
    idempotency_key: str = Field(min_length=8, max_length=80)
    expected_attempt_no: int = Field(ge=0)


class ReviewPracticeIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["reviewed", "needs_revision"]
    feedback: str = Field(min_length=10, max_length=800)
    sequence: bool
    safety: bool
    handover: bool


def latest_attempt(db: Session, session_id: int):
    return db.scalar(select(PracticeAttempt).where(PracticeAttempt.session_id == session_id).order_by(PracticeAttempt.attempt_no.desc()).limit(1))


def owned_session(db: Session, user: User, session_id: int):
    session = db.get(LearningSession, session_id)
    if session is None or session.user_id != user.id:
        raise AuthError(404, "SESSION_NOT_FOUND", "没有找到你的学习记录")
    return session


def attempt_out(item: PracticeAttempt | None):
    if item is None:
        return None
    return {key: getattr(item, key) for key in ("id", "attempt_no", "response_text", "status", "feedback", "criteria", "submitted_at", "reviewed_at")}


def task_out(db: Session, session: LearningSession):
    lesson = db.get(Lesson, session.lesson_id)
    version = db.get(CourseVersion, session.course_version_id) if session.course_version_id else None
    title = (version.title if version else None) or lesson.title
    return {
        "session_id": session.id, "course_id": session.lesson_id,
        "title": title,
        "content_status": version.review_status if version else lesson.content_status,
        "prompt": f"用自己的话说说「{title}」：你会怎样开始？遇到不确定的情况怎么办？最后怎样确认结果？",
        "boundary": BOUNDARY,
        "can_submit": session.status == "completed",
        "criteria_labels": CRITERIA,
        "attempt": attempt_out(latest_attempt(db, session.id)),
    }


@router.get("/learning/sessions/{session_id}/practice")
def get_practice(session_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    return task_out(db, owned_session(db, user, session_id))


@router.post("/learning/sessions/{session_id}/practice")
def submit_practice(session_id: int, payload: SubmitPracticeIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    validate_tool_request("collect_teachback", "submit_teachback")
    session = owned_session(db, user, session_id)
    if session.status != "completed":
        raise AuthError(409, "LESSON_NOT_COMPLETED", "先完成这门课的理解检查，再复述做法")
    existing = db.scalar(select(PracticeAttempt).where(PracticeAttempt.user_id == user.id, PracticeAttempt.idempotency_key == payload.idempotency_key))
    if existing:
        if existing.session_id != session_id or existing.response_text != payload.response_text:
            raise AuthError(409, "IDEMPOTENCY_CONFLICT", "这次提交标识已被使用，请重新提交")
        return task_out(db, session)
    latest = latest_attempt(db, session_id)
    if payload.expected_attempt_no != (latest.attempt_no if latest else 0):
        raise AuthError(409, "PRACTICE_CHANGED", "复核记录已更新，请刷新后再提交")
    if latest and latest.status != "needs_revision":
        raise AuthError(409, "PRACTICE_ALREADY_SUBMITTED", "已提交的复述不需要重复提交，请查看复核状态")
    db.add(PracticeAttempt(user_id=user.id, session_id=session.id, attempt_no=payload.expected_attempt_no + 1,
                           idempotency_key=payload.idempotency_key, response_text=payload.response_text))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AuthError(409, "PRACTICE_CHANGED", "复核记录已更新，请刷新查看，勿重复提交")
    return task_out(db, session)


def build_outcomes(db: Session, user_id: int):
    validate_tool_request("guide_learning_progress", "get_learning_outcomes")
    sessions = list(db.scalars(select(LearningSession).where(LearningSession.user_id == user_id, LearningSession.lesson_id.in_(tuple(COURSE_META))).order_by(LearningSession.updated_at.desc())))
    tasks = [task_out(db, item) for item in sessions if item.status == "completed"]
    revised = next((item for item in tasks if item["attempt"] and item["attempt"]["status"] == "needs_revision"), None)
    unsubmitted = next((item for item in tasks if not item["attempt"]), None)
    current = next((item for item in sessions if item.status != "completed"), None)
    completed_ids = {item.lesson_id for item in sessions if item.status == "completed"}
    next_id = next((course_id for course_id in COURSE_META if course_id not in completed_ids), None)
    if revised:
        action = {"kind": "practice", "course_id": revised["course_id"], "session_id": revised["session_id"], "label": "补充我的做法", "reason": "教练留了建议，我们先把这一步讲清楚。"}
    elif current:
        action = {"kind": "course", "course_id": current.lesson_id, "session_id": current.id, "label": "接着上次学习", "reason": "从上次保存的位置继续。"}
    elif unsubmitted:
        action = {"kind": "practice", "course_id": unsubmitted["course_id"], "session_id": unsubmitted["session_id"], "label": "说说我会怎么做", "reason": "答对之后，再用自己的话讲一遍，不用真的操作。"}
    elif next_id:
        action = {"kind": "course", "course_id": next_id, "session_id": None, "label": "开始下一门课" if completed_ids else "开始第一门课", "reason": "一次学一件事，学习位置自动保存。"}
    else:
        action = {"kind": "handoff", "course_id": None, "session_id": None, "label": "看看下一步", "reason": "线上课程已完成。请完成学后测评，并联系合适的线下教练核验实际操作；平台不承诺安排岗位。"}
    return {"version": "learning-outcomes-v1", "course_completed": len(completed_ids), "total_courses": len(COURSE_META),
            "teachback_reviewed": sum(bool(t["attempt"] and t["attempt"]["status"] == "reviewed") for t in tasks),
            "awaiting_review": sum(bool(t["attempt"] and t["attempt"]["status"] == "submitted") for t in tasks),
            "needs_revision": sum(bool(t["attempt"] and t["attempt"]["status"] == "needs_revision") for t in tasks),
            "practical_verified": False, "boundary": BOUNDARY, "next_action": action, "tasks": tasks}


@router.get("/learning/outcomes")
def get_outcomes(user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    return build_outcomes(db, user.id)


@router.get("/admin/practice")
def practice_queue(offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), _: User = Depends(require_content_admin), db: Session = Depends(get_db)):
    items = list(db.scalars(select(PracticeAttempt).where(PracticeAttempt.status == "submitted").order_by(PracticeAttempt.submitted_at, PracticeAttempt.id).offset(offset).limit(limit)))
    result = []
    for item in items:
        session = db.get(LearningSession, item.session_id)
        version = db.get(CourseVersion, session.course_version_id) if session.course_version_id else None
        lesson = db.get(Lesson, session.lesson_id)
        result.append({**task_out(db, session), "learner_id": item.user_id,
                       "reference_steps": version.steps if version else lesson.steps,
                       "reference_disclaimer": version.disclaimer if version else lesson.disclaimer})
    return result


@router.post("/admin/practice/{attempt_id}/review")
def review_practice(attempt_id: int, payload: ReviewPracticeIn, user: User = Depends(require_content_admin), db: Session = Depends(get_db)):
    item = db.get(PracticeAttempt, attempt_id)
    if item is None:
        raise AuthError(404, "PRACTICE_NOT_FOUND", "这条复述不存在")
    if item.user_id == user.id:
        raise AuthError(403, "SELF_REVIEW_FORBIDDEN", "不能复核自己的学习记录")
    criteria = {key: getattr(payload, key) for key in CRITERIA}
    if payload.decision == "reviewed" and not all(criteria.values()):
        raise AuthError(422, "CRITERIA_REQUIRED", "三项理解标准均确认后才能通过线上复述复核")
    if item.status != "submitted":
        if item.status == payload.decision and item.feedback == payload.feedback and item.criteria == criteria and item.reviewer_id == user.id:
            return task_out(db, db.get(LearningSession, item.session_id))
        raise AuthError(409, "REVIEW_CONFLICT", "这条记录已经被复核，请刷新列表")
    changed = db.execute(update(PracticeAttempt).where(PracticeAttempt.id == item.id, PracticeAttempt.status == "submitted").values(
        status=payload.decision, feedback=payload.feedback, criteria=criteria, reviewer_id=user.id, reviewed_at=datetime.now(timezone.utc)))
    if changed.rowcount != 1:
        db.rollback()
        raise AuthError(409, "REVIEW_CONFLICT", "另一位教练已经复核，请刷新列表")
    db.commit()
    return task_out(db, db.get(LearningSession, item.session_id))


@router.get("/admin/pilot-summary")
def pilot_summary(_: User = Depends(require_content_admin), db: Session = Depends(get_db)):
    learner_ids = select(User.id).where(User.role == "learner", User.status == "active")
    def count(query):
        return db.scalar(query) or 0
    return {
        "learners": count(select(func.count()).select_from(User).where(User.role == "learner", User.status == "active")),
        "started_learners": count(select(func.count(func.distinct(LearningSession.user_id))).where(LearningSession.user_id.in_(learner_ids))),
        "completed_lessons": count(select(func.count()).select_from(LearningSession).where(LearningSession.status == "completed", LearningSession.user_id.in_(learner_ids))),
        "submitted_teachbacks": count(select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.user_id.in_(learner_ids))),
        "awaiting_review": count(select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.status == "submitted", PracticeAttempt.user_id.in_(learner_ids))),
        "reviewed_teachbacks": count(select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.status == "reviewed", PracticeAttempt.user_id.in_(learner_ids))),
        "published_courses": count(select(func.count(func.distinct(CourseVersion.course_id))).where(CourseVersion.review_status == "published", CourseVersion.course_id.in_(tuple(COURSE_META)))),
        "total_courses": len(COURSE_META), "boundary": BOUNDARY,
        "measurement_note": "当前数据库累计数据，含测试账号，不等于真实用户留存或就业效果。重交复述按次计，课程按用户与课程计。",
    }
