#!/usr/bin/env python
import os
import sys
from pathlib import Path


if __name__ == "__main__":
    django_admin_dir = Path(__file__).resolve().parent
    backend_root = django_admin_dir.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
