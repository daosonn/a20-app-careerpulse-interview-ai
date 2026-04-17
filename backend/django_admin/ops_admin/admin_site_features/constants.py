from __future__ import annotations

EVENT_CATEGORY_MAP: dict[str, dict[str, str]] = {
    "onboarding_completed": {"icon": "user-check", "accent": "success"},
    "profile_updated": {"icon": "edit", "accent": "primary"},
    "cv_updated": {"icon": "document", "accent": "primary"},
    "education_added": {"icon": "graduation", "accent": "success"},
    "education_updated": {"icon": "edit", "accent": "primary"},
    "education_deleted": {"icon": "trash", "accent": "danger"},
    "preferences_updated": {"icon": "settings", "accent": "neutral"},
    "settings_updated": {"icon": "settings", "accent": "neutral"},
    "jobs_suggested_refreshed": {"icon": "briefcase", "accent": "success"},
    "interview_setup": {"icon": "microphone", "accent": "warning"},
    "interview_started": {"icon": "play", "accent": "warning"},
    "interview_completed": {"icon": "check-circle", "accent": "success"},
}
