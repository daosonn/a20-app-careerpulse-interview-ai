import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_ROOT = BASE_DIR.parent
REPO_ROOT = BACKEND_ROOT.parent
load_dotenv(REPO_ROOT / ".env")
load_dotenv(BACKEND_ROOT / ".env")
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _sqlite_path_from_url(db_url: str) -> str:
    # sqlite:///relative/path.db or sqlite:////absolute/path.db
    raw_path = db_url.replace("sqlite:///", "", 1)
    decoded = unquote(raw_path)
    if decoded.startswith("/"):
        return decoded
    return str((BACKEND_ROOT / decoded).resolve())


def _database_config() -> dict:
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        if db_url.startswith("sqlite:///"):
            return {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": _sqlite_path_from_url(db_url),
            }

        if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
            parsed = urlparse(db_url)
            config = {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": parsed.path.lstrip("/"),
                "USER": parsed.username or "",
                "PASSWORD": parsed.password or "",
                "HOST": parsed.hostname or "",
                "PORT": str(parsed.port or ""),
            }
            query = parse_qs(parsed.query)
            sslmode = query.get("sslmode", [None])[0]
            if sslmode:
                config["OPTIONS"] = {"sslmode": sslmode}
            return config

        raise ImproperlyConfigured("Unsupported DATABASE_URL scheme for Django Admin.")

    if os.getenv("VERCEL"):
        raise ImproperlyConfigured(
            "DATABASE_URL is required on Vercel. Configure managed Postgres "
            "instead of ephemeral /tmp SQLite storage."
        )

    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BACKEND_ROOT / "data" / "interview_coach.db"),
    }


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "ops_admin.apps.OpsAdminConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": _database_config()}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = False

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
