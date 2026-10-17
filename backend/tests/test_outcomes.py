import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from sqlalchemy.orm import Session, sessionmaker

from app import db, main
from app.auth import CURRENT_PRIVACY_VERSION, seed_development_invitations
from app.models import CourseVersion, Invitation, LearningSession, PracticeAttempt, CoachConversation


def login(client, code):
    result = client.post("/api/v1/auth/invite-login", json={"invitation_code": code, "display_name": "验收学员", "consent_accepted": True, "consent_version": CURRENT_PRIVACY_VERSION})
    assert result.status_code == 200, result.text
    return result.json()


@pytest.fixture
def app_context(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'outcomes.db'}"
    engine = db.build_engine(url)
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(db, "SessionLocal", sessionmaker(bind=engine, expire_on_commit=False))
    with TestClient(main.app) as admin, TestClient(main.app) as learner:
        login(admin, os.environ["ADMIN_INVITE_CODE"])
        user = login(learner, os.environ["LEARNER_INVITE_CODE"])
        yield admin, learner, engine, user
    engine.dispose()


def finish_course(learner, engine, course_id="housekeeping-work-basics"):
    result = learner.post("/api/v1/coach/turns", json={"action": "start_or_resume", "course_id": course_id})
    assert result.status_code == 200
    session = result.json()["session"]
    while session["status"] != "checking":
        result = learner.post("/api/v1/coach/turns", json={"action": "continue", "session_id": session["id"], "expected_step": session["current_step"]})
        assert result.status_code == 200
        session = result.json()["session"]
    with Session(engine) as connection:
        answer = connection.get(CourseVersion, session["course_version_id"]).quiz["correct_answer"]
    result = learner.post("/api/v1/coach/turns", json={"action": "submit_check", "session_id": session["id"], "answer": answer, "expected_quiz_attempts": 0})
    assert result.status_code == 200
    return result.json()["session"]


def payload(attempt=0):
    return {"response_text": "我会先确认任务范围，按课程顺序处理，不确定时停止并求助，完成后检查并向客户交接。", "idempotency_key": str(uuid.uuid4()), "expected_attempt_no": attempt}


def review_payload(decision="reviewed"):
    return {"decision": decision, "feedback": "顺序和边界已说明，请在线下教练指导下核验实际操作。", "sequence": True, "safety": True, "handover": True}


def test_outcome_recommendation_uses_real_state_and_never_certifies(app_context):
    _, learner, engine, _ = app_context
    initial = learner.get("/api/v1/learning/outcomes").json()
    assert initial["course_completed"] == 0
    assert initial["next_action"]["kind"] == "course"
    session = finish_course(learner, engine)
    state = learner.get("/api/v1/learning/outcomes").json()
    assert state["next_action"]["kind"] == "practice"
    assert state["next_action"]["session_id"] == session["id"]
    assert state["teachback_reviewed"] == 0
    assert state["practical_verified"] is False
    task = learner.get(f"/api/v1/learning/sessions/{session['id']}/practice").json()
    assert task["title"] in task["prompt"]


def test_post_only_report_keeps_evidence_without_inventing_improvement(app_context):
    _, learner, engine, user = app_context
    from app.seed import COURSE_META
    for course_id in COURSE_META:
        finish_course(learner, engine, course_id)
    started = learner.post("/api/v1/assessments/post/start", json={"user_id": user["id"], "idempotency_key": str(uuid.uuid4())})
    assert started.status_code == 200
    attempt = started.json()
    for question in attempt["questions"]:
        response = learner.put(f"/api/v1/assessments/attempts/{attempt['id']}/answers/{question['id']}", json={"selected_answer": question["options"][0]["id"]})
        assert response.status_code == 200
    submitted = learner.post(f"/api/v1/assessments/attempts/{attempt['id']}/submit")
    assert submitted.status_code == 200
    result = submitted.json()
    report = learner.get(f"/api/v1/learning/report?user_id={user['id']}").json()
    assert report["report_status"] == "incomplete"
    assert report["missing"] == ["pre_assessment"]
    assert report["pre_score"] is None
    assert report["post_score"] == result["score"]
    assert report["improvement_points"] is None
    assert report["relative_improvement"] is None
    assert report["review_knowledge_points"] == [name for name, correct in result["knowledge_point_results"].items() if not correct]


def test_submit_review_repair_retry_and_history(app_context):
    admin, learner, engine, _ = app_context
    session = finish_course(learner, engine)
    url = f"/api/v1/learning/sessions/{session['id']}/practice"
    data = payload()
    submitted = learner.post(url, json=data)
    assert submitted.status_code == 200
    item = submitted.json()["attempt"]
    assert item["status"] == "submitted"
    assert learner.post(url, json=data).json()["attempt"]["id"] == item["id"]
    assert learner.post(url, json={**data, "response_text": data["response_text"] + "其他"}).status_code == 409
    assert learner.post(url, json=payload(1)).status_code == 409
    assert learner.get("/api/v1/learning/outcomes").json()["awaiting_review"] == 1
    queue = admin.get("/api/v1/admin/practice").json()
    assert queue[0]["attempt"]["id"] == item["id"]
    assert queue[0]["reference_steps"]
    review_url = f"/api/v1/admin/practice/{item['id']}/review"
    assert admin.post(review_url, json={**review_payload(), "safety": False}).status_code == 422
    rejection = {**review_payload("needs_revision"), "safety": False}
    assert admin.post(review_url, json=rejection).status_code == 200
    assert admin.post(review_url, json=rejection).status_code == 200
    assert admin.post(review_url, json=review_payload()).status_code == 409
    state = learner.get("/api/v1/learning/outcomes").json()
    assert state["needs_revision"] == 1
    assert state["next_action"]["label"] == "补充我的做法"
    assert learner.post(url, json=payload(0)).status_code == 409
    updated = learner.post(url, json=payload(1)).json()["attempt"]
    assert updated["attempt_no"] == 2
    assert admin.post(f"/api/v1/admin/practice/{updated['id']}/review", json=review_payload()).status_code == 200
    result = learner.get("/api/v1/learning/outcomes").json()
    assert result["teachback_reviewed"] == 1
    assert result["needs_revision"] == 0
    assert result["practical_verified"] is False
    assert result["next_action"]["kind"] == "course"
    with Session(engine) as connection:
        assert connection.scalar(select(func.count()).select_from(PracticeAttempt)) == 2
        assert connection.get(LearningSession, session["id"]).status == "completed"


