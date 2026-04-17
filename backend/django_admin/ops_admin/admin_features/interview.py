from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html

from ..models import InterviewSession
from .shared import badge_html, datetime_html, json_preview_html


class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "interview_type_badge",
        "status_badge",
        "language",
        "score_badge",
        "turn_count",
        "created_at_display",
        "ended_at_display",
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
            {"fields": ("created_at", "updated_at", "ended_at"), "classes": ("ops-audit-fieldset",)},
        ),
    )

    @admin.display(description="User")
    def user_email(self, obj: InterviewSession) -> str:
        return obj.user.email

    @admin.display(description="Type")
    def interview_type_badge(self, obj: InterviewSession) -> str:
        itype = obj.interview_type or "unknown"
        return badge_html("ai", itype.replace("_", " ").title())

    @admin.display(description="Turns")
    def turn_count(self, obj: InterviewSession) -> str:
        count = len(obj.transcript) if isinstance(obj.transcript, list) else 0
        return format_html('<span class="ops-col-numeric">{}</span>', count)

    @admin.display(description="Status")
    def status_badge(self, obj: InterviewSession) -> str:
        status_value = (obj.status or "unknown").lower()
        variant = {
            "completed": "good",
            "in_progress": "warning",
            "setup": "neutral",
        }.get(status_value, "neutral")
        extra = " ops-badge-dot" if status_value == "in_progress" else ""
        return badge_html(variant, status_value.replace("_", " ").title(), extra)

    @admin.display(description="Score")
    def score_badge(self, obj: InterviewSession) -> str:
        score = obj.score or 0
        if score >= 85:
            variant = "good"
        elif score >= 60:
            variant = "warning"
        else:
            variant = "danger"
        return badge_html(variant, str(score))

    @admin.display(description="Transcript preview")
    def transcript_preview(self, obj: InterviewSession) -> str:
        return json_preview_html(obj.transcript)

    @admin.display(description="Evaluations preview")
    def evaluations_preview(self, obj: InterviewSession) -> str:
        return json_preview_html(obj.evaluations)

    @admin.display(description="Predicted questions preview")
    def predicted_questions_preview(self, obj: InterviewSession) -> str:
        return json_preview_html(obj.predicted_questions)

    @admin.display(description="Created", ordering="created_at")
    def created_at_display(self, obj: InterviewSession) -> str:
        return datetime_html(obj.created_at)

    @admin.display(description="Ended", ordering="ended_at")
    def ended_at_display(self, obj: InterviewSession) -> str:
        return datetime_html(obj.ended_at)
