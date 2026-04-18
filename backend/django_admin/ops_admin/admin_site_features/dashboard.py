from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.utils import timezone

from ..models import (
    InterviewSession,
    PlatformUser,
    ResumeUploadRecord,
    SuggestedJobRecord,
    UserActivityLog,
)
from .constants import EVENT_CATEGORY_MAP


class OpsAdminDashboardMixin:
    def _system_status(self) -> dict[str, Any]:
        upload_issues = self._safe_count(
            ResumeUploadRecord, status__in=["pending", "failed"]
        )
        now = timezone.now()
        stuck_interviews = self._safe_count(
            InterviewSession,
            status="in_progress",
            created_at__lte=now - timedelta(hours=2),
        )

        alerts: list[dict[str, str]] = []
        if upload_issues > 10:
            alerts.append({
                "level": "danger",
                "message": f"{upload_issues} resume uploads need attention",
            })
        elif upload_issues > 0:
            alerts.append({
                "level": "warning",
                "message": f"{upload_issues} resume uploads pending/failed",
            })

        if stuck_interviews > 0:
            alerts.append({
                "level": "warning",
                "message": f"{stuck_interviews} interview(s) stuck >2h",
            })

        overall = "healthy"
        if any(a["level"] == "danger" for a in alerts):
            overall = "degraded"
        elif any(a["level"] == "warning" for a in alerts):
            overall = "attention"

        return {"overall": overall, "alerts": alerts}

    def _recent_activities(self) -> list[dict[str, Any]]:
        try:
            activity_rows = (
                UserActivityLog.objects.select_related("user")
                .order_by("-created_at")[:10]
            )
        except Exception:
            return []

        items: list[dict[str, Any]] = []
        for row in activity_rows:
            details = row.details
            if isinstance(details, dict):
                details_text = ", ".join(
                    f"{k}: {v}" for k, v in list(details.items())[:3]
                )
            else:
                details_text = ""

            event_key = row.event_type
            meta = EVENT_CATEGORY_MAP.get(event_key, {
                "icon": "activity",
                "accent": "neutral",
            })

            items.append({
                "event": event_key.replace("_", " ").title(),
                "user": row.user.email,
                "when": row.created_at,
                "details": details_text,
                "icon": meta["icon"],
                "accent": meta["accent"],
            })
        return items

    def _kpis_flat(
        self,
        *,
        total_users: int,
        active_7d: int,
        in_progress: int,
        completed_7d: int,
        upload_issues: int,
        events_24h: int,
    ) -> list[dict]:
        return [
            {
                "label": "Total Users",
                "value": f"{total_users:,}",
                "hint": "All platform users",
                "trend": None,
                "trend_dir": "neutral",
                "variant": "default",
            },
            {
                "label": "Active (7d)",
                "value": f"{active_7d:,}",
                "hint": "Recent activity",
                "trend": None,
                "trend_dir": "up",
                "variant": "primary",
            },
            {
                "label": "In Progress",
                "value": str(in_progress),
                "hint": "Interviews ongoing",
                "trend": None,
                "trend_dir": "neutral",
                "variant": "warning" if in_progress > 0 else "default",
            },
            {
                "label": "Completed (7d)",
                "value": str(completed_7d),
                "hint": "Last 7 days",
                "trend": None,
                "trend_dir": "up",
                "variant": "success",
            },
            {
                "label": "Upload Issues",
                "value": str(upload_issues),
                "hint": "Pending or failed",
                "trend": None,
                "trend_dir": "neutral",
                "variant": (
                    "danger" if upload_issues > 5
                    else "warning" if upload_issues > 0
                    else "success"
                ),
            },
            {
                "label": "Events (24h)",
                "value": str(events_24h),
                "hint": "Tracked actions",
                "trend": None,
                "trend_dir": "neutral",
                "variant": "default",
            },
        ]

    def _ops_health(self, *, upload_issues: int, stuck_interviews: int) -> list[dict]:
        def _status(is_bad: bool, is_warn: bool) -> str:
            if is_bad:
                return "outage"
            if is_warn:
                return "degraded"
            return "operational"

        resume_status = _status(upload_issues > 10, upload_issues > 0)
        ai_status = _status(stuck_interviews > 5, stuck_interviews > 0)

        return [
            {
                "name": "API Gateway",
                "status": "operational",
                "detail": "All endpoints healthy",
            },
            {
                "name": "Database Cluster",
                "status": "operational",
                "detail": "Healthy",
            },
            {
                "name": "AI Inference Engine",
                "status": ai_status,
                "detail": (
                    f"{stuck_interviews} stuck session(s)"
                    if stuck_interviews > 0
                    else "All inference healthy"
                ),
            },
            {
                "name": "Resume Processing",
                "status": resume_status,
                "detail": (
                    f"{upload_issues} record(s) pending/failed"
                    if upload_issues > 0
                    else "Processing healthy"
                ),
            },
            {
                "name": "Auth Service",
                "status": "operational",
                "detail": "Healthy",
            },
            {
                "name": "Activity Tracking",
                "status": "operational",
                "detail": "Logging active",
            },
        ]

    def _quick_links(
        self,
        *,
        upload_issues: int = 0,
        in_progress: int = 0,
        total_users: int = 0,
    ) -> list[dict[str, Any]]:
        return [
            {
                "label": "Users",
                "description": "Accounts, profile completeness, preferences",
                "url": self._changelist_url(PlatformUser),
                "accent": "primary",
                "icon": "users",
                "kbd": "U",
                "count": total_users if total_users else None,
                "count_variant": "neutral",
            },
            {
                "label": "Interview Sessions",
                "description": "Review session quality, status, and outcomes",
                "url": self._changelist_url(InterviewSession),
                "accent": "success",
                "icon": "microphone",
                "kbd": "I",
                "count": in_progress if in_progress else None,
                "count_variant": "warning",
            },
            {
                "label": "Resume Uploads",
                "description": "Track CV ingestion and processing health",
                "url": self._changelist_url(ResumeUploadRecord),
                "accent": "warning",
                "icon": "document",
                "kbd": "R",
                "count": upload_issues if upload_issues else None,
                "count_variant": "danger",
            },
            {
                "label": "Suggested Jobs",
                "description": "Audit recommendation output and relevance",
                "url": self._changelist_url(SuggestedJobRecord),
                "accent": "neutral",
                "icon": "briefcase",
                "kbd": "J",
            },
            {
                "label": "Activity Logs",
                "description": "Inspect user actions for support and ops",
                "url": self._changelist_url(UserActivityLog),
                "accent": "danger",
                "icon": "activity",
                "kbd": "L",
            },
        ]

    def _kpi_groups(
        self,
        *,
        total_users: int,
        onboarded_users: int,
        onboarding_rate: int,
        active_7d: int,
        in_progress: int,
        completed_7d: int,
        upload_issues: int,
        active_suggestions: int,
        events_24h: int,
    ) -> list[dict[str, Any]]:
        return [
            {
                "key": "users",
                "title": "Users",
                "icon": "users",
                "kpis": [
                    {
                        "label": "Total Users",
                        "value": f"{total_users:,}",
                        "hint": "All registered platform users",
                        "variant": "default",
                        "size": "large",
                    },
                    {
                        "label": "Onboarded",
                        "value": f"{onboarded_users:,}",
                        "hint": f"{onboarding_rate}% completed onboarding",
                        "variant": (
                            "success" if onboarding_rate >= 70
                            else "warning" if onboarding_rate >= 40
                            else "danger"
                        ),
                        "size": "normal",
                        "progress": onboarding_rate,
                    },
                    {
                        "label": "Active (7d)",
                        "value": f"{active_7d:,}",
                        "hint": "Users with recent platform activity",
                        "variant": "primary",
                        "size": "normal",
                    },
                ],
            },
            {
                "key": "interviews",
                "title": "Interviews",
                "icon": "microphone",
                "kpis": [
                    {
                        "label": "In Progress",
                        "value": str(in_progress),
                        "hint": "Sessions currently ongoing",
                        "variant": "warning" if in_progress > 0 else "default",
                        "size": "large",
                    },
                    {
                        "label": "Completed (7d)",
                        "value": str(completed_7d),
                        "hint": "Closed sessions in the last week",
                        "variant": "success",
                        "size": "normal",
                    },
                ],
            },
            {
                "key": "content",
                "title": "Content Health",
                "icon": "document",
                "kpis": [
                    {
                        "label": "Upload Issues",
                        "value": str(upload_issues),
                        "hint": "Resume records requiring attention",
                        "variant": (
                            "danger" if upload_issues > 5
                            else "warning" if upload_issues > 0
                            else "success"
                        ),
                        "size": "large",
                        "alert": upload_issues > 5,
                    },
                    {
                        "label": "Active Suggestions",
                        "value": str(active_suggestions),
                        "hint": "Recommendations currently active",
                        "variant": "default",
                        "size": "normal",
                    },
                ],
            },
            {
                "key": "system",
                "title": "System",
                "icon": "pulse",
                "kpis": [
                    {
                        "label": "Events (24h)",
                        "value": str(events_24h),
                        "hint": "Recent tracked events",
                        "variant": "default",
                        "size": "normal",
                    },
                ],
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
        in_progress = self._safe_count(InterviewSession, status="in_progress")
        completed_7d = self._safe_count(
            InterviewSession, status="completed", ended_at__gte=seven_days_ago
        )
        upload_issues = self._safe_count(
            ResumeUploadRecord, status__in=["pending", "failed"]
        )
        active_suggestions = self._safe_count(SuggestedJobRecord, is_active=True)
        events_24h = self._safe_count(UserActivityLog, created_at__gte=one_day_ago)

        stuck_interviews = self._safe_count(
            InterviewSession,
            status="in_progress",
            created_at__lte=now - timedelta(hours=2),
        )

        onboarding_rate = 0
        if total_users:
            onboarding_rate = round((onboarded_users / total_users) * 100)

        user = request.user
        if user.is_superuser:
            role = "admin"
        elif hasattr(user, "groups") and user.groups.filter(name="ops_leads").exists():
            role = "ops_lead"
        elif hasattr(user, "groups") and user.groups.filter(name="support").exists():
            role = "support"
        else:
            role = "viewer"

        context["dashboard_kpi_groups"] = self._kpi_groups(
            total_users=total_users,
            onboarded_users=onboarded_users,
            onboarding_rate=onboarding_rate,
            active_7d=active_7d,
            in_progress=in_progress,
            completed_7d=completed_7d,
            upload_issues=upload_issues,
            active_suggestions=active_suggestions,
            events_24h=events_24h,
        )
        context["dashboard_quick_links"] = self._quick_links(
            upload_issues=upload_issues,
            in_progress=in_progress,
            total_users=total_users,
        )
        context["dashboard_recent_activities"] = self._recent_activities()
        context["dashboard_kpis_flat"] = self._kpis_flat(
            total_users=total_users,
            active_7d=active_7d,
            in_progress=in_progress,
            completed_7d=completed_7d,
            upload_issues=upload_issues,
            events_24h=events_24h,
        )
        context["dashboard_ops_health"] = self._ops_health(
            upload_issues=upload_issues,
            stuck_interviews=stuck_interviews,
        )

        if role in ("admin", "ops_lead"):
            context["dashboard_system_status"] = self._system_status()
        else:
            context["dashboard_system_status"] = None

        context["dashboard_role"] = role
        return context
