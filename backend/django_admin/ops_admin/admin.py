from __future__ import annotations

import json
from typing import Type

from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered
from django.db.models import QuerySet
from django.utils.html import format_html

from .models import (
    EducationBackground,
    InterviewSession,
    PlatformUser,
    ResumeUploadRecord,
    SuggestedJobRecord,
    UserActivityLog,
)


def _compact_json(value: object, max_len: int = 200) -> str:
    if value is None:
        return ""
    text = json.dumps(value, ensure_ascii=True)
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}..."


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


class PlatformUserAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "display_name",
        "is_onboarded",
        "profile_completeness_badge",
        "resume_count",
        "education_count",
        "interview_count",
        "last_activity_at",
        "updated_at",
    )
    list_filter = (
        "is_onboarded",
        "preferred_language",
        "difficulty",
        "default_interview_type",
        "theme",
        "public_profile",
        "anonymous_practice",
        "created_at",
        "updated_at",
        "last_activity_at",
    )
    search_fields = (
        "email",
        "name",
        "full_name",
        "current_position",
        "cv_text",
    )
    search_help_text = "Search by email, user name, full name, target position, or CV text"
    ordering = ("-updated_at", "-id")
    date_hierarchy = "updated_at"
    list_per_page = 50
    list_display_links = ("email", "display_name")
    save_on_top = True
    show_facets = admin.ShowFacets.ALWAYS
    empty_value_display = "-"
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "last_cv_uploaded_at",
        "last_profile_update_at",
        "last_activity_at",
        "profile_completeness_summary",
        "resume_count",
        "education_count",
        "interview_count",
    )
    inlines = [EducationInline, ResumeUploadInline, SuggestedJobInline, InterviewInline]

    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "id",
                    "email",
                    "name",
                    "full_name",
                    "avatar",
                    "is_onboarded",
                ),
                "description": "Core account identity and onboarding state.",
                "classes": ("wide",),
            },
        ),
        (
            "Profile",
            {
                "fields": (
                    "current_position",
                    "dob",
                    "skills",
                    "cv_text",
                ),
                "description": "Profile information extracted from CV and updated by user.",
                "classes": ("wide",),
            },
        ),
        (
            "Interview Preferences",
            {
                "fields": (
                    "preferred_language",
                    "difficulty",
                    "ai_persona",
                    "availability",
                    "default_interview_type",
                    "stress_test_default",
                    "auto_read_questions",
                    "questions_per_session",
                ),
                "classes": ("wide",),
            },
        ),
        (
            "Account Settings",
            {
                "fields": (
                    "ui_language",
                    "theme",
                    "email_reminders",
                    "ai_suggestions",
                    "security_alerts",
                    "public_profile",
                    "anonymous_practice",
                ),
                "classes": ("wide",),
            },
        ),
        (
            "Operational Insights",
            {
                "fields": (
                    "profile_completeness_summary",
                    "resume_count",
                    "education_count",
                    "interview_count",
                    "last_cv_uploaded_at",
                    "last_profile_update_at",
                    "last_activity_at",
                    "created_at",
                    "updated_at",
                ),
                "description": "Read-only operational indicators for support and operations teams.",
                "classes": ("wide",),
            },
        ),
    )

    @admin.display(description="Name")
    def display_name(self, obj: PlatformUser) -> str:
        return obj.full_name or obj.name or "-"

    @admin.display(description="Profile")
    def profile_completeness_badge(self, obj: PlatformUser) -> str:
        score = obj.profile_completeness_score
        if score >= 80:
            status = "good"
        elif score >= 50:
            status = "warning"
        else:
            status = "danger"
        return format_html('<span class="ops-badge ops-badge-{}">{}%</span>', status, score)

    @admin.display(description="Onboarding")
    def is_onboarded(self, obj: PlatformUser) -> str:
        status = "good" if obj.is_onboarded else "warning"
        label = "Completed" if obj.is_onboarded else "Pending"
        return format_html('<span class="ops-badge ops-badge-{}">{}</span>', status, label)

    @admin.display(description="Completeness")
    def profile_completeness_summary(self, obj: PlatformUser) -> str:
        return f"{obj.profile_completeness_score}%"

    @admin.display(description="CV uploads")
    def resume_count(self, obj: PlatformUser) -> int:
        return obj.resume_upload_records.count()

    @admin.display(description="Education")
    def education_count(self, obj: PlatformUser) -> int:
        return obj.education_records.count()

    @admin.display(description="Interviews")
    def interview_count(self, obj: PlatformUser) -> int:
        return obj.interview_sessions.count()

    def get_queryset(self, request) -> QuerySet[PlatformUser]:
        queryset = super().get_queryset(request)
        return queryset.prefetch_related(
            "resume_upload_records",
            "education_records",
            "interview_sessions",
        )


