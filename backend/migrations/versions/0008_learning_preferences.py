"""Persist the account's learning interface preference (not a paid entitlement)."""
from alembic import op
import sqlalchemy as sa

revision = "0008_learning_preferences"
down_revision = "0007_coach_conversations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_learning_preferences",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("preferred_mode", sa.String(16), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("preferred_mode IN ('basic', 'coach')", name="ck_learning_mode"),
    )


def downgrade() -> None:
    op.drop_table("user_learning_preferences")
