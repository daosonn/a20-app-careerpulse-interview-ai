import os
from typing import Any, Dict, Iterable, List, Optional

from .http_client import ApiClient
from .normalization import make_qna_record, strip_html


STACK_EXCHANGE_LICENSE = "CC BY-SA 4.0 for posts on or after 2018-05-02; verify post timeline for older revisions"


class StackExchangeQnaClient:
    def __init__(self, site: str = "stackoverflow") -> None:
        self.site = site
        self.api_key = os.getenv("STACK_EXCHANGE_KEY")
        self.client = ApiClient(
            base_url="https://api.stackexchange.com/2.3",
            token_env=None,
            min_interval_seconds=1.1,
        )

    def fetch_skill_records(
        self,
        *,
        skill_name: str,
        skill_config: Dict[str, Any],
        pages: int = 1,
        page_size: int = 30,
        min_score: int = 5,
    ) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        tags = skill_config.get("stackexchange_tags", [skill_name])
        for tag_group in tags:
            tagged = ";".join(tag_group) if isinstance(tag_group, list) else str(tag_group)
            questions = self._fetch_questions(
                tagged=tagged,
                pages=pages,
                page_size=page_size,
                min_score=min_score,
            )
            for question in questions:
                answer = self._best_answer(question)
                if not answer:
                    continue
                records.append(self._to_record(skill_name, skill_config, question, answer))
        return records

    def _fetch_questions(
        self,
        *,
        tagged: str,
        pages: int,
        page_size: int,
        min_score: int,
    ) -> List[Dict[str, Any]]:
        questions: List[Dict[str, Any]] = []
        for page in range(1, pages + 1):
            params = {
                    "site": self.site,
                    "tagged": tagged,
                    "sort": "votes",
                    "order": "desc",
                    "min": min_score,
                    "pagesize": min(page_size, 100),
                    "page": page,
                    "filter": "withbody",
            }
            if self.api_key:
                params["key"] = self.api_key
            data = self.client.get("/questions", params=params)
            questions.extend(data.get("items", []))
            if not data.get("has_more"):
                break
            if data.get("quota_remaining") == 0:
                break
        return questions

    def _best_answer(self, question: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        question_id = question.get("question_id")
        if not question_id:
            return None
        params = {
                "site": self.site,
                "sort": "votes",
                "order": "desc",
                "pagesize": 5,
                "filter": "withbody",
        }
        if self.api_key:
            params["key"] = self.api_key
        data = self.client.get(f"/questions/{question_id}/answers", params=params)
        answers = data.get("items", [])
        if not answers:
            return None
        accepted_id = question.get("accepted_answer_id")
        if accepted_id:
            for answer in answers:
                if answer.get("answer_id") == accepted_id:
                    return answer
        return answers[0]

    def _to_record(
        self,
        skill_name: str,
        skill_config: Dict[str, Any],
        question: Dict[str, Any],
        answer: Dict[str, Any],
    ) -> Dict[str, Any]:
        owner = answer.get("owner", {}) or {}
        tags = list(question.get("tags", []))
        return make_qna_record(
            source_name="Stack Overflow",
            source_url=question.get("link", ""),
            source_type="stack_exchange_api",
            license_name=STACK_EXCHANGE_LICENSE,
            skill_name=skill_name,
            skill_secondary=skill_config.get("secondary", []),
            role_families=skill_config.get("role_families", []),
            level=skill_config.get("level", "mixed"),
            question_text=question.get("title") or strip_html(question.get("body", "")),
            answer_text=answer.get("body", ""),
            tags=tags,
            score=int(question.get("score", 0) or 0),
            view_count=int(question.get("view_count", 0) or 0),
            answer_count=int(question.get("answer_count", 0) or 0),
            source_item_id=str(question.get("question_id")),
            attribution={
                "question_id": question.get("question_id"),
                "answer_id": answer.get("answer_id"),
                "answer_author": owner.get("display_name"),
                "answer_author_url": owner.get("link"),
            },
        )
