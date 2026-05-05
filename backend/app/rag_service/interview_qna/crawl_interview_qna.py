import argparse
from typing import Any, Dict, List, Set

from .github_repos import GitHubRepoQnaClient
from .stack_exchange import StackExchangeQnaClient
from .storage import (
    append_jsonl,
    ensure_layout,
    load_seen_urls,
    load_sources,
    partition_path,
    save_seen_urls,
    select_skills,
)


def dedupe_records(records: List[Dict[str, Any]], seen_urls: Set[str]) -> List[Dict[str, Any]]:
    unique: List[Dict[str, Any]] = []
    seen_hashes = set()
    for record in records:
        metadata = record.get("metadata", {})
        url = metadata.get("source_url")
        content_hash = metadata.get("content_hash")
        key = f"{url}#{content_hash}"
        if key in seen_urls or key in seen_hashes:
            continue
        seen_hashes.add(key)
        unique.append(record)
    return unique


def crawl_stackexchange(args: argparse.Namespace, skills: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    client = StackExchangeQnaClient(site=args.stack_site)
    records: List[Dict[str, Any]] = []
    for skill_name, skill_config in skills.items():
        records.extend(client.fetch_skill_records(
            skill_name=skill_name,
            skill_config=skill_config,
            pages=args.pages,
            page_size=args.page_size,
            min_score=args.min_score,
        ))
    return records


def crawl_github(args: argparse.Namespace, skills: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    sources = load_sources()
    client = GitHubRepoQnaClient()
    selected_skill_names = set(skills)
    records: List[Dict[str, Any]] = []
    for repo in sources.get("github_repositories", []):
        repo_skills = set(repo.get("skills", []))
        if not repo_skills.intersection(selected_skill_names):
            continue
        records.extend(client.fetch_repository_records(
            repo_config=repo,
            skills=skills,
            max_files=args.max_files,
        ))
    return records


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Crawl interview Q&A records into raw_data/interview_qna.")
    parser.add_argument("--source", choices=["stackexchange", "github", "all"], default="stackexchange")
    parser.add_argument("--skills", nargs="*", help="Skill keys from raw_data/interview_qna/taxonomy.json")
    parser.add_argument("--partition", help="Override partition name, e.g. 2026_W19")
    parser.add_argument("--dry-run", action="store_true", help="Print count without writing JSONL")
    parser.add_argument("--stack-site", default="stackoverflow")
    parser.add_argument("--pages", type=int, default=1)
    parser.add_argument("--page-size", type=int, default=20)
    parser.add_argument("--min-score", type=int, default=5)
    parser.add_argument("--max-files", type=int, default=20)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    ensure_layout()
    skills = select_skills(args.skills)
    seen_urls = load_seen_urls()

    records: List[Dict[str, Any]] = []
    if args.source in ("stackexchange", "all"):
        records.extend(crawl_stackexchange(args, skills))
    if args.source in ("github", "all"):
        records.extend(crawl_github(args, skills))

    records = dedupe_records(records, seen_urls)
    if args.dry_run:
        print(f"Fetched {len(records)} new records")
        return 0

    output = partition_path(args.partition)
    count = append_jsonl(output, records)
    seen_urls.update(
        f"{record['metadata']['source_url']}#{record['metadata']['content_hash']}"
        for record in records
    )
    save_seen_urls(seen_urls)
    print(f"Wrote {count} records to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
