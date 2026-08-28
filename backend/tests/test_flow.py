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
        assert started["course_version_id"] is not None

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
        assert all(item["version"]["review_status"] == "draft" for item in courses.json())

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


def test_content_review_publish_and_suspend_flow():
    headers = {"X-Admin-Key": "amajia-local-admin"}
    with TestClient(app) as client:
        assert client.get("/api/v1/admin/course-versions").status_code == 401
        versions = client.get("/api/v1/admin/course-versions", headers=headers)
        assert versions.status_code == 200
        cleaner = next(item for item in versions.json() if item["course_id"] == "cleaner-safety")

        blocked = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/submit-review",
            headers=headers,
            json={"actor": "内容管理员", "comment": "提交审核", "idempotency_key": "cleaner-submit-no-source"},
        )
        assert blocked.status_code == 409

        update_payload = {
            "objectives": cleaner["objectives"],
            "source_refs": [{"name": "内部家政安全规范测试来源", "url": "https://example.org/housekeeping-safety"}],
            "title": cleaner["title"],
            "summary": cleaner["summary"],
            "risk_level": cleaner["risk_level"],
            "disclaimer": cleaner["disclaimer"],
            "conclusion": cleaner["conclusion"],
            "steps": cleaner["steps"],
            "quiz": cleaner["quiz"],
            "actor": "内容管理员",
            "idempotency_key": "cleaner-update-source",
        }
        updated = client.put(f"/api/v1/admin/course-versions/{cleaner['id']}", headers=headers, json=update_payload)
        assert updated.status_code == 200
        assert len(updated.json()["source_refs"]) == 1

        submitted = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/submit-review",
            headers=headers,
            json={"actor": "内容管理员", "comment": "资料齐全", "idempotency_key": "cleaner-submit-review"},
        )
        assert submitted.json()["review_status"] == "in_review"

        professional = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/approve",
            headers=headers,
            json={"actor": "审核管理员", "reviewer": "家政专业审核员", "review_type": "professional", "decision": "approved", "comment": "专业内容通过", "idempotency_key": "cleaner-professional-review"},
        )
        assert professional.status_code == 200
        assert professional.json()["review_status"] == "in_review"

        safety = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/approve",
            headers=headers,
            json={"actor": "审核管理员", "reviewer": "安全审核员", "review_type": "safety", "decision": "approved", "comment": "安全边界通过", "idempotency_key": "cleaner-safety-review"},
        )
        assert safety.status_code == 200
        assert safety.json()["review_status"] == "approved"

        published = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/publish",
            headers=headers,
            json={"actor": "发布管理员", "comment": "进入内部测试目录", "idempotency_key": "cleaner-publish"},
        )
        assert published.status_code == 200
        assert published.json()["review_status"] == "published"

        repeated = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/publish",
            headers=headers,
            json={"actor": "发布管理员", "comment": "重复请求", "idempotency_key": "cleaner-publish"},
        )
        assert repeated.status_code == 200
        assert repeated.json()["review_status"] == "published"

        suspended = client.post(
            f"/api/v1/admin/course-versions/{cleaner['id']}/suspend",
            headers=headers,
            json={"actor": "发布管理员", "comment": "演练紧急下架", "idempotency_key": "cleaner-suspend"},
        )
        assert suspended.status_code == 200
        assert suspended.json()["review_status"] == "suspended"


def test_new_draft_does_not_leak_into_learning_catalog():
    headers = {"X-Admin-Key": "amajia-local-admin"}
    with TestClient(app) as client:
        user = client.post("/api/v1/auth/test-login").json()
        before = client.get(
            "/api/v1/housekeeping/courses", params={"user_id": user["id"]}
        ).json()
        current = next(item for item in before if item["id"] == "housekeeping-work-basics")
        version = next(
            item
            for item in client.get(
                "/api/v1/admin/course-versions", headers=headers
            ).json()
            if item["course_id"] == "housekeeping-work-basics"
        )
        payload = {
            "objectives": version["objectives"],
            "source_refs": [
                {
                    "name": "内部课程候选来源",
                    "url": "https://example.org/housekeeping-work-basics",
                }
            ],
            "title": "尚未发布的新标题",
            "summary": "这段内容只应出现在审核后台。",
            "risk_level": version["risk_level"],
            "disclaimer": version["disclaimer"],
            "conclusion": version["conclusion"],
            "steps": version["steps"],
            "quiz": version["quiz"],
            "actor": "内容管理员",
            "idempotency_key": "create-hidden-draft-v2",
        }
        created = client.post(
            "/api/v1/admin/courses/housekeeping-work-basics/versions",
            headers=headers,
            json=payload,
        )
        assert created.status_code == 200
        assert created.json()["version"] == 2
        assert created.json()["review_status"] == "draft"

        after = client.get(
            "/api/v1/housekeeping/courses", params={"user_id": user["id"]}
        ).json()
        visible = next(item for item in after if item["id"] == "housekeeping-work-basics")
        assert visible["title"] == current["title"]
        assert visible["summary"] == current["summary"]
        assert visible["version"]["version"] == current["version"]["version"] == 1


def teardown_module():
    if TEST_DB.exists():
        TEST_DB.unlink()
