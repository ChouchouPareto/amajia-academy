"""add controlled AI answer trace

Revision ID: 0004_ai_answer_trace
Revises: 0003_invite_auth
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_ai_answer_trace"
down_revision = "0003_invite_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("question_requests") as batch:
        batch.add_column(sa.Column("answer", sa.Text(), nullable=True))
        batch.add_column(sa.Column("answer_mode", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("knowledge_refs", sa.JSON(), nullable=False, server_default="[]"))
        batch.add_column(sa.Column("model_provider", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("model_name", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("prompt_version", sa.String(length=40), nullable=True))
        batch.add_column(sa.Column("latency_ms", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_index("ix_question_requests_answer_mode", ["answer_mode"])


def downgrade() -> None:
    with op.batch_alter_table("question_requests") as batch:
        batch.drop_index("ix_question_requests_answer_mode")
        batch.drop_column("answered_at")
        batch.drop_column("latency_ms")
        batch.drop_column("prompt_version")
        batch.drop_column("model_name")
        batch.drop_column("model_provider")
        batch.drop_column("knowledge_refs")
        batch.drop_column("answer_mode")
        batch.drop_column("answer")