class EducationBackgroundAdmin(admin.ModelAdmin):
    list_display = ("id", "user_email", "school", "degree", "field", "year", "updated_at")
    list_filter = ("degree", "year", "created_at", "updated_at")
    search_fields = ("user__email", "user__full_name", "school", "degree", "field")
    search_help_text = "Search by user, school, degree, or field"
    ordering = ("-updated_at", "-id")
    date_hierarchy = "updated_at"
    list_display_links = ("id", "school")
    save_on_top = True
    empty_value_display = "-"
    list_select_related = ("user",)
    autocomplete_fields = ("user",)

    fieldsets = (
        ("Education Record", {"fields": ("user", "school", "degree", "field", "year")}),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="User")
    def user_email(self, obj: EducationBackground) -> str:
        return obj.user.email


class ResumeUploadRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "file_name",
        "source",
        "status_badge",
        "skill_count",
        "created_at",
        "processed_at",
    )
    list_filter = ("source", "status", "created_at", "processed_at")
    search_fields = ("user__email", "user__full_name", "file_name", "raw_text")
    search_help_text = "Search by user, file name, or CV content"
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    list_display_links = ("id", "file_name")
    save_on_top = True
    empty_value_display = "-"
    list_select_related = ("user",)
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at", "processed_at")

    fieldsets = (
        ("Record", {"fields": ("user", "file_name", "source", "status"), "classes": ("wide",)}),
        ("Content", {"fields": ("parsed_skills", "raw_text"), "classes": ("wide",)}),
        ("Audit", {"fields": ("created_at", "processed_at", "updated_at")}),
    )

    @admin.display(description="User")
    def user_email(self, obj: ResumeUploadRecord) -> str:
        return obj.user.email

    @admin.display(description="Skills")
    def skill_count(self, obj: ResumeUploadRecord) -> int:
        if isinstance(obj.parsed_skills, list):
            return len(obj.parsed_skills)
        return 0

    @admin.display(description="Status")
    def status_badge(self, obj: ResumeUploadRecord) -> str:
        status_value = (obj.status or "unknown").lower()
        variant = {
            "processed": "good",
            "pending": "warning",
            "failed": "danger",
        }.get(status_value, "neutral")
        return format_html(
            '<span class="ops-badge ops-badge-{}">{}</span>',
            variant,
            status_value.capitalize(),
        )


