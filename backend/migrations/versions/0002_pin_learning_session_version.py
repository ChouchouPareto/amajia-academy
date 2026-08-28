"""pin learning sessions to a course version

Revision ID: 0002_pin_sessions
Revises: 0001_content_review
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_pin_sessions"
down_revision = "0001_content_review"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("learning_sessions") as batch:
        batch.add_column(sa.Column("course_version_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_learning_sessions_course_version", "course_versions", ["course_version_id"], ["id"])
        batch.create_index("ix_learning_sessions_course_version_id", ["course_version_id"])


def downgrade() -> None:
    with op.batch_alter_table("learning_sessions") as batch:
        batch.drop_index("ix_learning_sessions_course_version_id")
        batch.drop_constraint("fk_learning_sessions_course_version", type_="foreignkey")
        batch.drop_column("course_version_id")
