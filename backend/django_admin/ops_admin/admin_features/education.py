from __future__ import annotations

from django.contrib import admin

from ..models import EducationBackground
from .shared import datetime_html


class EducationBackgroundAdmin(admin.ModelAdmin):
    list_display = ("id", "user_email", "school", "degree", "field", "year", "updated_at_display")
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
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse", "ops-audit-fieldset")}),
    )
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="User")
    def user_email(self, obj: EducationBackground) -> str:
        return obj.user.email

    @admin.display(description="Updated", ordering="updated_at")
    def updated_at_display(self, obj: EducationBackground) -> str:
        return datetime_html(obj.updated_at)