def test_auth_ownership_validation_and_deletion(app_context):
    admin, learner, engine, user = app_context
    session = finish_course(learner, engine)
    url = f"/api/v1/learning/sessions/{session['id']}/practice"
    assert learner.post(url, json={**payload(), "user_id": 999}).status_code == 422
    assert learner.post(url, json={**payload(), "response_text": " " * 40}).status_code == 422
    assert learner.post(url, json={**payload(), "response_text": "好" * 1201}).status_code == 422
    item = learner.post(url, json=payload()).json()["attempt"]
    assert learner.get("/api/v1/admin/practice").status_code == 403
    assert learner.get("/api/v1/admin/pilot-summary").status_code == 403
    assert learner.post(f"/api/v1/admin/practice/{item['id']}/review", json=review_payload()).status_code == 403
    # Admin cannot use the learner self-service API to view another learner's task.
    assert admin.get(url).status_code == 404
    assert admin.post(url, json=payload()).status_code == 404
    assert admin.get("/api/v1/admin/practice?limit=1000").status_code == 422
    learner.post("/api/v1/coach/conversations")
    assert learner.request("DELETE", "/api/v1/auth/me", json={"confirmation": "删除我的学习数据"}).status_code == 200
    with Session(engine) as connection:
        assert connection.scalar(select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.user_id == user["id"])) == 0
        assert connection.scalar(select(func.count()).select_from(CoachConversation).where(CoachConversation.user_id == user["id"])) == 0
    assert learner.get("/api/v1/learning/outcomes").status_code == 401
    assert learner.get(url).status_code == 401
    assert learner.post(url, json=payload()).status_code == 401


def test_cannot_self_review_and_counts_are_not_business_results(app_context):
    admin, _, engine, _ = app_context
    session = finish_course(admin, engine)
    item = admin.post(f"/api/v1/learning/sessions/{session['id']}/practice", json=payload()).json()["attempt"]
    assert admin.post(f"/api/v1/admin/practice/{item['id']}/review", json=review_payload()).status_code == 403
    summary = admin.get("/api/v1/admin/pilot-summary").json()
    assert summary["learners"] == 1
    assert summary["completed_lessons"] == 0  # admin demo activity excluded
    assert summary["published_courses"] == 0
    assert "测试账号" in summary["measurement_note"]


def test_no_answer_leak_no_skipping_and_no_progress_on_explanation(app_context):
    _, learner, _, _ = app_context
    session = learner.post("/api/v1/coach/turns", json={"action": "start_or_resume"}).json()["session"]
    assert "correct_answer" not in session["lesson"]["quiz"]
    assert "explanation" not in session["lesson"]["quiz"]
    for course in learner.get("/api/v1/lessons").json():
        assert "correct_answer" not in course["quiz"]
    url = "/api/v1/coach/turns"
    sid = session["id"]
    assert learner.post(url, json={"action": "continue", "session_id": sid}).status_code == 422
    assert learner.post(url, json={"action": "submit_check", "session_id": sid, "answer": "a", "expected_quiz_attempts": 0}).status_code == 409
    assert learner.post(f"/api/v1/learning/sessions/{sid}/quiz", json={"answer": "a"}).status_code == 409
    assert learner.post(f"/api/v1/learning/sessions/{sid}/progress", json={"current_step": len(session["lesson"]["steps"]) - 1}).status_code == 409
    assert learner.post(f"/api/v1/learning/sessions/{sid}/practice", json=payload()).status_code == 409
    explained = learner.post(url, json={"action": "explain_again", "session_id": sid}).json()
    assert explained["session"]["current_step"] == 0


def test_no_default_invites(app_context, monkeypatch):
    _, _, engine, _ = app_context
    monkeypatch.delenv("LEARNER_INVITE_CODE")
    monkeypatch.delenv("ADMIN_INVITE_CODE")
    with Session(engine) as connection:
        before = connection.scalar(select(func.count()).select_from(Invitation))
        seed_development_invitations(connection)
        assert connection.scalar(select(func.count()).select_from(Invitation)) == before


def test_completed_course_cannot_be_demoted_by_repeated_quiz(app_context):
    _, learner, engine, _ = app_context
    session = finish_course(learner, engine)
    result = learner.post(f"/api/v1/learning/sessions/{session['id']}/quiz", json={"answer": "a"})
    assert result.status_code == 200
    assert result.json()["session"]["status"] == "completed"
    assert result.json()["session"]["quiz_attempts"] == session["quiz_attempts"]
