from __future__ import annotations

from django.contrib.admin import AdminSite

from .base import OpsAdminBaseMixin
from .dashboard import OpsAdminDashboardMixin
from .navigation import OpsAdminNavigationMixin


class OpsAdminSite(OpsAdminDashboardMixin, OpsAdminNavigationMixin, OpsAdminBaseMixin, AdminSite):
    site_header = "AI Interview Platform Operations"
    site_title = "Operations Admin"
    index_title = "Operations Control Center"
    index_template = "admin/index.html"
    site_url = None
