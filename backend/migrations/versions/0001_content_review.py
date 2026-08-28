"""add content review and version snapshots

Revision ID: 0001_content_review
Revises:
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_content_review"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("course_versions") as batch:
        batch.add_column(sa.Column("title", sa.String(length=180), nullable=True))
        batch.add_column(sa.Column("summary", sa.String(length=300), nullable=True))
        batch.add_column(sa.Column("risk_level", sa.String(length=8), nullable=True))
        batch.add_column(sa.Column("disclaimer", sa.Text(), nullable=True))
        batch.add_column(sa.Column("conclusion", sa.Text(), nullable=True))
        batch.add_column(sa.Column("steps", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("quiz", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("created_by", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "content_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_version_id", sa.Integer(), nullable=False),
        sa.Column("review_type", sa.String(length=24), nullable=False),
        sa.Column("reviewer", sa.String(length=120), nullable=False),
        sa.Column("decision", sa.String(length=24), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_version_id"], ["course_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_reviews_course_version_id", "content_reviews", ["course_version_id"])
    op.create_index("ix_content_reviews_review_type", "content_reviews", ["review_type"])

    op.create_table(
        "content_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_version_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=False),
        sa.Column("idempotency_key", sa.String(length=80), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_version_id"], ["course_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_audit_events_action", "content_audit_events", ["action"])
    op.create_index("ix_content_audit_events_course_version_id", "content_audit_events", ["course_version_id"])
    op.create_index("ix_content_audit_events_idempotency_key", "content_audit_events", ["idempotency_key"], unique=True)


def downgrade() -> None:
    op.drop_table("content_audit_events")
    op.drop_table("content_reviews")
    with op.batch_alter_table("course_versions") as batch:
        for name in ("suspended_at", "published_at", "created_by", "quiz", "steps", "conclusion", "disclaimer", "risk_level", "summary", "title"):
            batch.drop_column(name)
