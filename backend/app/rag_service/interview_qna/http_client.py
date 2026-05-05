import os
import time
from typing import Any, Dict, Optional

import requests


class RateLimitError(RuntimeError):
    pass


class ApiClient:
    def __init__(
        self,
        *,
        base_url: str,
        token_env: Optional[str] = None,
        min_interval_seconds: float = 1.0,
        timeout_seconds: int = 30,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.min_interval_seconds = min_interval_seconds
        self.timeout_seconds = timeout_seconds
        self.last_request_at = 0.0
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "A20-App-011-interview-qna-crawler/1.0",
            "Accept": "application/json",
        })
        if token_env:
            token = os.getenv(token_env)
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self._respect_interval()
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        response = self.session.get(url, params=params or {}, timeout=self.timeout_seconds)
        self.last_request_at = time.time()

        if response.status_code in (403, 429):
            wait = self._rate_limit_wait_seconds(response)
            if wait:
                time.sleep(wait)
                response = self.session.get(url, params=params or {}, timeout=self.timeout_seconds)
                self.last_request_at = time.time()

        response.raise_for_status()
        data = response.json()

        backoff = data.get("backoff") if isinstance(data, dict) else None
        if backoff:
            time.sleep(int(backoff) + 1)
        return data

    def _respect_interval(self) -> None:
        elapsed = time.time() - self.last_request_at
        remaining = self.min_interval_seconds - elapsed
        if remaining > 0:
            time.sleep(remaining)

    @staticmethod
    def _rate_limit_wait_seconds(response: requests.Response) -> int:
        retry_after = response.headers.get("Retry-After")
        if retry_after and retry_after.isdigit():
            return min(int(retry_after) + 1, 120)

        reset = response.headers.get("x-ratelimit-reset")
        remaining = response.headers.get("x-ratelimit-remaining")
        if reset and remaining == "0":
            wait = int(reset) - int(time.time()) + 1
            return max(1, min(wait, 300))

        return 0

