"""add coach conversations

Revision ID: 0007_coach_conversations
Revises: 0006_media_assets
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_coach_conversations"
down_revision = "0006_media_assets"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("coach_conversations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("title", sa.String(120), nullable=False), sa.Column("status", sa.String(24), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_coach_conversations_user_id", "coach_conversations", ["user_id"])
    op.create_index("ix_coach_conversations_status", "coach_conversations", ["status"])
    with op.batch_alter_table("question_requests") as batch:
        batch.add_column(sa.Column("conversation_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_question_conversation", "coach_conversations", ["conversation_id"], ["id"])
        batch.create_index("ix_question_requests_conversation_id", ["conversation_id"])

def downgrade() -> None:
    with op.batch_alter_table("question_requests") as batch:
        batch.drop_index("ix_question_requests_conversation_id")
        batch.drop_column("conversation_id")
    op.drop_table("coach_conversations")
