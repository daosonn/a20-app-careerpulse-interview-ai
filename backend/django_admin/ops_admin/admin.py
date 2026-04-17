from django.contrib import admin
from .admin_features import register_admin_models


register_admin_models(admin.site)
