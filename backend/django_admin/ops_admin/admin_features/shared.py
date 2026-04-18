from __future__ import annotations

import json

from django.utils.html import format_html


def compact_json(value: object, max_len: int = 200) -> str:
    if value is None:
        return ""
    text = json.dumps(value, ensure_ascii=True)
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}..."


def badge_html(variant: str, label: str, extra_classes: str = "") -> str:
    cls = f"ops-badge ops-badge-{variant}"
    if extra_classes:
        cls += f" {extra_classes}"
    return format_html('<span class="{}">{}</span>', cls, label)


def datetime_html(dt) -> str:
    if not dt:
        return format_html('<span class="ops-col-datetime">-</span>')
    return format_html(
        '<span class="ops-col-datetime">{}</span>',
        dt.strftime("%Y-%m-%d %H:%M"),
    )


def json_preview_html(value: object, max_len: int = 800) -> str:
    text = compact_json(value, max_len=max_len)
    if not text:
        return "-"
    return format_html('<pre class="ops-json-preview">{}</pre>', text)
