import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_ROOT = PROJECT_ROOT / "raw_data" / "interview_qna"
PARTITIONS_DIR = DATA_ROOT / "partitions"
NORMALIZED_DIR = DATA_ROOT / "normalized"
SEEN_URLS_PATH = DATA_ROOT / "seen_urls.json"
TAXONOMY_PATH = DATA_ROOT / "taxonomy.json"
SOURCES_PATH = DATA_ROOT / "sources.json"


def ensure_layout() -> None:
    PARTITIONS_DIR.mkdir(parents=True, exist_ok=True)
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    if not SEEN_URLS_PATH.exists():
        write_json(SEEN_URLS_PATH, [])


def current_partition_name(today: Optional[date] = None) -> str:
    today = today or date.today()
    year, week, _ = today.isocalendar()
    return f"{year}_W{week:02d}"


def partition_path(partition: Optional[str] = None) -> Path:
    partition = partition or current_partition_name()
    return PARTITIONS_DIR / f"qna_{partition}.jsonl"


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")


def append_jsonl(path: Path, records: Iterable[Dict[str, Any]]) -> int:
    rows = list(records)
    if not rows:
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True))
            f.write("\n")
    return len(rows)


def load_seen_urls() -> Set[str]:
    return set(read_json(SEEN_URLS_PATH, []))


def save_seen_urls(urls: Iterable[str]) -> None:
    write_json(SEEN_URLS_PATH, sorted(set(urls)))


def load_taxonomy() -> Dict[str, Any]:
    return read_json(TAXONOMY_PATH, {"skills": {}})


def load_sources() -> Dict[str, Any]:
    return read_json(SOURCES_PATH, {"api_sources": [], "github_repositories": []})


def select_skills(skill_names: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
    skills = load_taxonomy().get("skills", {})
    if not skill_names:
        return skills
    missing = [name for name in skill_names if name not in skills]
    if missing:
        raise ValueError(f"Unknown skills: {', '.join(missing)}")
    return {name: skills[name] for name in skill_names}
