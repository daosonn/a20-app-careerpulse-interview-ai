"""add interview preferences

Revision ID: 20260425_0003
Revises: 20260425_0002
Create Date: 2026-04-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260425_0003"
down_revision: Union[str, None] = "20260425_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interviews", sa.Column("is_stress_test", sa.Boolean(), nullable=True, server_default=sa.false()))
    op.add_column("interviews", sa.Column("question_count", sa.Integer(), nullable=True, server_default="5"))


def downgrade() -> None:
    op.drop_column("interviews", "question_count")
    op.drop_column("interviews", "is_stress_test")
