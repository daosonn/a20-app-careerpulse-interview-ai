from __future__ import annotations

from typing import Any

from django.urls import NoReverseMatch, reverse


class OpsAdminBaseMixin:
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
