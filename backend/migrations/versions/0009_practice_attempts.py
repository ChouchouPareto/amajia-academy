"""Add versioned teach-back submissions without changing course completion."""
from alembic import op
import sqlalchemy as sa

revision = "0009_practice_attempts"
down_revision = "0008_learning_preferences"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "practice_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(80), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("feedback", sa.Text()),
        sa.Column("criteria", sa.JSON(), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("session_id", "attempt_no", name="uq_practice_attempt"),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_practice_key"),
    )
    for name in ("user_id", "session_id", "status"):
        op.create_index(f"ix_practice_attempts_{name}", "practice_attempts", [name])


def downgrade():
    op.drop_table("practice_attempts")
