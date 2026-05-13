"""
Real-time job fetcher: calls ITviec, TopCV, and VietnamWorks APIs in parallel.

Each platform adapter returns a normalized list:
  [{title, company, industry, description, skills, salary, location, url, source}]

The caller (`matcher.py`) combines all lists, passes them to the AI evaluator,
then persists the top-scored results.
"""
import asyncio
import httpx
from typing import Any, Dict, List

from app.core.logger import log_func

_TIMEOUT = 12.0

_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
}


def _str(val: Any) -> str:
    if isinstance(val, dict):
        return val.get("name") or val.get("title") or ""
    return str(val) if val is not None else ""


def _list_str(val: Any) -> List[str]:
    if isinstance(val, list):
        return [_str(v) for v in val if v]
    return []


# ── ITviec ──────────────────────────────────────────────────────────────────

async def _fetch_itviec(query: str, limit: int) -> List[Dict[str, Any]]:
    log_func("_fetch_itviec", level=2)
    url = "https://itviec.com/api/v1/jobs"
    params = {"query": query, "location": "all-cities", "page": 1}
    headers = {**_BASE_HEADERS, "Referer": "https://itviec.com/"}

    async with httpx.AsyncClient(headers=headers, timeout=_TIMEOUT, follow_redirects=True) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            print(f"[itviec] HTTP {r.status_code}")
            return []
        data = r.json()

    jobs: List[Dict[str, Any]] = []
    for item in (data.get("jobs") or [])[:limit]:
        company = item.get("company") or {}
        locations = item.get("locations") or []
        skills = item.get("skills") or []
        job_id = item.get("id") or item.get("slug") or ""
        jobs.append({
            "title": item.get("title", ""),
            "company": _str(company),
            "industry": "Technology",
            "description": item.get("short_description") or item.get("description") or "",
            "skills": [_str(s) for s in skills if s],
            "salary": item.get("salary_range") or item.get("salary") or "",
            "location": ", ".join(_str(l) for l in locations if l),
            "url": item.get("url") or f"https://itviec.com/it-jobs/{job_id}",
            "source": "itviec",
        })
    return jobs


# ── TopCV ────────────────────────────────────────────────────────────────────

async def _fetch_topcv(query: str, limit: int) -> List[Dict[str, Any]]:
    log_func("_fetch_topcv", level=2)
    url = "https://api.topcv.vn/v4/jobs/search"
    params = {"keyword": query, "page": 1, "size": limit, "sort": 1}
    headers = {**_BASE_HEADERS, "Referer": "https://topcv.vn/"}

    async with httpx.AsyncClient(headers=headers, timeout=_TIMEOUT, follow_redirects=True) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            print(f"[topcv] HTTP {r.status_code}")
            return []
        data = r.json()

    # TopCV nests data differently across API versions
    items = (
        data.get("data", {}).get("data")
        or data.get("data")
        or data.get("jobs")
        or []
    )
    jobs: List[Dict[str, Any]] = []
    for item in items[:limit]:
        company = item.get("company") or {}
        city = item.get("city") or {}
        raw_url = item.get("url") or item.get("job_url") or ""
        if raw_url and not raw_url.startswith("http"):
            raw_url = "https://topcv.vn" + raw_url
        category = item.get("category") or {}
        jobs.append({
            "title": item.get("title") or item.get("job_title") or "",
            "company": _str(company),
            "industry": _str(category) or "Technology",
            "description": item.get("short_description") or item.get("description") or "",
            "skills": [],
            "salary": item.get("salary") or item.get("salary_range") or "",
            "location": _str(city) or item.get("location") or "",
            "url": raw_url,
            "source": "topcv",
        })
    return jobs


# ── VietnamWorks ──────────────────────────────────────────────────────────────

async def _fetch_vietnamworks(query: str, limit: int) -> List[Dict[str, Any]]:
    log_func("_fetch_vietnamworks", level=2)
    url = "https://ms.vietnamworks.com/job-search/v1.0/jobs"
    params = {"query": query, "page": 0, "size": limit, "language": 0}
    headers = {**_BASE_HEADERS, "Referer": "https://www.vietnamworks.com/"}

    async with httpx.AsyncClient(headers=headers, timeout=_TIMEOUT, follow_redirects=True) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            print(f"[vietnamworks] HTTP {r.status_code}")
            return []
        data = r.json()

    hits = (
        data.get("data", {}).get("hits")
        or data.get("hits")
        or []
    )
    jobs: List[Dict[str, Any]] = []
    for item in hits[:limit]:
        job_id = item.get("jobId") or item.get("id") or ""
        industries = item.get("industryV3") or item.get("industries") or []
        industry = _str(industries[0]) if industries else "Technology"
        city_names = item.get("cityNames") or []
        jobs.append({
            "title": item.get("jobTitle") or item.get("title") or "",
            "company": item.get("companyName") or item.get("company") or "",
            "industry": industry,
            "description": item.get("requirementDetail") or item.get("description") or "",
            "skills": _list_str(item.get("skills") or []),
            "salary": item.get("salaryRange") or item.get("salary") or "",
            "location": ", ".join(str(c) for c in city_names if c),
            "url": f"https://www.vietnamworks.com/viec-lam/{job_id}" if job_id else "",
            "source": "vietnamworks",
        })
    return jobs


# ── Public API ───────────────────────────────────────────────────────────────

async def fetch_jobs_from_platforms(
    query: str,
    per_platform: int = 6,
) -> List[Dict[str, Any]]:
    """
    Fetch jobs from ITviec, TopCV, and VietnamWorks in parallel.
    Returns a deduplicated merged list (dedup by title+company).
    Silently ignores per-platform failures so a single broken adapter
    never blocks the other two.
    """
    log_func("fetch_jobs_from_platforms")
    if not query.strip():
        return []

    results = await asyncio.gather(
        _fetch_itviec(query, per_platform),
        _fetch_topcv(query, per_platform),
        _fetch_vietnamworks(query, per_platform),
        return_exceptions=True,
    )

    merged: List[Dict[str, Any]] = []
    seen: set = set()
    for batch in results:
        if isinstance(batch, Exception):
            print(f"[job_fetcher] platform error: {batch}")
            continue
        for job in batch:
            key = (
                (job.get("title") or "").lower()[:45],
                (job.get("company") or "").lower()[:30],
            )
            if key in seen or not key[0]:
                continue
            seen.add(key)
            merged.append(job)

    print(f"[job_fetcher] fetched {len(merged)} unique jobs for query='{query}'")
    return merged
