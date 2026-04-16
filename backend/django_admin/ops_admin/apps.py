import os
from sys import argv

from django.apps import AppConfig


class OpsAdminConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ops_admin"
    verbose_name = "Operations Admin"

    def ready(self) -> None:
        # Avoid side effects during migration command execution.
        if len(argv) > 1 and argv[1] in {"makemigrations", "migrate", "collectstatic"}:
            return

        if os.getenv("DJANGO_SKIP_SQLA_INIT", "false").lower() == "true":
            return

        try:
            from app.models import models as _  # Ensure SQLAlchemy model metadata is loaded.
            from app.core.database import init_db

            init_db()
        except Exception as exc:
            print(f"Warning: SQLAlchemy init during Django startup failed: {exc}")
