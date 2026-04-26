"""add interview turns

Revision ID: 20260425_0002
Revises: 20260425_0001
Create Date: 2026-04-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260425_0002"
down_revision: Union[str, None] = "20260425_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interview_turns",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("interview_id", sa.Integer(), sa.ForeignKey("interviews.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("turn_order", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("tip", sa.Text(), nullable=True),
        sa.Column("evaluation", sa.JSON(), nullable=True),
        sa.Column("audio_meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_interview_turns_id"), "interview_turns", ["id"], unique=False)
    op.create_index(op.f("ix_interview_turns_interview_id"), "interview_turns", ["interview_id"], unique=False)
    op.create_index(op.f("ix_interview_turns_user_id"), "interview_turns", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_interview_turns_user_id"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_interview_id"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_id"), table_name="interview_turns")
    op.drop_table("interview_turns")
