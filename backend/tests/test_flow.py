import os
import secrets
from pathlib import Path

TEST_DB = Path(__file__).parent / "phase1-test.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["LEARNER_INVITE_CODE"] = secrets.token_urlsafe(24)
os.environ["ADMIN_INVITE_CODE"] = secrets.token_urlsafe(24)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.ai_service import answer_from_published_knowledge  # noqa: E402
from app.assessments import ASSESSMENT_VERSION, questions_for, score_answers  # noqa: E402
from app.assessment_bank_v2 import SOURCE_IDS  # noqa: E402
from app.models import CourseVersion, KnowledgeIndexChunk, MediaAsset, QuestionRequest  # noqa: E402
from app.coach_skills import SKILLS, validate_tool_request  # noqa: E402
from app.coach_orchestrator import plan_question_answer  # noqa: E402
from app.coach_tools import TOOLS  # noqa: E402
from app.prompt_engineering import GROUNDED_HOUSEKEEPING_ANSWER, get_prompt  # noqa: E402
from app.knowledge_retrieval import rebuild_course_index  # noqa: E402
from app.media_service import published_media_for_version  # noqa: E402
from app.db import engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402


def login_with_invite(client: TestClient, code: str | None = None, name: str = "体验学员"):
    code = code or os.environ["LEARNER_INVITE_CODE"]
    response = client.post(
        "/api/v1/auth/invite-login",
        json={
            "invitation_code": code,
            "display_name": name,
            "consent_accepted": True,
            "consent_version": "2026-08-28-v1",
        },
    )
    assert response.status_code == 200
    assert response.cookies.get("amajia_session")
    return response.json()


def test_prompt_and_skill_engineering_contracts():
    prompt = get_prompt("grounded_housekeeping_answer")
    assert prompt.version == "housekeeping-grounded-v2"
    assert "已审核课程" in prompt.system_template
    assert "不要把用户引导回基础版页面" in prompt.system_template
    assert GROUNDED_HOUSEKEEPING_ANSWER.required_context == (
        "question", "course_title", "summary", "conclusion", "steps", "disclaimer"
    )

    assert set(SKILLS) == {
        "answer_housekeeping_question", "teach_course_in_chat", "check_understanding", "review_mistakes"
    }
    validate_tool_request("teach_course_in_chat", "save_learning_progress")
    try:
        validate_tool_request("answer_housekeeping_question", "save_learning_progress")
    except ValueError as exc:
        assert "not allowed" in str(exc)
    else:
        raise AssertionError("A read-only answer Skill must not write progress")


def test_parent_orchestrator_plans_read_only_grounded_answer():
    question = QuestionRequest(
        id=501,
        user_id=1,
        idempotency_key="orchestrator-plan",
        original_text="厨房油污先擦哪里？",
        understood_text="厨房清洁",
        status="waiting_confirmation",
        lesson_id="kitchen-order",
        risk_level="L0",
    )
    plan = plan_question_answer(question)
    assert plan.skill_key == "answer_housekeeping_question"
    assert plan.prompt_version == "housekeeping-grounded-v2"
    assert plan.may_write_progress is False
    assert [tool.name for tool in plan.tool_calls] == ["retrieve_knowledge"]
    assert plan.tool_calls[0].access == "read"
    assert TOOLS["save_learning_progress"].requires_confirmation is True

    question.status = "blocked"
    question.risk_level = "L3"
    try:
        plan_question_answer(question)
    except ValueError as exc:
        assert "must not enter" in str(exc)
    else:
        raise AssertionError("High-risk questions must not enter the teaching orchestrator")


