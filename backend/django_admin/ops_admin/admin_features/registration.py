from __future__ import annotations

from typing import Type

from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered

from ..models import (
    EducationBackground,
    InterviewSession,
    PlatformUser,
    ResumeUploadRecord,
    SuggestedJobRecord,
    UserActivityLog,
)
from .activity_log import UserActivityLogAdmin
from .education import EducationBackgroundAdmin
from .interview import InterviewSessionAdmin
from .platform_user import PlatformUserAdmin
from .resume_upload import ResumeUploadRecordAdmin
from .suggested_job import SuggestedJobRecordAdmin


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
