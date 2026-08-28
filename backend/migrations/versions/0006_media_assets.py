"""add reviewed media assets

Revision ID: 0006_media_assets
Revises: 0005_knowledge_index
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_media_assets"
down_revision = "0005_knowledge_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_version_id", sa.Integer(), sa.ForeignKey("course_versions.id"), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("url", sa.String(length=800), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=800), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("alt_text", sa.String(length=300), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("copyright_owner", sa.String(length=180), nullable=False),
        sa.Column("license_scope", sa.String(length=240), nullable=False),
        sa.Column("license_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_status", sa.String(length=24), nullable=False, server_default="draft"),
        sa.Column("reviewer", sa.String(length=120), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_media_assets_course_version_id", "media_assets", ["course_version_id"])
    op.create_index("ix_media_assets_step_index", "media_assets", ["step_index"])
    op.create_index("ix_media_assets_media_type", "media_assets", ["media_type"])
    op.create_index("ix_media_assets_review_status", "media_assets", ["review_status"])


def downgrade() -> None:
    op.drop_table("media_assets")
