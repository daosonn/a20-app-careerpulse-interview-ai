from __future__ import annotations

from django.contrib import admin

from ..models import (
    EducationBackground,
    InterviewSession,
    ResumeUploadRecord,
    SuggestedJobRecord,
)


class EducationInline(admin.TabularInline):
    model = EducationBackground
    extra = 0
    show_change_link = True
    fields = ("school", "degree", "field", "year", "created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")
    classes = ("collapse",)


class ResumeUploadInline(admin.TabularInline):
    model = ResumeUploadRecord
    extra = 0
    show_change_link = True
    fields = ("file_name", "source", "status", "created_at", "processed_at")
    readonly_fields = ("created_at", "processed_at")
    classes = ("collapse",)


class SuggestedJobInline(admin.TabularInline):
    model = SuggestedJobRecord
    extra = 0
    show_change_link = True
    fields = ("title", "company", "industry", "fit_score", "source", "is_active", "updated_at")
    readonly_fields = ("updated_at",)
    classes = ("collapse",)


class InterviewInline(admin.TabularInline):
    model = InterviewSession
    extra = 0
    show_change_link = True
    fields = ("id", "interview_type", "language", "status", "score", "created_at", "ended_at")
    readonly_fields = ("id", "created_at", "ended_at")
    classes = ("collapse",)
