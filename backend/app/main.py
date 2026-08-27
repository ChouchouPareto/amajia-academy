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

from .db import Base, engine, get_db
from .models import LearningSession, Lesson, QuestionRequest, User
from .schemas import (
    LessonOut,
    ProgressIn,
    QuestionIn,
    QuestionOut,
    QuizIn,
    QuizResult,
    SessionOut,
    StartLessonIn,
    UserOut,
)
from .seed import seed_lessons


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
    return SessionOut(
        id=session.id,
        user_id=session.user_id,
        lesson_id=session.lesson_id,
        lesson=LessonOut.model_validate(lesson),
        status=session.status,
        current_step=session.current_step,
        quiz_attempts=session.quiz_attempts,
        completed_at=session.completed_at,
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        seed_lessons(db)
    yield


app = FastAPI(title="4060AI学习助手 Phase 1 API", version="0.1.0", lifespan=lifespan)
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
    return {"status": "ok", "phase": 1, "mode": "internal_demo"}


@app.post("/api/v1/auth/test-login", response_model=UserOut)
def test_login(db: Session = Depends(get_db)):
    external_key = "phase1-local-test-user"
    user = db.scalar(select(User).where(User.external_key == external_key))
    if user is None:
        user = User(external_key=external_key, display_name="体验用户")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@app.get("/api/v1/lessons", response_model=list[LessonOut])
def list_lessons(db: Session = Depends(get_db)):
    return list(db.scalars(select(Lesson).where(Lesson.content_status == "internal_demo")))


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
    )


def resolve_lesson_id(text: str) -> str | None:
    normalized = text.strip().lower()
    if any(term in normalized for term in ("油", "厨房", "清洁", "保洁")):
        return "kitchen-order"
    if any(term in normalized for term in ("睡", "孩子", "育儿", "拖延")):
        return "bedtime-order"
    if any(term in normalized for term in ("收纳", "整理", "东西太多", "收拾")):
        return "home-organize"
    return None


@app.post("/api/v1/questions", response_model=QuestionOut)
def create_question(payload: QuestionIn, db: Session = Depends(get_db)):
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
                message="这一版只准备了家政清洁、家庭整理和一般育儿习惯的内部演示内容，所以这次先不随便回答。",
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
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(QuestionRequest, question_id)
    if question is None:
        return error_response(404, "QUESTION_NOT_FOUND", "没有找到这次问题")
    return serialize_question(question)


@app.post("/api/v1/questions/{question_id}/confirm", response_model=SessionOut)
def confirm_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(QuestionRequest, question_id)
    if question is None:
        return error_response(404, "QUESTION_NOT_FOUND", "没有找到这次问题")
    if question.lesson_id is None or question.status not in ("waiting_confirmation", "confirmed"):
        return error_response(409, "QUESTION_NOT_CONFIRMABLE", "这个问题不能进入普通学习")
    session = db.scalar(
        select(LearningSession).where(
            LearningSession.user_id == question.user_id,
            LearningSession.lesson_id == question.lesson_id,
        )
    )
    if session is None:
        session = LearningSession(user_id=question.user_id, lesson_id=question.lesson_id)
        db.add(session)
    question.status = "confirmed"
    db.commit()
    db.refresh(session)
    return serialize_session(db, session)


@app.post("/api/v1/lessons/{lesson_id}/start", response_model=SessionOut)
def start_lesson(lesson_id: str, payload: StartLessonIn, db: Session = Depends(get_db)):
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
        session = LearningSession(user_id=payload.user_id, lesson_id=lesson_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return serialize_session(db, session)


@app.get("/api/v1/learning/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    return serialize_session(db, session)


@app.post("/api/v1/learning/sessions/{session_id}/progress", response_model=SessionOut)
def save_progress(session_id: int, payload: ProgressIn, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    lesson = db.get(Lesson, session.lesson_id)
    if lesson is None or payload.current_step >= len(lesson.steps):
        return error_response(422, "INVALID_STEP", "这个学习步骤不存在")
    if session.status == "completed":
        return serialize_session(db, session)
    session.current_step = payload.current_step
    session.status = "learning"
    db.commit()
    db.refresh(session)
    return serialize_session(db, session)


@app.post("/api/v1/learning/sessions/{session_id}/quiz", response_model=QuizResult)
def submit_quiz(session_id: int, payload: QuizIn, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if session is None:
        return error_response(404, "SESSION_NOT_FOUND", "没有找到学习记录")
    lesson = db.get(Lesson, session.lesson_id)
    if lesson is None:
        return error_response(404, "LESSON_NOT_FOUND", "没有找到这节内容")
    session.quiz_attempts += 1
    correct = payload.answer == lesson.quiz["correct_answer"]
    if correct:
        session.status = "completed"
        session.current_step = len(lesson.steps) - 1
        session.completed_at = datetime.now(timezone.utc)
        message = "回答正确，这节演示已完成。"
    else:
        session.status = "checking"
        message = "再想一想：开始前先确认今天要处理哪些区域。"
    db.commit()
    db.refresh(session)
    return QuizResult(correct=correct, message=message, session=serialize_session(db, session))


@app.get("/api/v1/learning/users/{user_id}/records", response_model=list[SessionOut])
def learning_records(user_id: int, db: Session = Depends(get_db)):
    sessions = db.scalars(
        select(LearningSession)
        .where(LearningSession.user_id == user_id)
        .order_by(LearningSession.updated_at.desc())
    )
    return [serialize_session(db, session) for session in sessions]


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, __: Exception):
    return error_response(500, "INTERNAL_ERROR", "系统暂时没有完成，请稍后再试", True)
