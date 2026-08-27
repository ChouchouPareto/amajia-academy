import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "phase1-test.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_phase1_learning_flow():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["mode"] == "internal_test"
        assert health.json()["version"] == "0.4.0"

        user = client.post("/api/v1/auth/test-login").json()
        repeated_user = client.post("/api/v1/auth/test-login").json()
        assert repeated_user["id"] == user["id"]

        lessons = client.get("/api/v1/lessons").json()
        assert len(lessons) == 6
        assert lessons[0]["content_status"] == "internal_test_candidate"
        lesson_id = lessons[0]["id"]
        correct_answer = lessons[0]["quiz"]["correct_answer"]
        wrong_answer = next(option["id"] for option in lessons[0]["quiz"]["options"] if option["id"] != correct_answer)

        started = client.post(
            f"/api/v1/lessons/{lesson_id}/start", json={"user_id": user["id"]}
        ).json()
        repeated = client.post(
            f"/api/v1/lessons/{lesson_id}/start", json={"user_id": user["id"]}
        ).json()
        assert repeated["id"] == started["id"]

        session_id = started["id"]
        progress = client.post(
            f"/api/v1/learning/sessions/{session_id}/progress", json={"current_step": 1}
        )
        assert progress.status_code == 200
        assert progress.json()["current_step"] == 1

        invalid = client.post(
            f"/api/v1/learning/sessions/{session_id}/progress", json={"current_step": 9}
        )
        assert invalid.status_code == 422

        wrong = client.post(
            f"/api/v1/learning/sessions/{session_id}/quiz", json={"answer": wrong_answer}
        ).json()
        assert wrong["correct"] is False
        assert wrong["session"]["status"] == "checking"

        correct = client.post(
            f"/api/v1/learning/sessions/{session_id}/quiz", json={"answer": correct_answer}
        ).json()
        assert correct["correct"] is True
        assert correct["session"]["status"] == "completed"

        records = client.get(f"/api/v1/learning/users/{user['id']}/records").json()
        assert len(records) == 1
        assert records[0]["status"] == "completed"


def test_question_routing_confirmation_and_idempotency():
    with TestClient(app) as client:
        user = client.post("/api/v1/auth/test-login").json()
        payload = {
            "user_id": user["id"],
            "text": "厨房油污应该先擦哪里？",
            "idempotency_key": "test-kitchen-question",
        }
        question = client.post("/api/v1/questions", json=payload)
        assert question.status_code == 200
        assert question.json()["status"] == "waiting_confirmation"
        repeated = client.post("/api/v1/questions", json=payload).json()
        assert repeated["id"] == question.json()["id"]

        restored = client.get(f"/api/v1/questions/{question.json()['id']}").json()
        assert restored["original_text"] == payload["text"]

        confirmed = client.post(f"/api/v1/questions/{question.json()['id']}/confirm")
        assert confirmed.status_code == 200
        assert confirmed.json()["lesson_id"] == "kitchen-order"

        blocked = client.post(
            "/api/v1/questions",
            json={"user_id": user["id"], "text": "孩子误食清洁剂怎么急救", "idempotency_key": "test-blocked-question"},
        ).json()
        assert blocked["status"] == "blocked"
        assert blocked["risk_level"] == "L3"

        no_match = client.post(
            "/api/v1/questions",
            json={"user_id": user["id"], "text": "怎样学习高等数学", "idempotency_key": "test-no-match-question"},
        ).json()
        assert no_match["status"] == "no_match"


def test_housekeeping_assessment_and_report_flow():
    with TestClient(app) as client:
        user = client.post("/api/v1/auth/test-login").json()
        courses = client.get(
            "/api/v1/housekeeping/courses", params={"user_id": user["id"]}
        )
        assert courses.status_code == 200
        assert len(courses.json()) == 6
        assert all(item["version"]["review_status"] == "pending" for item in courses.json())

        pre = client.post(
            "/api/v1/assessments/pre/start",
            json={"user_id": user["id"], "idempotency_key": "pre-assessment-test-key"},
        ).json()
        assert pre["status"] == "in_progress"
        assert len(pre["questions"]) == 6
        assert "correct_answer" not in pre["questions"][0]

        for question in pre["questions"]:
            response = client.put(
                f"/api/v1/assessments/attempts/{pre['id']}/answers/{question['id']}",
                json={"selected_answer": question["options"][0]["id"]},
            )
            assert response.status_code == 200
        submitted_pre = client.post(
            f"/api/v1/assessments/attempts/{pre['id']}/submit"
        )
        assert submitted_pre.status_code == 200

        locked_post = client.post(
            "/api/v1/assessments/post/start",
            json={"user_id": user["id"], "idempotency_key": "post-locked-test-key"},
        )
        assert locked_post.status_code == 409

        for course in courses.json():
            session = client.post(
                f"/api/v1/housekeeping/courses/{course['id']}/start",
                json={"user_id": user["id"]},
            ).json()
            correct = client.get("/api/v1/lessons").json()
            lesson = next(item for item in correct if item["id"] == course["id"])
            quiz = client.post(
                f"/api/v1/learning/sessions/{session['id']}/quiz",
                json={"answer": lesson["quiz"]["correct_answer"]},
            )
            assert quiz.status_code == 200
            assert quiz.json()["correct"] is True

        post = client.post(
            "/api/v1/assessments/post/start",
            json={"user_id": user["id"], "idempotency_key": "post-assessment-test-key"},
        )
        assert post.status_code == 200
        post_payload = post.json()
        for question in post_payload["questions"]:
            option = next(
                (
                    item["id"]
                    for item in question["options"]
                    if item["id"] == {"post-h01": "a", "post-h02": "b", "post-h03": "b", "post-h04": "a", "post-h05": "b", "post-h06": "b"}[question["id"]]
                ),
                question["options"][0]["id"],
            )
            client.put(
                f"/api/v1/assessments/attempts/{post_payload['id']}/answers/{question['id']}",
                json={"selected_answer": option},
            )
        submitted_post = client.post(
            f"/api/v1/assessments/attempts/{post_payload['id']}/submit"
        )
        assert submitted_post.status_code == 200
        assert submitted_post.json()["score"] == 100

        report = client.get(
            "/api/v1/learning/report", params={"user_id": user["id"]}
        )
        assert report.status_code == 200
        assert report.json()["report_status"] == "complete"
        assert report.json()["completed_core_courses"] == 6


def teardown_module():
    if TEST_DB.exists():
        TEST_DB.unlink()
