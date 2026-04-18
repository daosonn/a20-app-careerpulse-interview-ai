from __future__ import annotations

from django.contrib import admin

from ..models import SuggestedJobRecord
from .shared import badge_html, datetime_html


class SuggestedJobRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "title",
        "company",
        "industry",
        "fit_score_badge",
        "source",
        "is_active_badge",
        "updated_at_display",
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
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse", "ops-audit-fieldset")}),
    )
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="User")
    def user_email(self, obj: SuggestedJobRecord) -> str:
        return obj.user.email

    @admin.display(description="Fit", ordering="fit_score")
    def fit_score_badge(self, obj: SuggestedJobRecord) -> str:
        score = obj.fit_score or 0
        if score >= 80:
            variant = "good"
        elif score >= 50:
            variant = "warning"
        else:
            variant = "danger"
        return badge_html(variant, str(score))

    @admin.display(description="Active")
    def is_active_badge(self, obj: SuggestedJobRecord) -> str:
        if obj.is_active:
            return badge_html("good", "Active")
        return badge_html("neutral", "Inactive")

    @admin.display(description="Updated", ordering="updated_at")
    def updated_at_display(self, obj: SuggestedJobRecord) -> str:
        return datetime_html(obj.updated_at)