def test_published_knowledge_search_is_retrieval_only(monkeypatch):
    monkeypatch.delenv("AI_EMBEDDING_MODEL", raising=False)
    with TestClient(app) as client:
        login_with_invite(client)
        with Session(engine) as db:
            existing = db.query(CourseVersion).filter_by(course_id="kitchen-order", version=9).one_or_none()
            if existing is None:
                version = CourseVersion(
                    course_id="kitchen-order",
                    version=9,
                    title="厨房清洁基本顺序",
                    summary="厨房清洁要先收走杂物，再处理高处和台面。",
                    conclusion="先收杂物，再从高到低，最后清洁地面。",
                    steps=[
                        {"title": "收走杂物", "body": "先移开食物和餐具。"},
                        {"title": "处理油污", "body": "按产品标签处理灶台油污并保持通风。"},
                    ],
                    disclaimer="清洁剂按标签使用，不要混用。",
                    source_refs=[{"name": "内测审核资料", "url": "https://example.com/reviewed-kitchen"}],
                    review_status="published",
                )
                db.add(version)
                db.flush()
                rebuild_course_index(db, version)
                db.commit()

        response = client.get("/api/v1/knowledge/search", params={"q": "厨房油污怎么处理"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["retrieval_mode"] == "structured_lexical"
        assert payload["hits"]
        assert payload["hits"][0]["course_id"] == "kitchen-order"
        assert "油污" in "".join(hit["content"] for hit in payload["hits"])
        assert "answer" not in payload
        with Session(engine) as db:
            created = db.query(CourseVersion).filter_by(course_id="kitchen-order", version=9).one()
            db.query(KnowledgeIndexChunk).filter_by(course_version_id=created.id).delete()
            db.delete(created)
            db.commit()


def test_media_tool_only_returns_published_licensed_assets():
    with TestClient(app):
        with Session(engine) as db:
            version = CourseVersion(
                course_id="kitchen-order", version=11, title="厨房媒体测试", summary="测试", conclusion="测试结论",
                steps=[{"title": "第一步", "body": "测试步骤"}], disclaimer="测试安全提醒", source_refs=[], review_status="published",
            )
            db.add(version); db.flush()
            published = MediaAsset(
                course_version_id=version.id, step_index=0, media_type="image", title="标准图片", url="https://example.com/step.jpg",
                alt_text="擦拭厨房台面的标准动作", copyright_owner="测试版权方", license_scope="内部测试与公开教学", review_status="published",
            )
            draft = MediaAsset(
                course_version_id=version.id, step_index=0, media_type="video", title="未审核视频", url="https://example.com/draft.mp4",
                alt_text="未审核视频", copyright_owner="测试版权方", license_scope="内部测试", review_status="draft",
            )
            db.add_all([published, draft]); db.commit()
            assets = published_media_for_version(db, version.id, 0)
            assert [asset.title for asset in assets] == ["标准图片"]
            db.query(MediaAsset).filter_by(course_version_id=version.id).delete()
            db.delete(version); db.commit()


def test_phase1_learning_flow():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["mode"] == "internal_test"
        assert health.json()["version"] == "0.4.0"

        assert client.get("/api/v1/lessons").status_code == 401
        user = login_with_invite(client)
        repeated_user = client.get("/api/v1/auth/me").json()
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
        user = login_with_invite(client)
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


def test_coach_conversation_history_and_question_linking():
    with TestClient(app) as client:
        user = login_with_invite(client)
        created = client.post("/api/v1/coach/conversations")
        assert created.status_code == 200
        conversation = created.json()
        assert conversation["title"] == "新的陪学对话"

        question = client.post(
            "/api/v1/questions",
            json={
                "user_id": user["id"],
                "text": "洗衣前应该先检查什么？",
                "idempotency_key": "coach-history-link-test",
                "conversation_id": conversation["id"],
            },
        )
        assert question.status_code == 200
        assert question.json()["conversation_id"] == conversation["id"]

        history = client.get(f"/api/v1/coach/conversations/{conversation['id']}/questions")
        assert history.status_code == 200
        assert [item["id"] for item in history.json()] == [question.json()["id"]]
        recent = client.get("/api/v1/coach/conversations").json()
        assert recent[0]["id"] == conversation["id"]
        assert recent[0]["title"] == "洗衣前应该先检查什么？"


def test_controlled_ai_stops_before_unreviewed_knowledge():
    with TestClient(app) as client:
        user = login_with_invite(client)
        capability = client.get("/api/v1/ai/capability")
        assert capability.status_code == 200
        assert capability.json()["mode"] == "review_required"
        assert capability.json()["published_knowledge_count"] == 0

        question = client.post(
            "/api/v1/questions",
            json={"user_id": user["id"], "text": "厨房油污应该先擦哪里？", "idempotency_key": "test-ai-review-boundary"},
        ).json()
        answered = client.post(f"/api/v1/questions/{question['id']}/answer")
        assert answered.status_code == 200
        payload = answered.json()
        assert payload["status"] == "knowledge_unavailable"
        assert payload["answer_mode"] == "unavailable"
        assert payload["answer"] is None
        assert payload["knowledge_refs"] == []
        continued = client.post(f"/api/v1/questions/{question['id']}/confirm")
        assert continued.status_code == 200
        assert continued.json()["lesson_id"] == "kitchen-order"

        blocked = client.post(
            "/api/v1/questions",
            json={"user_id": user["id"], "text": "误食清洁剂怎么急救", "idempotency_key": "test-ai-l3-boundary"},
        ).json()
        blocked_answer = client.post(f"/api/v1/questions/{blocked['id']}/answer").json()
        assert blocked_answer["status"] == "blocked"
        assert blocked_answer["answer_mode"] is None


def test_published_knowledge_has_explicit_non_model_fallback(monkeypatch):
    monkeypatch.delenv("AI_API_BASE", raising=False)
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.delenv("AI_MODEL", raising=False)
    version = CourseVersion(
        id=99,
        course_id="kitchen-order",
        version=2,
        title="厨房清洁基本顺序",
        summary="厨房基础清洁",
        conclusion="先收走杂物，再从高处到低处清洁。",
        steps=[{"title": "腾空台面", "body": "先移开食物和餐具。"}],
        disclaimer="清洁剂按标签使用并保持通风。",
        source_refs=[{"name": "审核资料", "url": "https://example.com/source"}],
        review_status="published",
    )
    question = QuestionRequest(
        id=88,
        user_id=1,
        idempotency_key="unit-fallback",
        original_text="厨房油污先擦哪里？",
        understood_text="厨房清洁",
        status="waiting_confirmation",
        lesson_id="kitchen-order",
        risk_level="L0",
    )
    result = answer_from_published_knowledge(question, version)
    assert result.mode == "knowledge_fallback"
    assert result.model is None
    assert "从高处到低处" in result.answer
    assert result.refs[0]["course_version_id"] == 99


def test_housekeeping_assessment_and_report_flow():
    with TestClient(app) as client:
        user = login_with_invite(client)
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
        assert pre["assessment_version"] == ASSESSMENT_VERSION
        assert len(pre["questions"]) == 12
        assert "correct_answer" not in pre["questions"][0]
        assert "source_ids" not in pre["questions"][0]

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
        correct_answers = {question["id"]: question["correct_answer"] for question in questions_for("post")}
        for question in post_payload["questions"]:
            option = correct_answers[question["id"]]
            client.put(
                f"/api/v1/assessments/attempts/{post_payload['id']}/answers/{question['id']}",
                json={"selected_answer": option},
            )
        submitted_post = client.post(
            f"/api/v1/assessments/attempts/{post_payload['id']}/submit"
        )
        assert submitted_post.status_code == 200
        assert submitted_post.json()["score"] == 100
        assert submitted_post.json()["question_count"] == 12
        assert len(submitted_post.json()["knowledge_point_results"]) == 6

        report = client.get(
            "/api/v1/learning/report", params={"user_id": user["id"]}
        )
        assert report.status_code == 200
        assert report.json()["report_status"] == "complete"
        assert report.json()["completed_core_courses"] == 6


def test_assessment_bank_is_balanced_and_module_scoring_requires_both_answers():
    for kind in ("pre", "post"):
        questions = questions_for(kind)
        assert len(questions) == 12
        assert len({question["id"] for question in questions}) == 12
        counts: dict[str, int] = {}
        for question in questions:
            name = str(question["knowledge_point"])
            counts[name] = counts.get(name, 0) + 1
            assert len(question["options"]) == 3
            assert question["correct_answer"] in {option["id"] for option in question["options"]}
            assert question["source_ids"]
            assert set(question["source_ids"]).issubset(SOURCE_IDS)
        assert set(counts.values()) == {2}

    answers = {question["id"]: question["correct_answer"] for question in questions_for("post")}
    first_question = questions_for("post")[0]
    answers[str(first_question["id"])] = next(
        option["id"] for option in first_question["options"] if option["id"] != first_question["correct_answer"]
    )
    score, correct, results = score_answers("post", answers)
    assert score == 92
    assert correct == 11
    assert results["职业规范"] is False


def test_legacy_assessment_bank_remains_readable():
    assert len(questions_for("pre", "v0.4-test-1")) == 6
    answers = {question["id"]: question["correct_answer"] for question in questions_for("post", "v0.4-test-1")}
    score, correct, results = score_answers("post", answers, "v0.4-test-1")
    assert score == 100
    assert correct == 6
    assert all(results.values())


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
        user = login_with_invite(client)
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


def test_role_authorization_logout_and_account_deletion():
    with TestClient(app) as learner_client:
        learner = login_with_invite(learner_client)
        forbidden = learner_client.get("/api/v1/admin/course-versions")
        assert forbidden.status_code == 403
        assert forbidden.json()["error"]["code"] == "ADMIN_ROLE_REQUIRED"

        with TestClient(app) as admin_client:
            admin = login_with_invite(
                admin_client, os.environ["ADMIN_INVITE_CODE"], "内容管理员"
            )
            assert admin["role"] == "content_admin"
            assert admin_client.get("/api/v1/admin/course-versions").status_code == 200
            issued = admin_client.post(
                "/api/v1/admin/invitations",
                json={"label": "首批试学用户01", "expires_days": 7},
            )
            assert issued.status_code == 200
            assert issued.json()["invitation_code"].startswith("AMAJIA-")
            assert issued.json()["role"] == "learner"
            assert len(admin_client.get("/api/v1/admin/invitations").json()) >= 3
            with TestClient(app) as invited_client:
                invited = login_with_invite(
                    invited_client,
                    issued.json()["invitation_code"],
                    "新试学用户",
                )
                assert invited["role"] == "learner"
            cross_user = admin_client.get(
                "/api/v1/learning/overview", params={"user_id": learner["id"]}
            )
            assert cross_user.status_code == 403

            logged_out = admin_client.post("/api/v1/auth/logout")
            assert logged_out.status_code == 204
            assert admin_client.get("/api/v1/auth/me").status_code == 401

        wrong_confirmation = learner_client.request(
            "DELETE",
            "/api/v1/auth/me",
            json={"confirmation": "确认删除"},
        )
        assert wrong_confirmation.status_code == 422
        deleted = learner_client.request(
            "DELETE",
            "/api/v1/auth/me",
            json={"confirmation": "删除我的学习数据"},
        )
        assert deleted.status_code == 200
        assert deleted.json()["deleted"] is True
        assert len(deleted.json()["receipt"]) == 24
        assert learner_client.get("/api/v1/auth/me").status_code == 401
        assert learner_client.post(
            "/api/v1/auth/invite-login",
            json={
                "invitation_code": os.environ["LEARNER_INVITE_CODE"],
                "display_name": "体验学员",
                "consent_accepted": True,
                "consent_version": "2026-08-28-v1",
            },
        ).status_code == 401


def teardown_module():
    if TEST_DB.exists():
        TEST_DB.unlink()