class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "interview_type",
        "status_badge",
        "language",
        "score_badge",
        "turn_count",
        "created_at",
        "ended_at",
    )
    list_filter = ("status", "interview_type", "language", "created_at", "ended_at")
    search_fields = ("user__email", "user__full_name", "final_report", "cv_text", "jd_text")
    search_help_text = "Search by user, interview context, or report content"
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    list_display_links = ("id", "user_email")
    save_on_top = True
    empty_value_display = "-"
    list_select_related = ("user",)
    autocomplete_fields = ("user",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "ended_at",
        "transcript_preview",
        "evaluations_preview",
        "predicted_questions_preview",
    )

    fieldsets = (
        (
            "Session",
            {
                "fields": ("user", "interview_type", "language", "status", "score"),
                "description": "Primary session metadata for support and quality operations.",
                "classes": ("wide",),
            },
        ),
        (
            "Inputs",
            {"fields": ("cv_text", "jd_text", "predicted_questions"), "classes": ("wide",)},
        ),
        (
            "Outputs",
            {"fields": ("final_report", "transcript", "evaluations"), "classes": ("wide",)},
        ),
        (
            "Quick Inspect",
            {
                "fields": (
                    "predicted_questions_preview",
                    "transcript_preview",
                    "evaluations_preview",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Audit",
            {"fields": ("created_at", "updated_at", "ended_at")},
        ),
    )

    @admin.display(description="User")
    def user_email(self, obj: InterviewSession) -> str:
        return obj.user.email

    @admin.display(description="Turns")
    def turn_count(self, obj: InterviewSession) -> int:
        if isinstance(obj.transcript, list):
            return len(obj.transcript)
        return 0

    @admin.display(description="Status")
    def status_badge(self, obj: InterviewSession) -> str:
        status_value = (obj.status or "unknown").lower()
        variant = {
            "completed": "good",
            "in_progress": "warning",
            "setup": "neutral",
        }.get(status_value, "neutral")
        return format_html(
            '<span class="ops-badge ops-badge-{}">{}</span>',
            variant,
            status_value.replace("_", " ").title(),
        )

    @admin.display(description="Score")
    def score_badge(self, obj: InterviewSession) -> str:
        score = obj.score or 0
        if score >= 85:
            variant = "good"
        elif score >= 60:
            variant = "warning"
        else:
            variant = "danger"
        return format_html('<span class="ops-badge ops-badge-{}">{}</span>', variant, score)

    @admin.display(description="Transcript preview")
    def transcript_preview(self, obj: InterviewSession) -> str:
        return _compact_json(obj.transcript, max_len=800)

    @admin.display(description="Evaluations preview")
    def evaluations_preview(self, obj: InterviewSession) -> str:
        return _compact_json(obj.evaluations, max_len=800)

    @admin.display(description="Predicted questions preview")
    def predicted_questions_preview(self, obj: InterviewSession) -> str:
        return _compact_json(obj.predicted_questions, max_len=800)


class SuggestedJobRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "title",
        "company",
        "industry",
        "fit_score",
        "source",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "source", "industry", "created_at", "updated_at")
    search_fields = ("user__email", "user__full_name", "title", "company", "reason")
    search_help_text = "Search by user, role title, company, or recommendation reason"
    ordering = ("-updated_at", "-id")
    date_hierarchy = "updated_at"
    list_display_links = ("id", "title")
    save_on_top = True
    empty_value_display = "-"
    list_select_related = ("user",)
    autocomplete_fields = ("user",)

    fieldsets = (
        (
            "Recommendation",
            {
                "fields": (
                    "user",
                    "title",
                    "company",
                    "industry",
                    "fit_score",
                    "source",
                    "is_active",
                ),
                "classes": ("wide",),
            },
        ),
        ("Rationale", {"fields": ("reason",), "classes": ("wide",)}),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="User")
    def user_email(self, obj: SuggestedJobRecord) -> str:
        return obj.user.email


class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user_email", "event_type", "details_preview", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("user__email", "user__full_name", "event_type")
    search_help_text = "Search by user or event type"
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    list_display_links = ("id", "event_type")
    save_on_top = True
    empty_value_display = "-"
    list_select_related = ("user",)
    readonly_fields = ("created_at",)
    autocomplete_fields = ("user",)

    fieldsets = (
        (
            "Activity Event",
            {
                "fields": (
                    "user",
                    "event_type",
                    "details",
                    "created_at",
                ),
                "classes": ("wide",),
            },
        ),
    )

    @admin.display(description="User")
    def user_email(self, obj: UserActivityLog) -> str:
        return obj.user.email

    @admin.display(description="Details")
    def details_preview(self, obj: UserActivityLog) -> str:
        return _compact_json(obj.details, max_len=180)


def register_admin_models(site: Type[admin.AdminSite] | admin.AdminSite) -> None:
    registrations = (
        (PlatformUser, PlatformUserAdmin),
        (EducationBackground, EducationBackgroundAdmin),
        (ResumeUploadRecord, ResumeUploadRecordAdmin),
        (InterviewSession, InterviewSessionAdmin),
        (SuggestedJobRecord, SuggestedJobRecordAdmin),
        (UserActivityLog, UserActivityLogAdmin),
    )

    for model, admin_class in registrations:
        try:
            site.register(model, admin_class)
        except AlreadyRegistered:
            continue


register_admin_models(admin.site)
