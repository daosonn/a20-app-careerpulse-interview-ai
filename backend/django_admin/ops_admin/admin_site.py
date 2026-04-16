from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.contrib.admin import AdminSite
from django.urls import NoReverseMatch, reverse
from django.utils import timezone

from . import admin as ops_admin
from .models import (
    InterviewSession,
    PlatformUser,
    ResumeUploadRecord,
    SuggestedJobRecord,
    UserActivityLog,
)


class OpsAdminSite(AdminSite):
    site_header = "AI Interview Platform Operations"
    site_title = "Operations Admin"
    index_title = "Operations Control Center"
    index_template = "admin/index.html"
    site_url = None

    def _changelist_url(self, model: type) -> str:
        meta = model._meta
        try:
            return reverse(f"{self.name}:{meta.app_label}_{meta.model_name}_changelist")
        except NoReverseMatch:
            return "#"

    def _safe_count(self, model: type, **filters: Any) -> int:
        try:
            if filters:
                return model.objects.filter(**filters).count()
            return model.objects.count()
        except Exception:
            return 0

    def _recent_activities(self) -> list[dict[str, Any]]:
        try:
            activity_rows = (
                UserActivityLog.objects.select_related("user")
                .order_by("-created_at")[:8]
            )
        except Exception:
            return []

        items: list[dict[str, Any]] = []
        for row in activity_rows:
            details = row.details
            if isinstance(details, dict):
                details_text = ", ".join([f"{k}: {v}" for k, v in list(details.items())[:3]])
            else:
                details_text = ""
            items.append(
                {
                    "event": row.event_type.replace("_", " ").title(),
                    "user": row.user.email,
                    "when": row.created_at,
                    "details": details_text,
                }
            )
        return items

    def _quick_links(self) -> list[dict[str, str]]:
        return [
            {
                "label": "Users",
                "description": "Accounts, profile completeness, preferences",
                "url": self._changelist_url(PlatformUser),
                "accent": "primary",
            },
            {
                "label": "Interview Sessions",
                "description": "Review session quality, status, and outcomes",
                "url": self._changelist_url(InterviewSession),
                "accent": "success",
            },
            {
                "label": "Resume Uploads",
                "description": "Track CV ingestion and processing health",
                "url": self._changelist_url(ResumeUploadRecord),
                "accent": "warning",
            },
            {
                "label": "Suggested Jobs",
                "description": "Audit recommendation output and relevance",
                "url": self._changelist_url(SuggestedJobRecord),
                "accent": "neutral",
            },
            {
                "label": "Activity Logs",
                "description": "Inspect user actions for support and ops",
                "url": self._changelist_url(UserActivityLog),
                "accent": "danger",
            },
        ]

    def each_context(self, request):
        context = super().each_context(request)

        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        one_day_ago = now - timedelta(hours=24)

        total_users = self._safe_count(PlatformUser)
        onboarded_users = self._safe_count(PlatformUser, is_onboarded=True)
        active_7d = self._safe_count(PlatformUser, last_activity_at__gte=seven_days_ago)

        onboarding_rate = 0
        if total_users:
            onboarding_rate = round((onboarded_users / total_users) * 100)

        context["dashboard_kpis"] = [
            {
                "label": "Total Users",
                "value": f"{total_users:,}",
                "hint": "All registered platform users",
            },
            {
                "label": "Onboarded Users",
                "value": f"{onboarded_users:,}",
                "hint": f"{onboarding_rate}% completed onboarding",
            },
            {
                "label": "Active (7d)",
                "value": f"{active_7d:,}",
                "hint": "Users with recent platform activity",
            },
            {
                "label": "Interviews In Progress",
                "value": str(self._safe_count(InterviewSession, status="in_progress")),
                "hint": "Sessions currently ongoing",
            },
            {
                "label": "Completed Interviews (7d)",
                "value": str(
                    self._safe_count(
                        InterviewSession,
                        status="completed",
                        ended_at__gte=seven_days_ago,
                    )
                ),
                "hint": "Closed sessions in the last week",
            },
            {
                "label": "Upload Issues",
                "value": str(
                    self._safe_count(
                        ResumeUploadRecord,
                        status__in=["pending", "failed"],
                    )
                ),
                "hint": "Resume records requiring attention",
            },
            {
                "label": "Active Job Suggestions",
                "value": str(self._safe_count(SuggestedJobRecord, is_active=True)),
                "hint": "Recommendations currently active",
            },
            {
                "label": "Activity Events (24h)",
                "value": str(self._safe_count(UserActivityLog, created_at__gte=one_day_ago)),
                "hint": "Recent tracked events",
            },
        ]

        context["dashboard_quick_links"] = self._quick_links()
        context["dashboard_recent_activities"] = self._recent_activities()
        return context

    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label)

        model_order = {
            "platformuser": 0,
            "interviewsession": 1,
            "resumeuploadrecord": 2,
            "educationbackground": 3,
            "suggestedjobrecord": 4,
            "useractivitylog": 5,
        }

        for app in app_list:
            app["models"].sort(
                key=lambda m: model_order.get(m.get("object_name", "").lower(), 999)
            )

        app_priority = {
            "Operations Admin": 0,
            "Authentication and Authorization": 1,
        }
        app_list.sort(key=lambda a: app_priority.get(a.get("name", ""), 999))
        return app_list


ops_admin_site = OpsAdminSite(name="admin")
ops_admin.register_admin_models(ops_admin_site)
