"""add persistent knowledge index

Revision ID: 0005_knowledge_index
Revises: 0004_ai_answer_trace
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_knowledge_index"
down_revision = "0004_ai_answer_trace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "knowledge_index_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.String(length=80), sa.ForeignKey("lessons.id"), nullable=False),
        sa.Column("course_version_id", sa.Integer(), sa.ForeignKey("course_versions.id"), nullable=False),
        sa.Column("chunk_key", sa.String(length=80), nullable=False),
        sa.Column("domain", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("section", sa.String(length=120), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("disclaimer", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_refs", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("embedding_model", sa.String(length=120), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("course_version_id", "chunk_key", name="uq_knowledge_version_chunk"),
    )
    op.create_index("ix_knowledge_index_chunks_course_id", "knowledge_index_chunks", ["course_id"])
    op.create_index("ix_knowledge_index_chunks_course_version_id", "knowledge_index_chunks", ["course_version_id"])
    op.create_index("ix_knowledge_index_chunks_domain", "knowledge_index_chunks", ["domain"])
    op.create_index("ix_knowledge_index_chunks_active", "knowledge_index_chunks", ["active"])


def downgrade() -> None:
    op.drop_table("knowledge_index_chunks")
