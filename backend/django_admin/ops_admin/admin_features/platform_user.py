from __future__ import annotations

from django.contrib import admin
from django.db.models import QuerySet
from django.utils.html import format_html

from ..models import PlatformUser
from .inlines import EducationInline, InterviewInline, ResumeUploadInline, SuggestedJobInline
from .shared import badge_html, datetime_html


class PlatformUserAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "display_name",
        "onboarded_badge",
        "profile_completeness_badge",
        "resume_count",
        "education_count",
        "interview_count",
        "last_activity_display",
        "updated_at_display",
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
                "classes": ("wide", "ops-audit-fieldset"),
            },
        ),
    )

    @admin.display(description="Name")
    def display_name(self, obj: PlatformUser) -> str:
        name = obj.full_name or obj.name or "-"
        return format_html('<span class="ops-col-primary">{}</span>', name)

    @admin.display(description="Profile")
    def profile_completeness_badge(self, obj: PlatformUser) -> str:
        score = obj.profile_completeness_score
        if score >= 80:
            variant = "good"
        elif score >= 50:
            variant = "warning"
        else:
            variant = "danger"
        return badge_html(variant, f"{score}%")

    @admin.display(description="Onboarding")
    def onboarded_badge(self, obj: PlatformUser) -> str:
        if obj.is_onboarded:
            return badge_html("good", "Completed")
        return badge_html("warning", "Pending")

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

    @admin.display(description="Last active", ordering="last_activity_at")
    def last_activity_display(self, obj: PlatformUser) -> str:
        return datetime_html(obj.last_activity_at)

    @admin.display(description="Updated", ordering="updated_at")
    def updated_at_display(self, obj: PlatformUser) -> str:
        return datetime_html(obj.updated_at)

    def get_queryset(self, request) -> QuerySet[PlatformUser]:
        queryset = super().get_queryset(request)
        return queryset.prefetch_related(
            "resume_upload_records",
            "education_records",
            "interview_sessions",
        )
