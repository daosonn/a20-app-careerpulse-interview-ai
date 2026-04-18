from __future__ import annotations

from . import admin as ops_admin
from .admin_site_features import OpsAdminSite


ops_admin_site = OpsAdminSite(name="admin")
ops_admin.register_admin_models(ops_admin_site)
