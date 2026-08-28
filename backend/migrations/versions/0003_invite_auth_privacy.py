"""add invitation auth sessions roles and privacy consent

Revision ID: 0003_invite_auth
Revises: 0002_pin_sessions
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_invite_auth"
down_revision = "0002_pin_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("role", sa.String(length=32), nullable=False, server_default="learner"))
        batch.add_column(sa.Column("status", sa.String(length=24), nullable=False, server_default="active"))
        batch.add_column(sa.Column("consent_version", sa.String(length=40), nullable=True))
        batch.add_column(sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_index("ix_users_role", ["role"])
        batch.create_index("ix_users_status", ["status"])

    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("claimed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["claimed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invitations_active", "invitations", ["active"])
    op.create_index("ix_invitations_claimed_by_user_id", "invitations", ["claimed_by_user_id"])
    op.create_index("ix_invitations_code_hash", "invitations", ["code_hash"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    op.create_table(
        "privacy_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event", sa.String(length=40), nullable=False),
        sa.Column("anonymous_ref", sa.String(length=64), nullable=False),
        sa.Column("consent_version", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_privacy_audit_events_anonymous_ref", "privacy_audit_events", ["anonymous_ref"])
    op.create_index("ix_privacy_audit_events_event", "privacy_audit_events", ["event"])


def downgrade() -> None:
    op.drop_table("privacy_audit_events")
    op.drop_table("auth_sessions")
    op.drop_table("invitations")
    with op.batch_alter_table("users") as batch:
        batch.drop_index("ix_users_status")
        batch.drop_index("ix_users_role")
        batch.drop_column("consented_at")
        batch.drop_column("consent_version")
        batch.drop_column("status")
        batch.drop_column("role")
