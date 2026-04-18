from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html

from ..models import UserActivityLog
from .shared import badge_html, compact_json, datetime_html


class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user_email", "event_type_badge", "details_preview", "created_at_display")
    list_filter = ("event_type", "created_at")
    search_fields = ("user__email", "user__full_name", "event_type")
    search_help_text = "Search by user or event type"
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    list_display_links = ("id", "event_type_badge")
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

    @admin.display(description="Event")
    def event_type_badge(self, obj: UserActivityLog) -> str:
        return badge_html("info", obj.event_type.replace("_", " ").title())

    @admin.display(description="Details")
    def details_preview(self, obj: UserActivityLog) -> str:
        text = compact_json(obj.details, max_len=180)
        if not text:
            return "-"
        return format_html('<span class="ops-col-secondary">{}</span>', text)

    @admin.display(description="Created", ordering="created_at")
    def created_at_display(self, obj: UserActivityLog) -> str:
        return datetime_html(obj.created_at)
