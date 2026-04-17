from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html

from ..models import ResumeUploadRecord
from .shared import badge_html, datetime_html


class ResumeUploadRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "file_name",
        "source",
        "status_badge",
        "skill_count",
        "created_at_display",
        "processed_at_display",
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
        ("Audit", {"fields": ("created_at", "processed_at", "updated_at"), "classes": ("ops-audit-fieldset",)}),
    )

    @admin.display(description="User")
    def user_email(self, obj: ResumeUploadRecord) -> str:
        return obj.user.email

    @admin.display(description="Skills")
    def skill_count(self, obj: ResumeUploadRecord) -> str:
        count = len(obj.parsed_skills) if isinstance(obj.parsed_skills, list) else 0
        return format_html('<span class="ops-col-numeric">{}</span>', count)

    @admin.display(description="Status")
    def status_badge(self, obj: ResumeUploadRecord) -> str:
        status_value = (obj.status or "unknown").lower()
        variant = {
            "processed": "good",
            "pending": "warning",
            "failed": "danger",
        }.get(status_value, "neutral")
        extra = " ops-badge-dot" if status_value in ("pending", "failed") else ""
        return badge_html(variant, status_value.capitalize(), extra)

    @admin.display(description="Created", ordering="created_at")
    def created_at_display(self, obj: ResumeUploadRecord) -> str:
        return datetime_html(obj.created_at)

    @admin.display(description="Processed", ordering="processed_at")
    def processed_at_display(self, obj: ResumeUploadRecord) -> str:
        return datetime_html(obj.processed_at)
