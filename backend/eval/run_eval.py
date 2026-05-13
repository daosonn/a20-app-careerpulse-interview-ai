"""
CareerPulse Interview Agent — Evaluation Pipeline

Usage:
    cd backend
    python -m eval.run_eval                         # evaluate all 50 samples
    python -m eval.run_eval --sample-ids gd_001 gd_002   # specific samples
    python -m eval.run_eval --phase "CV Deep-dive"       # filter by phase
    python -m eval.run_eval --language vi                 # filter by language
    python -m eval.run_eval --dry-run                     # skip LLM calls, show dataset stats

Outputs:
    backend/eval/reports/eval_<timestamp>.json
    Prints a summary table to stdout.

Thresholds (configurable via env):
    EVAL_FAITHFULNESS_MIN=0.75   alert if avg cv_faithfulness drops below this
    EVAL_RELEVANCY_MIN=0.70      alert if avg jd_relevancy drops below this
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Allow running as `python -m eval.run_eval` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

EVAL_DIR = Path(__file__).resolve().parent
DATASET_PATH = EVAL_DIR / "golden_dataset.jsonl"
REPORTS_DIR = EVAL_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

FAITHFULNESS_MIN = float(os.getenv("EVAL_FAITHFULNESS_MIN", "0.75"))
RELEVANCY_MIN = float(os.getenv("EVAL_RELEVANCY_MIN", "0.70"))


# ---------------------------------------------------------------------------
# Dataset helpers
# ---------------------------------------------------------------------------

def load_dataset(
    sample_ids: list[str] | None = None,
    phase_filter: str | None = None,
    language_filter: str | None = None,
) -> list[dict]:
    records = []
    with open(DATASET_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if sample_ids and rec["id"] not in sample_ids:
                continue
            if phase_filter and rec.get("phase") != phase_filter:
                continue
            if language_filter and rec.get("language") != language_filter:
                continue
            records.append(rec)
    return records


# ---------------------------------------------------------------------------
# Agent caller — wraps generate_ai_batch to be eval-friendly
# ---------------------------------------------------------------------------

async def call_agent(record: dict) -> list[dict]:
    """Call the interviewer agent with the golden dataset sample inputs."""
    from app.services.interviewer import generate_ai_batch

    req = {
        "language": record["language"],
        "interview_type": record["interview_type"],
        "cv_content": record["cv_content"],
        "jd_content": record["jd_content"],
        "chat_history": record.get("chat_history", []),
        "total_question_count": len(record.get("chat_history", [])) // 2,
        "max_question_count": 5,
        "is_stress_test": record.get("metadata", {}).get("stress_test", False),
    }
    return await generate_ai_batch(req)


# ---------------------------------------------------------------------------
# Main evaluation loop
# ---------------------------------------------------------------------------

async def evaluate_sample(
    record: dict,
    dry_run: bool = False,
) -> dict[str, Any]:
    sample_id = record["id"]

    if dry_run:
        generated_questions = record["ideal_questions"][:2]
    else:
        try:
            batches = await call_agent(record)
            generated_questions = [b["question"] for b in batches if b.get("question")]
        except Exception as exc:
            return {
                "id": sample_id,
                "error": str(exc),
                "cv_faithfulness": None,
                "jd_relevancy": None,
                "avg": None,
                "generated_questions": [],
                "phase": record["phase"],
                "language": record["language"],
                "interview_type": record["interview_type"],
            }

    from eval.metrics import score_sample

    scores = await score_sample(
        generated_questions=generated_questions,
        cv_content=record["cv_content"],
        jd_content=record["jd_content"],
        phase=record["phase"],
        interview_type=record["interview_type"],
    )

    return {
        "id": sample_id,
        "phase": record["phase"],
        "language": record["language"],
        "interview_type": record["interview_type"],
        "generated_questions": generated_questions,
        "ideal_questions": record["ideal_questions"],
        "cv_grounding_anchors": record.get("cv_grounding_anchors", []),
        "jd_key_requirements": record.get("jd_key_requirements", []),
        **scores,
    }


def _avg(values: list) -> float | None:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 4) if vals else None


def _print_summary(results: list[dict], report_path: Path) -> None:
    total = len(results)
    errors = [r for r in results if r.get("error")]
    ok = [r for r in results if not r.get("error")]

    faithfulness_scores = [r["cv_faithfulness"] for r in ok if r.get("cv_faithfulness") is not None]
    relevancy_scores = [r["jd_relevancy"] for r in ok if r.get("jd_relevancy") is not None]

    avg_faith = _avg(faithfulness_scores)
    avg_rel = _avg(relevancy_scores)

    faith_pass = avg_faith is not None and avg_faith >= FAITHFULNESS_MIN
    rel_pass = avg_rel is not None and avg_rel >= RELEVANCY_MIN

    print("\n" + "=" * 60)
    print("CareerPulse Interview Agent — Evaluation Report")
    print("=" * 60)
    print(f"  Samples evaluated : {total}")
    print(f"  Errors            : {len(errors)}")
    print(f"  Thresholds        : faithfulness>={FAITHFULNESS_MIN}  relevancy>={RELEVANCY_MIN}")
    print("-" * 60)
    print(f"  CV Faithfulness   : {avg_faith:.4f}  {'PASS ✓' if faith_pass else 'FAIL ✗'}")
    print(f"  JD Relevancy      : {avg_rel:.4f}  {'PASS ✓' if rel_pass else 'FAIL ✗'}")
    print("-" * 60)

    # Phase breakdown
    phases = sorted({r["phase"] for r in ok})
    for phase in phases:
        phase_rows = [r for r in ok if r["phase"] == phase]
        pf = _avg([r["cv_faithfulness"] for r in phase_rows])
        pr = _avg([r["jd_relevancy"] for r in phase_rows])
        print(f"  {phase:<26}  faith={pf:.3f}  rel={pr:.3f}  (n={len(phase_rows)})")

    print("-" * 60)
    print(f"  Report saved to: {report_path}")
    print("=" * 60)

    if not faith_pass or not rel_pass:
        print("\n[ALERT] One or more metrics are below threshold.")
        if not faith_pass:
            print(f"  → cv_faithfulness {avg_faith:.4f} < {FAITHFULNESS_MIN} — review CV grounding prompt")
        if not rel_pass:
            print(f"  → jd_relevancy {avg_rel:.4f} < {RELEVANCY_MIN} — review JD-aware questioning prompt")
        sys.exit(1)


async def main(args: argparse.Namespace) -> None:
    dataset = load_dataset(
        sample_ids=args.sample_ids or None,
        phase_filter=args.phase,
        language_filter=args.language,
    )
    if not dataset:
        print("No samples matched the given filters.")
        sys.exit(1)

    print(f"Evaluating {len(dataset)} samples (dry_run={args.dry_run}) …")

    # Run samples concurrently — RAGAS makes LLM calls so we limit concurrency
    sem = asyncio.Semaphore(5)

    async def bounded(record: dict) -> dict:
        async with sem:
            return await evaluate_sample(record, dry_run=args.dry_run)

    results = await asyncio.gather(*[bounded(r) for r in dataset])
    results = list(results)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = REPORTS_DIR / f"eval_{timestamp}.json"

    report = {
        "timestamp": timestamp,
        "dry_run": args.dry_run,
        "sample_count": len(results),
        "thresholds": {
            "cv_faithfulness_min": FAITHFULNESS_MIN,
            "jd_relevancy_min": RELEVANCY_MIN,
        },
        "aggregate": {
            "cv_faithfulness": _avg([r.get("cv_faithfulness") for r in results]),
            "jd_relevancy": _avg([r.get("jd_relevancy") for r in results]),
        },
        "results": results,
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    _print_summary(results, report_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run CareerPulse interview agent evaluation")
    parser.add_argument("--sample-ids", nargs="+", help="Run only these sample IDs")
    parser.add_argument("--phase", help="Filter by phase name")
    parser.add_argument("--language", choices=["en", "vi"], help="Filter by language")
    parser.add_argument("--dry-run", action="store_true", help="Skip LLM calls, use ideal_questions as generated")
    args = parser.parse_args()
    asyncio.run(main(args))
