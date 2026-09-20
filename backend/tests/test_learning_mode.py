"""Account preference tests use their own SQLite database and connection pool."""
from fastapi.testclient import TestClient
import secrets
from sqlalchemy.orm import sessionmaker
from app import db, main
from app.main import app


def login_with_invite(client, code):
    response = client.post("/api/v1/auth/invite-login", json={
        "invitation_code": code, "display_name": "版本验收",
        "consent_accepted": True, "consent_version": "2026-08-28-v1",
    })
    assert response.status_code == 200
    return response.json()


def test_learning_mode_is_authenticated_validated_and_persists_per_account(tmp_path, monkeypatch):
    admin_code = secrets.token_urlsafe(24)
    monkeypatch.setenv("ADMIN_INVITE_CODE", admin_code)
    url = f"sqlite:///{tmp_path / 'preferences.db'}"
    isolated_engine = db.build_engine(url)
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setattr(db, "engine", isolated_engine)
    monkeypatch.setattr(main, "engine", isolated_engine)
    monkeypatch.setattr(db, "SessionLocal", sessionmaker(bind=isolated_engine, expire_on_commit=False))
    with TestClient(app) as client:
        assert client.get("/api/v1/auth/learning-mode").status_code == 401
        assert client.put("/api/v1/auth/learning-mode", json={"preferred_mode": "coach"}).status_code == 401
        login_with_invite(client, admin_code)
        issued = client.post("/api/v1/admin/invitations", json={"label": "mode-test-a", "expires_days": 2})
        assert issued.status_code in (200, 201)
        code_a = issued.json()["invitation_code"]
        issued_b = client.post("/api/v1/admin/invitations", json={"label": "mode-test-b", "expires_days": 2})
        code_b = issued_b.json()["invitation_code"]
        client.post("/api/v1/auth/logout")
        user_a = login_with_invite(client, code_a)
        state = client.get("/api/v1/auth/learning-mode").json()
        assert state["preferred_mode"] == "basic"
        assert state["allowed_modes"] == ["basic", "coach"]
        assert client.put("/api/v1/auth/learning-mode", json={"preferred_mode": "invalid"}).status_code == 422
        assert client.put("/api/v1/auth/learning-mode", json={"preferred_mode": "coach", "user_id": 999}).status_code == 422
        saved = client.put("/api/v1/auth/learning-mode", json={"preferred_mode": "coach"})
        assert saved.status_code == 200
        assert saved.json()["user_id"] == user_a["id"]
        client.post("/api/v1/auth/logout")
        login_with_invite(client, code_b)
        assert client.get("/api/v1/auth/learning-mode").json()["preferred_mode"] == "basic"
        client.post("/api/v1/auth/logout")
        login_with_invite(client, code_a)
        assert client.get("/api/v1/auth/learning-mode").json()["preferred_mode"] == "coach"
        assert client.put("/api/v1/auth/learning-mode", json={"preferred_mode": "basic"}).status_code == 200
        assert client.get("/api/v1/auth/learning-mode").json()["preferred_mode"] == "basic"
    isolated_engine.dispose()


def test_additive_migration_keeps_existing_users(tmp_path, monkeypatch):
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect
    from sqlalchemy.orm import Session
    from app.models import User, UserLearningPreference

    url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    engine = db.build_engine(url)
    tables = [table for table in db.Base.metadata.sorted_tables if table.name != "user_learning_preferences"]
    db.Base.metadata.create_all(engine, tables=tables)
    with Session(engine) as session:
        user = User(external_key="migration-test", display_name="迁移验收")
        session.add(user)
        session.commit()
        user_id = user.id
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "migrations"))
    command.stamp(config, "0007_coach_conversations")
    command.upgrade(config, "head")
    assert inspect(engine).has_table("user_learning_preferences")
    with Session(engine) as session:
        assert session.get(User, user_id).display_name == "迁移验收"
        session.add(UserLearningPreference(user_id=user_id, preferred_mode="coach"))
        session.commit()
    engine.dispose()
