import base64
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .http_client import ApiClient
from .normalization import make_qna_record


class GitHubRepoQnaClient:
    def __init__(self) -> None:
        self.client = ApiClient(
            base_url="https://api.github.com",
            token_env="GITHUB_TOKEN",
            min_interval_seconds=1.0,
        )

    def fetch_repository_records(
        self,
        *,
        repo_config: Dict[str, Any],
        skills: Dict[str, Dict[str, Any]],
        max_files: int = 20,
    ) -> List[Dict[str, Any]]:
        repo = repo_config["repo"]
        owner, name = repo.split("/", 1)
        license_name = self._repo_license(owner, name) or repo_config.get("license", "unknown")
        records: List[Dict[str, Any]] = []
        paths = repo_config.get("paths", [])[:max_files]

        for path in paths:
            try:
                content = self._fetch_file(owner, name, path, repo_config.get("ref"))
            except Exception as exc:
                print(f"Skipping {repo}:{path}: {exc}")
                continue
            if not content:
                continue
            for skill_name in repo_config.get("skills", []):
                skill_config = skills.get(skill_name)
                if not skill_config:
                    continue
                for question, answer in extract_markdown_qna(content):
                    source_url = f"https://github.com/{repo}/blob/{repo_config.get('ref', 'HEAD')}/{path}"
                    records.append(make_qna_record(
                        source_name=repo,
                        source_url=source_url,
                        source_type="github_repository",
                        license_name=license_name,
                        skill_name=skill_name,
                        skill_secondary=skill_config.get("secondary", []),
                        role_families=skill_config.get("role_families", []),
                        level=skill_config.get("level", "mixed"),
                        question_text=question,
                        answer_text=answer,
                        tags=skill_config.get("github_topics", []),
                        score=int(repo_config.get("stars", 0) or 0),
                        view_count=0,
                        answer_count=1,
                        source_item_id=f"{repo}:{path}:{question}",
                        attribution={
                            "repo": repo,
                            "path": path,
                            "license_url": f"https://api.github.com/repos/{owner}/{name}/license",
                        },
                    ))
        return records

    def _fetch_file(self, owner: str, repo: str, path: str, ref: Optional[str] = None) -> str:
        params = {"ref": ref} if ref else {}
        data = self.client.get(f"/repos/{owner}/{repo}/contents/{path}", params=params)
        if data.get("encoding") != "base64":
            return ""
        raw = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
        return raw

    def _repo_license(self, owner: str, repo: str) -> str:
        try:
            data = self.client.get(f"/repos/{owner}/{repo}/license")
        except Exception:
            return ""
        license_info = data.get("license") or {}
        return license_info.get("spdx_id") or license_info.get("name") or ""


def extract_markdown_qna(markdown: str) -> List[Tuple[str, str]]:
    lines = markdown.splitlines()
    pairs: List[Tuple[str, str]] = []
    current_question: Optional[str] = None
    answer_lines: List[str] = []

    def flush() -> None:
        nonlocal current_question, answer_lines
        if current_question and answer_lines:
            answer = "\n".join(answer_lines).strip()
            if len(answer) >= 80:
                pairs.append((current_question.strip(" #"), answer))
        current_question = None
        answer_lines = []

    for line in lines:
        stripped = line.strip()
        heading_question = re.match(r"^#{2,6}\s+(.+\?)\s*$", stripped)
        list_question = re.match(r"^[-*]\s+(.+\?)\s*$", stripped)
        bold_question = re.match(r"^\*\*(.+\?)\*\*", stripped)
        match = heading_question or list_question or bold_question
        if match:
            flush()
            current_question = match.group(1)
            continue
        if current_question:
            if stripped.startswith("#") and not stripped.endswith("?"):
                flush()
            else:
                answer_lines.append(line)

    flush()
    return pairs
