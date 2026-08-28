from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from .db import get_db
from .models import (
    AssessmentAttempt,
    AuthSession,
    Invitation,
    LearningSession,
    PrivacyAuditEvent,
    QuestionRequest,
    User,
)
from .schemas import DeleteAccountIn, DeleteAccountOut, InviteLoginIn, UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

SESSION_COOKIE = "amajia_session"
CURRENT_PRIVACY_VERSION = "2026-08-28-v1"
SESSION_DAYS = 14


class AuthError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


def normalize_code(value: str) -> str:
    return "".join(value.strip().upper().split())


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def has_expired(value: datetime | None) -> bool:
    if value is None:
        return False
    aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return aware <= utc_now()


def set_session_cookie(response: Response, token: str) -> None:
    production = os.getenv("APP_ENV", "development") == "production"
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=production,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="lax")


def session_for_token(db: Session, token: str | None) -> AuthSession | None:
    if not token:
        return None
    session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == hash_secret(token))
    )
    if session is None or session.revoked_at is not None or has_expired(session.expires_at):
        return None
    return session


def require_current_user(
    amajia_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    session = session_for_token(db, amajia_session)
    if session is None:
        raise AuthError(401, "AUTH_REQUIRED", "请先使用内部测试邀请码进入阿嬷学院")
    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        raise AuthError(401, "SESSION_INVALID", "登录状态已经失效，请重新进入")
    if user.consent_version != CURRENT_PRIVACY_VERSION:
        raise AuthError(403, "PRIVACY_CONSENT_OUTDATED", "隐私说明已经更新，请重新阅读并使用邀请码进入")
    return user


def require_content_admin(user: User = Depends(require_current_user)) -> User:
    if user.role not in ("content_admin", "super_admin"):
        raise AuthError(403, "ADMIN_ROLE_REQUIRED", "当前账号没有课程审核权限")
    return user


def seed_development_invitations(db: Session) -> None:
    if os.getenv("APP_ENV", "development") == "production":
        return
    seeds = (
        (
            os.getenv("LEARNER_INVITE_CODE", "INVITE_CODE_REMOVED"),
            "本地学习测试账号",
            "learner",
            "amajia-v040-local-test-user",
        ),
        (
            os.getenv("ADMIN_INVITE_CODE", "INVITE_CODE_REMOVED"),
            "本地内容管理员",
            "content_admin",
            None,
        ),
    )
    for raw_code, label, role, legacy_key in seeds:
        code_hash = hash_secret(normalize_code(raw_code))
        if db.scalar(select(Invitation).where(Invitation.code_hash == code_hash)):
            continue
        legacy_user = (
            db.scalar(select(User).where(User.external_key == legacy_key))
            if legacy_key
            else None
        )
        if legacy_user:
            legacy_user.role = role
            legacy_user.status = "active"
        db.add(
            Invitation(
                code_hash=code_hash,
                label=label,
                role=role,
                claimed_by_user_id=legacy_user.id if legacy_user else None,
                claimed_at=utc_now() if legacy_user else None,
            )
        )
    db.commit()


@router.post("/invite-login", response_model=UserOut)
def invite_login(payload: InviteLoginIn, response: Response, db: Session = Depends(get_db)):
    if not payload.consent_accepted or payload.consent_version != CURRENT_PRIVACY_VERSION:
        raise AuthError(422, "PRIVACY_CONSENT_REQUIRED", "请先阅读并同意当前版本的隐私说明")
    code_hash = hash_secret(normalize_code(payload.invitation_code))
    invitation = db.scalar(select(Invitation).where(Invitation.code_hash == code_hash))
    if invitation is None or not invitation.active or has_expired(invitation.expires_at):
        raise AuthError(401, "INVITATION_INVALID", "邀请码无效或已经停用，请联系测试负责人")

    user = db.get(User, invitation.claimed_by_user_id) if invitation.claimed_by_user_id else None
    if user is None:
        user = User(
            external_key=f"invite-{code_hash[:32]}",
            display_name=payload.display_name,
            role=invitation.role,
            status="active",
        )
        db.add(user)
        db.flush()
        invitation.claimed_by_user_id = user.id
        invitation.claimed_at = utc_now()
    elif user.status != "active":
        raise AuthError(403, "ACCOUNT_DISABLED", "这个测试账号已经停用")
    else:
        user.display_name = payload.display_name

    user.consent_version = payload.consent_version
    user.consented_at = utc_now()
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            token_hash=hash_secret(token),
            user_id=user.id,
            expires_at=utc_now() + timedelta(days=SESSION_DAYS),
        )
    )
    db.commit()
    db.refresh(user)
    set_session_cookie(response, token)
    return user


@router.get("/me", response_model=UserOut)
def current_user(user: User = Depends(require_current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    amajia_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    session = session_for_token(db, amajia_session)
    if session:
        session.revoked_at = utc_now()
        db.commit()
    clear_session_cookie(response)


@router.delete("/me", response_model=DeleteAccountOut)
def delete_account(
    payload: DeleteAccountIn,
    response: Response,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    if not hmac.compare_digest(
        payload.confirmation.strip().encode("utf-8"),
        "删除我的学习数据".encode("utf-8"),
    ):
        raise AuthError(422, "DELETE_CONFIRMATION_REQUIRED", "请输入“删除我的学习数据”完成确认")

    receipt = secrets.token_hex(12)
    db.add(
        PrivacyAuditEvent(
            event="account_deleted",
            anonymous_ref=receipt,
            consent_version=user.consent_version,
        )
    )
    db.execute(
        update(Invitation)
        .where(Invitation.claimed_by_user_id == user.id)
        .values(active=False, claimed_by_user_id=None)
    )
    db.execute(delete(AssessmentAttempt).where(AssessmentAttempt.user_id == user.id))
    db.execute(delete(QuestionRequest).where(QuestionRequest.user_id == user.id))
    db.execute(delete(LearningSession).where(LearningSession.user_id == user.id))
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.delete(user)
    db.commit()
    clear_session_cookie(response)
    return DeleteAccountOut(deleted=True, receipt=receipt)
