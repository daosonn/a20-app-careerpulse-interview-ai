"""initial schema

Revision ID: 20260425_0001
Revises:
Create Date: 2026-04-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260425_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("avatar", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("last_cv_uploaded_at", sa.DateTime(), nullable=True),
        sa.Column("last_profile_update_at", sa.DateTime(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(), nullable=True),
        sa.Column("cv_text", sa.Text(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("is_onboarded", sa.Boolean(), nullable=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("dob", sa.String(), nullable=True),
        sa.Column("current_position", sa.String(), nullable=True),
        sa.Column("preferred_language", sa.String(), nullable=True),
        sa.Column("difficulty", sa.String(), nullable=True),
        sa.Column("ai_persona", sa.String(), nullable=True),
        sa.Column("availability", sa.String(), nullable=True),
        sa.Column("default_interview_type", sa.String(), nullable=True),
        sa.Column("stress_test_default", sa.Boolean(), nullable=True),
        sa.Column("auto_read_questions", sa.Boolean(), nullable=True),
        sa.Column("questions_per_session", sa.Integer(), nullable=True),
        sa.Column("ui_language", sa.String(), nullable=True),
        sa.Column("theme", sa.String(), nullable=True),
        sa.Column("email_reminders", sa.Boolean(), nullable=True),
        sa.Column("ai_suggestions", sa.Boolean(), nullable=True),
        sa.Column("security_alerts", sa.Boolean(), nullable=True),
        sa.Column("public_profile", sa.Boolean(), nullable=True),
        sa.Column("anonymous_practice", sa.Boolean(), nullable=True),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "educations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("school", sa.String(), nullable=False),
        sa.Column("degree", sa.String(), nullable=True),
        sa.Column("field", sa.String(), nullable=True),
        sa.Column("year", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_educations_id"), "educations", ["id"], unique=False)

    op.create_table(
        "interviews",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("cv_text", sa.Text(), nullable=True),
        sa.Column("jd_text", sa.Text(), nullable=True),
        sa.Column("interview_type", sa.String(), nullable=True),
        sa.Column("language", sa.String(), nullable=True),
        sa.Column("transcript", sa.JSON(), nullable=True),
        sa.Column("evaluations", sa.JSON(), nullable=True),
        sa.Column("final_report", sa.Text(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("predicted_questions", sa.JSON(), nullable=True),
        sa.Column("pending_questions", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_interviews_id"), "interviews", ["id"], unique=False)

    op.create_table(
        "resume_uploads",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_name", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("parsed_skills", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_resume_uploads_id"), "resume_uploads", ["id"], unique=False)
    op.create_index(op.f("ix_resume_uploads_user_id"), "resume_uploads", ["user_id"], unique=False)

    op.create_table(
        "suggested_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("fit_score", sa.Integer(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_suggested_jobs_id"), "suggested_jobs", ["id"], unique=False)
    op.create_index(op.f("ix_suggested_jobs_user_id"), "suggested_jobs", ["user_id"], unique=False)

    op.create_table(
        "user_activities",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_user_activities_event_type"), "user_activities", ["event_type"], unique=False)
    op.create_index(op.f("ix_user_activities_id"), "user_activities", ["id"], unique=False)
    op.create_index(op.f("ix_user_activities_user_id"), "user_activities", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_activities_user_id"), table_name="user_activities")
    op.drop_index(op.f("ix_user_activities_id"), table_name="user_activities")
    op.drop_index(op.f("ix_user_activities_event_type"), table_name="user_activities")
    op.drop_table("user_activities")
    op.drop_index(op.f("ix_suggested_jobs_user_id"), table_name="suggested_jobs")
    op.drop_index(op.f("ix_suggested_jobs_id"), table_name="suggested_jobs")
    op.drop_table("suggested_jobs")
    op.drop_index(op.f("ix_resume_uploads_user_id"), table_name="resume_uploads")
    op.drop_index(op.f("ix_resume_uploads_id"), table_name="resume_uploads")
    op.drop_table("resume_uploads")
    op.drop_index(op.f("ix_interviews_id"), table_name="interviews")
    op.drop_table("interviews")
    op.drop_index(op.f("ix_educations_id"), table_name="educations")
    op.drop_table("educations")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
