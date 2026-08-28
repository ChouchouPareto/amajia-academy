from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .admin_content import AdminContentError, router as admin_content_router
from .ai_service import answer_from_published_knowledge, model_configured
from .auth import AuthError, require_current_user, router as auth_router, seed_development_invitations
from .db import engine, ensure_schema, get_db
from .assessments import ASSESSMENT_VERSION, public_questions, questions_for, score_answers
from .models import AssessmentAttempt, CourseVersion, LearningSession, Lesson, QuestionRequest, User
from .schemas import (
    AssessmentAnswerIn,
    AssessmentAttemptOut,
    AssessmentStartIn,
    AssessmentSubmitOut,
    AiCapabilityOut,
    CourseCardOut,
    CourseVersionOut,
    LessonOut,
    LearningOverviewOut,
    LearningReportOut,
    ProgressIn,
    QuestionIn,
    QuestionOut,
    QuizIn,
    QuizResult,
    SessionOut,
    StartLessonIn,
)
from .seed import COURSE_META, seed_lessons


def error_response(status: int, code: str, message: str, retryable: bool = False):
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "request_id": str(uuid.uuid4()),
            }
        },
    )


def serialize_session(db: Session, session: LearningSession) -> SessionOut:
    lesson = db.get(Lesson, session.lesson_id)
    if lesson is None:
        raise RuntimeError("Session references a missing lesson")
    version = db.get(CourseVersion, session.course_version_id) if session.course_version_id else None
    lesson_out = LessonOut.model_validate(lesson)
    if version and all((version.title, version.risk_level, version.disclaimer, version.conclusion, version.steps, version.quiz)):
        lesson_out = LessonOut(
            id=lesson.id,
            title=version.title,
            domain=lesson.domain,
            risk_level=version.risk_level,
            disclaimer=version.disclaimer,
            conclusion=version.conclusion,
            steps=version.steps,
            quiz=version.quiz,
            content_status=version.review_status,
        )
    return SessionOut(
        id=session.id,
        user_id=session.user_id,
        lesson_id=session.lesson_id,
        course_version_id=session.course_version_id,
        lesson=lesson_out,
        status=session.status,
        current_step=session.current_step,
        quiz_attempts=session.quiz_attempts,
        completed_at=session.completed_at,
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    os.makedirs("data", exist_ok=True)
    ensure_schema()
    with Session(engine) as db:
        seed_lessons(db)
        seed_development_invitations(db)
    yield


app = FastAPI(title="阿嬷学院 API", version="0.4.0", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(admin_content_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
        "http://localhost:3740",
        "http://127.0.0.1:3740",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "phase": 3, "version": "0.4.0", "mode": "internal_test"}


@app.get("/api/v1/lessons", response_model=list[LessonOut])
def list_lessons(_: User = Depends(require_current_user), db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(Lesson).where(
                Lesson.content_status.in_(("internal_test_candidate", "published"))
            )
        )
    )


def serialize_question(question: QuestionRequest) -> QuestionOut:
    return QuestionOut(
        id=question.id,
        user_id=question.user_id,
        original_text=question.original_text,
        understood_text=question.understood_text,
        status=question.status,
        lesson_id=question.lesson_id,
        risk_level=question.risk_level,
        message=question.message,
        next_action=question.next_action,
        answer=question.answer,
        answer_mode=question.answer_mode,
        knowledge_refs=question.knowledge_refs or [],
        model_provider=question.model_provider,
        model_name=question.model_name,
        prompt_version=question.prompt_version,
        latency_ms=question.latency_ms,
    )


def resolve_lesson_id(text: str) -> str | None:
    normalized = text.strip().lower()
    if any(term in normalized for term in ("职业规范", "服务范围", "家政工作")):
        return "housekeeping-work-basics"
    if any(term in normalized for term in ("清洁剂", "混用", "通风")):
        return "cleaner-safety"
    if any(term in normalized for term in ("油", "厨房")):
        return "kitchen-order"
    if any(term in normalized for term in ("卫生间", "厕所", "马桶")):
        return "bathroom-safety"
    if any(term in normalized for term in ("收纳", "整理", "东西太多", "收拾")):
        return "home-organize"
    if any(term in normalized for term in ("洗衣", "衣物", "洗标")):
        return "laundry-basics"
    return None


def ensure_owner(user: User, user_id: int) -> None:
    if user.id != user_id:
        raise AuthError(403, "RESOURCE_FORBIDDEN", "不能查看或修改其他测试用户的数据")


def active_course_version(db: Session, course_id: str) -> CourseVersion | None:
    published = db.scalar(select(CourseVersion).where(CourseVersion.course_id == course_id, CourseVersion.review_status == "published").order_by(CourseVersion.version.desc()))
    if published is not None:
        return published
    # The seeded v1 candidate remains available during the current internal-test
    # transition. New draft versions must never replace it before publication.
    return db.scalar(
        select(CourseVersion)
        .where(CourseVersion.course_id == course_id)
        .order_by(CourseVersion.version.asc())
    )


def published_course_version(db: Session, course_id: str) -> CourseVersion | None:
    return db.scalar(
        select(CourseVersion)
        .where(CourseVersion.course_id == course_id, CourseVersion.review_status == "published")
        .order_by(CourseVersion.version.desc())
    )


@app.get("/api/v1/ai/capability", response_model=AiCapabilityOut)
def ai_capability(_: User = Depends(require_current_user), db: Session = Depends(get_db)):
    published_count = len(list(db.scalars(select(CourseVersion).where(CourseVersion.review_status == "published"))))
    configured = model_configured()
    if published_count == 0:
        return AiCapabilityOut(
            mode="review_required",
            model_configured=configured,
            published_knowledge_count=0,
            label="受控准备中",
            message="课程仍待专业审核。AI 暂不自由生成，只帮助识别问题并推荐学习内容。",
        )
    if configured:
        return AiCapabilityOut(
            mode="model_ready",
            model_configured=True,
            published_knowledge_count=published_count,
            label="AI 回答已启用",
            message="只根据已审核家政课程回答，并展示课程来源。",
        )
    return AiCapabilityOut(
        mode="knowledge_only",
        model_configured=False,
        published_knowledge_count=published_count,
        label="课程知识模式",
        message="模型暂未启用，将直接整理已审核课程内容，不冒充 AI 生成。",
    )


@app.post("/api/v1/questions", response_model=QuestionOut)
def create_question(payload: QuestionIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, payload.user_id)
    if db.get(User, payload.user_id) is None:
        return error_response(404, "USER_NOT_FOUND", "没有找到测试用户")
    existing = db.scalar(
        select(QuestionRequest).where(
            QuestionRequest.user_id == payload.user_id,
            QuestionRequest.idempotency_key == payload.idempotency_key,
        )
    )
    if existing is not None:
        return serialize_question(existing)

    normalized = payload.text.strip()
    high_risk_terms = ("误食", "喝了清洁剂", "呼吸困难", "急救", "吃什么药", "用药", "昏迷", "大量出血")
    if any(term in normalized for term in high_risk_terms):
        question = QuestionRequest(
            user_id=payload.user_id,
            idempotency_key=payload.idempotency_key,
            original_text=normalized,
            understood_text=f"你想了解：“{normalized}”，对吗？",
            status="blocked",
            risk_level="L3",
            message="这个问题可能涉及紧急健康或用药风险，普通学习步骤不适合处理。",
            next_action="如有人正在明显不适或处于危险中，请立即联系当地急救服务或合适的专业人员。",
        )
    else:
        lesson_id = resolve_lesson_id(normalized)
        if lesson_id is None:
            question = QuestionRequest(
                user_id=payload.user_id,
                idempotency_key=payload.idempotency_key,
                original_text=normalized,
                understood_text=f"你想了解：“{normalized}”，对吗？",
                status="no_match",
                risk_level="L0",
                message="阿嬷学院当前只开放家政入门候选内容，所以这次先不随便回答。你可以回到家政学习路径选择课程。",
            )
        else:
            lesson = db.get(Lesson, lesson_id)
            question = QuestionRequest(
                user_id=payload.user_id,
                idempotency_key=payload.idempotency_key,
                original_text=normalized,
                understood_text=f"你想学习“{lesson.title if lesson else normalized}”，对吗？",
                status="waiting_confirmation",
                lesson_id=lesson_id,
                risk_level="L0",
            )
    db.add(question)
    db.commit()
    db.refresh(question)
    return serialize_question(question)


@app.get("/api/v1/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    question = db.get(QuestionRequest, question_id)
    if question is None:
        return error_response(404, "QUESTION_NOT_FOUND", "没有找到这次问题")
    ensure_owner(user, question.user_id)
    return serialize_question(question)


@app.post("/api/v1/questions/{question_id}/answer", response_model=QuestionOut)
def answer_question(question_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    question = db.get(QuestionRequest, question_id)
    if question is None:
        return error_response(404, "QUESTION_NOT_FOUND", "没有找到这次问题")
    ensure_owner(user, question.user_id)
    if question.status in ("blocked", "no_match") or question.lesson_id is None:
        return serialize_question(question)
    if question.answer_mode is not None:
        return serialize_question(question)

    version = published_course_version(db, question.lesson_id)
    if version is None:
        question.status = "knowledge_unavailable"
        question.answer_mode = "unavailable"
        question.message = "匹配到相关家政课程，但课程还没有完成专业审核，所以 AI 暂不生成答案。"
        question.next_action = "你可以先体验候选课程；正式发布前，回答不会作为专业结论。"
        question.knowledge_refs = []
    else:
        result = answer_from_published_knowledge(question, version)
        question.status = "answered"
        question.answer = result.answer
        question.answer_mode = result.mode
        question.knowledge_refs = result.refs
        question.model_provider = result.provider
        question.model_name = result.model
        question.prompt_version = result.prompt_version
        question.latency_ms = result.latency_ms
        question.answered_at = datetime.now(timezone.utc)
        question.message = "回答仅依据下方已审核课程资料。"
        question.next_action = "继续课程可以看到完整步骤并完成一道理解检查。"
    db.commit()
    db.refresh(question)
    return serialize_question(question)


@app.post("/api/v1/questions/{question_id}/confirm", response_model=SessionOut)
def confirm_question(question_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    question = db.get(QuestionRequest, question_id)
    if question is None:
        return error_response(404, "QUESTION_NOT_FOUND", "没有找到这次问题")
    ensure_owner(user, question.user_id)
    if question.lesson_id is None or question.status not in ("waiting_confirmation", "answered", "knowledge_unavailable", "confirmed"):
        return error_response(409, "QUESTION_NOT_CONFIRMABLE", "这个问题不能进入普通学习")
    session = db.scalar(
        select(LearningSession).where(
            LearningSession.user_id == question.user_id,
            LearningSession.lesson_id == question.lesson_id,
        )
    )
    if session is None:
        version = active_course_version(db, question.lesson_id)
        session = LearningSession(user_id=question.user_id, lesson_id=question.lesson_id, course_version_id=version.id if version else None)
        db.add(session)
    question.status = "confirmed"
    db.commit()
    db.refresh(session)
    return serialize_session(db, session)


@app.post("/api/v1/lessons/{lesson_id}/start", response_model=SessionOut)
def start_lesson(lesson_id: str, payload: StartLessonIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, payload.user_id)
    if db.get(User, payload.user_id) is None:
        return error_response(404, "USER_NOT_FOUND", "没有找到测试用户")
    if db.get(Lesson, lesson_id) is None:
        return error_response(404, "LESSON_NOT_FOUND", "没有找到这节内容")
    session = db.scalar(
        select(LearningSession).where(
            LearningSession.user_id == payload.user_id,
            LearningSession.lesson_id == lesson_id,
        )
    )
    if session is None:
        version = active_course_version(db, lesson_id)
        session = LearningSession(user_id=payload.user_id, lesson_id=lesson_id, course_version_id=version.id if version else None)
        db.add(session)
        db.commit()
        db.refresh(session)
    return serialize_session(db, session)


@app.post("/api/v1/housekeeping/courses/{course_id}/start", response_model=SessionOut)
def start_housekeeping_course(course_id: str, payload: StartLessonIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    course = db.get(Lesson, course_id)
    if course is None or course.domain != "housekeeping" or course.content_status not in ("internal_test_candidate", "published"):
        return error_response(404, "COURSE_NOT_FOUND", "没有找到这门家政课程")
    return start_lesson(course_id, payload, user, db)


@app.get("/api/v1/learning/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    ensure_owner(user, session.user_id)
    return serialize_session(db, session)


@app.post("/api/v1/learning/sessions/{session_id}/progress", response_model=SessionOut)
def save_progress(session_id: int, payload: ProgressIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    ensure_owner(user, session.user_id)
    lesson = db.get(Lesson, session.lesson_id)
    version = db.get(CourseVersion, session.course_version_id) if session.course_version_id else None
    steps = version.steps if version and version.steps else lesson.steps if lesson else []
    if lesson is None or payload.current_step >= len(steps):
        return error_response(422, "INVALID_STEP", "这个学习步骤不存在")
    if session.status == "completed":
        return serialize_session(db, session)
    session.current_step = payload.current_step
    session.status = "learning"
    db.commit()
    db.refresh(session)
    return serialize_session(db, session)


@app.post("/api/v1/learning/sessions/{session_id}/quiz", response_model=QuizResult)
def submit_quiz(session_id: int, payload: QuizIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    ensure_owner(user, session.user_id)
    lesson = db.get(Lesson, session.lesson_id)
    if lesson is None:
        return error_response(404, "LESSON_NOT_FOUND", "没有找到这节内容")
    version = db.get(CourseVersion, session.course_version_id) if session.course_version_id else None
    quiz = version.quiz if version and version.quiz else lesson.quiz
    steps = version.steps if version and version.steps else lesson.steps
    session.quiz_attempts += 1
    correct = payload.answer == quiz["correct_answer"]
    if correct:
        session.status = "completed"
        session.current_step = len(steps) - 1
        session.completed_at = datetime.now(timezone.utc)
        message = "回答正确，这节课程已完成。"
    else:
        session.status = "checking"
        message = str(quiz.get("explanation", "这道题容易混淆，请回看关键步骤再试一次。"))
    db.commit()
    db.refresh(session)
    return QuizResult(correct=correct, message=message, session=serialize_session(db, session))


@app.get("/api/v1/learning/users/{user_id}/records", response_model=list[SessionOut])
def learning_records(user_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, user_id)
    sessions = db.scalars(
        select(LearningSession)
        .where(LearningSession.user_id == user_id)
        .order_by(LearningSession.updated_at.desc())
    )
    return [serialize_session(db, session) for session in sessions]


@app.get("/api/v1/housekeeping/courses", response_model=list[CourseCardOut])
def housekeeping_courses(user_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, user_id)
    if db.get(User, user_id) is None:
        return error_response(404, "USER_NOT_FOUND", "没有找到测试学员")
    courses = list(
        db.scalars(
            select(Lesson)
            .where(
                Lesson.domain == "housekeeping",
                Lesson.content_status.in_(("internal_test_candidate", "published")),
            )
        )
    )
    cards: list[CourseCardOut] = []
    for course in sorted(courses, key=lambda item: COURSE_META.get(item.id, {}).get("code", item.id)):
        active_version = active_course_version(db, course.id)
        if active_version is None:
            continue
        session = db.scalar(
            select(LearningSession).where(
                LearningSession.user_id == user_id,
                LearningSession.lesson_id == course.id,
            )
        )
        total_steps = max(len(course.steps), 1)
        progress = 0 if session is None else 100 if session.status == "completed" else round((session.current_step + 1) / total_steps * 100)
        meta = COURSE_META[course.id]
        cards.append(
            CourseCardOut(
                id=course.id,
                code=str(meta["code"]),
                title=course.title,
                summary=active_version.summary or str(meta["summary"]),
                estimated_minutes=int(meta["minutes"]),
                risk_level=course.risk_level,
                content_status=course.content_status,
                progress_status="not_started" if session is None else session.status,
                progress_percent=progress,
                version=CourseVersionOut(
                    id=active_version.id,
                    version=active_version.version,
                    objectives=active_version.objectives,
                    source_refs=active_version.source_refs,
                    review_status=active_version.review_status,
                    reviewer=active_version.reviewer,
                    reviewed_at=active_version.reviewed_at,
                ),
            )
        )
    return cards


@app.get("/api/v1/learning/overview", response_model=LearningOverviewOut)
def learning_overview(user_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, user_id)
    if db.get(User, user_id) is None:
        return error_response(404, "USER_NOT_FOUND", "没有找到测试学员")
    sessions = list(
        db.scalars(
            select(LearningSession).where(
                LearningSession.user_id == user_id,
                LearningSession.lesson_id.in_(tuple(COURSE_META)),
            )
        )
    )
    completed_ids = {session.lesson_id for session in sessions if session.status == "completed"}
    pre = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.user_id == user_id,
            AssessmentAttempt.kind == "pre",
            AssessmentAttempt.status == "submitted",
            AssessmentAttempt.is_official.is_(True),
        )
    )
    post = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.user_id == user_id,
            AssessmentAttempt.kind == "post",
            AssessmentAttempt.status == "submitted",
            AssessmentAttempt.is_official.is_(True),
        )
    )
    recommended_course_id = next((course_id for course_id in COURSE_META if course_id not in completed_ids), None)
    if pre is None:
        action = "start_pre_assessment"
        status = "active"
    elif len(completed_ids) < len(COURSE_META):
        action = "continue_course"
        status = "learning"
    elif post is None:
        action = "start_post_assessment"
        status = "core_completed"
    else:
        action = "view_report"
        status = "post_assessed"
    return LearningOverviewOut(
        housekeeping_status=status,
        pre_assessment_status="submitted" if pre else "not_started",
        completed_core_courses=len(completed_ids),
        total_core_courses=len(COURSE_META),
        recommended_action=action,
        recommended_course_id=recommended_course_id,
        post_assessment_status="submitted" if post else "not_started",
        report_status="complete" if pre and post else "incomplete",
    )


@app.post("/api/v1/assessments/{kind}/start", response_model=AssessmentAttemptOut)
def start_assessment(kind: str, payload: AssessmentStartIn, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, payload.user_id)
    if kind not in ("pre", "post"):
        return error_response(404, "ASSESSMENT_NOT_FOUND", "没有找到这份测一测")
    if db.get(User, payload.user_id) is None:
        return error_response(404, "USER_NOT_FOUND", "没有找到测试学员")
    existing = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.user_id == payload.user_id,
            AssessmentAttempt.idempotency_key == payload.idempotency_key,
        )
    )
    if existing is None:
        existing = db.scalar(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == payload.user_id,
                AssessmentAttempt.kind == kind,
                AssessmentAttempt.is_official.is_(True),
            )
        )
    if existing is None:
        if kind == "post":
            completed = list(
                db.scalars(
                    select(LearningSession).where(
                        LearningSession.user_id == payload.user_id,
                        LearningSession.lesson_id.in_(tuple(COURSE_META)),
                        LearningSession.status == "completed",
                    )
                )
            )
            if len({item.lesson_id for item in completed}) < len(COURSE_META):
                return error_response(409, "POST_ASSESSMENT_LOCKED", "完成六门家政入门课后，再来看看自己学会了多少。")
        existing = AssessmentAttempt(
            user_id=payload.user_id,
            kind=kind,
            assessment_version=ASSESSMENT_VERSION,
            idempotency_key=payload.idempotency_key,
            attempt_no=1,
            is_official=True,
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)
    return AssessmentAttemptOut(
        id=existing.id,
        kind=existing.kind,
        status=existing.status,
        assessment_version=existing.assessment_version,
        answers=existing.answers,
        questions=public_questions(kind, existing.assessment_version),
        score=existing.score,
    )


@app.put("/api/v1/assessments/attempts/{attempt_id}/answers/{question_id}", response_model=AssessmentAttemptOut)
def save_assessment_answer(
    attempt_id: int,
    question_id: str,
    payload: AssessmentAnswerIn,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    attempt = db.get(AssessmentAttempt, attempt_id)
    if attempt is None:
        return error_response(404, "ATTEMPT_NOT_FOUND", "没有找到这次测一测")
    ensure_owner(user, attempt.user_id)
    if attempt.status != "in_progress":
        return error_response(409, "ATTEMPT_ALREADY_SUBMITTED", "这次测一测已经提交")
    question = next((item for item in questions_for(attempt.kind, attempt.assessment_version) if item["id"] == question_id), None)
    if question is None or payload.selected_answer not in {option["id"] for option in question["options"]}:
        return error_response(422, "INVALID_ANSWER", "这个答案不在选项中")
    answers = dict(attempt.answers or {})
    answers[question_id] = payload.selected_answer
    attempt.answers = answers
    db.commit()
    db.refresh(attempt)
    return AssessmentAttemptOut(
        id=attempt.id,
        kind=attempt.kind,
        status=attempt.status,
        assessment_version=attempt.assessment_version,
        answers=attempt.answers,
        questions=public_questions(attempt.kind, attempt.assessment_version),
        score=attempt.score,
    )


@app.post("/api/v1/assessments/attempts/{attempt_id}/submit", response_model=AssessmentSubmitOut)
def submit_assessment(attempt_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    attempt = db.get(AssessmentAttempt, attempt_id)
    if attempt is None:
        return error_response(404, "ATTEMPT_NOT_FOUND", "没有找到这次测一测")
    ensure_owner(user, attempt.user_id)
    questions = questions_for(attempt.kind, attempt.assessment_version)
    if attempt.status == "submitted" and attempt.score is not None:
        score, correct, results = score_answers(attempt.kind, attempt.answers, attempt.assessment_version)
    else:
        if len(attempt.answers or {}) != len(questions):
            return error_response(422, "ASSESSMENT_INCOMPLETE", "还有题目没有回答")
        score, correct, results = score_answers(attempt.kind, attempt.answers, attempt.assessment_version)
        attempt.score = score
        attempt.status = "submitted"
        attempt.submitted_at = datetime.now(timezone.utc)
        db.commit()
    return AssessmentSubmitOut(
        attempt_id=attempt.id,
        kind=attempt.kind,
        status="submitted",
        score=score,
        correct_count=correct,
        question_count=len(questions),
        knowledge_point_results=results,
        is_official=attempt.is_official,
    )


@app.get("/api/v1/learning/report", response_model=LearningReportOut)
def learning_report(user_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    ensure_owner(user, user_id)
    attempts = list(
        db.scalars(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == user_id,
                AssessmentAttempt.status == "submitted",
                AssessmentAttempt.is_official.is_(True),
            )
        )
    )
    pre = next((attempt for attempt in attempts if attempt.kind == "pre"), None)
    post = next((attempt for attempt in attempts if attempt.kind == "post"), None)
    completed = list(
        db.scalars(
            select(LearningSession).where(
                LearningSession.user_id == user_id,
                LearningSession.lesson_id.in_(tuple(COURSE_META)),
                LearningSession.status == "completed",
            )
        )
    )
    missing = [name for name, value in (("pre_assessment", pre), ("post_assessment", post)) if value is None]
    if missing:
        return LearningReportOut(report_status="incomplete", completed_core_courses=len({item.lesson_id for item in completed}), missing=missing)
    _, _, post_results = score_answers("post", post.answers, post.assessment_version)
    improvement = int(post.score or 0) - int(pre.score or 0)
    return LearningReportOut(
        report_status="complete",
        pre_score=pre.score,
        post_score=post.score,
        improvement_points=improvement,
        relative_improvement=round(improvement / max(int(pre.score or 0), 20), 4),
        mastered_knowledge_points=[name for name, correct in post_results.items() if correct],
        review_knowledge_points=[name for name, correct in post_results.items() if not correct],
        completed_core_courses=len({item.lesson_id for item in completed}),
    )


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, __: Exception):
    return error_response(500, "INTERNAL_ERROR", "系统暂时没有完成，请稍后再试", True)


@app.exception_handler(AdminContentError)
async def admin_content_exception(_: Request, error: AdminContentError):
    return error_response(error.status_code, error.code, error.message)


@app.exception_handler(AuthError)
async def auth_exception(_: Request, error: AuthError):
    return error_response(error.status_code, error.code, error.message)
