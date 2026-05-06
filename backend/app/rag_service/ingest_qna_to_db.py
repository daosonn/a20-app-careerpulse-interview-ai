import argparse
import json
import logging
import os
import sys
from pathlib import Path

from sqlalchemy.orm import Session

# Add the backend directory to sys.path to allow imports from 'app'
backend_dir = str(Path(__file__).resolve().parents[2])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.core.logger import log_func
from app.models.models import QuestionBank
from app.rag_service.interview_qna.storage import DATA_ROOT, load_jsonl

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TAXONOMY_PATH = DATA_ROOT / "taxonomy.json"
NORMALIZED_DIR = DATA_ROOT / "normalized"

class TaxonomyMapper:
    def __init__(self, taxonomy_path: Path):
        log_func("TaxonomyMapper.__init__", level=2)
        self.mapping = {}
        if not taxonomy_path.exists():
            logger.warning(f"Taxonomy file not found at {taxonomy_path}")
            return
        
        try:
            with open(taxonomy_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                skills = data.get("skills", {})
                for parent, info in skills.items():
                    parent_clean = parent.lower()
                    # Parent maps to itself
                    self.mapping[parent_clean] = parent_clean
                    # Sub-skills map to parent
                    for sub in info.get("secondary", []):
                        self.mapping[sub.lower()] = parent_clean
            logger.info(f"Loaded taxonomy mapping with {len(self.mapping)} skill variants.")
        except Exception as e:
            logger.error(f"Error loading taxonomy: {e}")

    def map_skill(self, skill: str) -> str:
        log_func("TaxonomyMapper.map_skill", level=2)
        if not skill:
            return "general"
        skill_clean = skill.lower().strip()
        return self.mapping.get(skill_clean, skill_clean)

def clean_text(text: str) -> str:
    log_func("clean_text", level=2)
    if not text:
        return ""
    text = text.strip()
    if not text:
        return ""
    # Capitalize first letter
    return text[0].upper() + text[1:]

def ingest(limit: int = None, min_quality: float = 0.6):
    log_func("ingest")
    mapper = TaxonomyMapper(TAXONOMY_PATH)
    db: Session = SessionLocal()
    
    # Discovery: find all .jsonl files in normalized and partitions
    data_dirs = [NORMALIZED_DIR, DATA_ROOT / "partitions"]
    
    # Map from stem (e.g. 'qna_2026_W19') to set of files
    file_groups = {}
    
    for d in data_dirs:
        if d.exists():
            for f in d.glob("*.jsonl"):
                stem = f.name.replace(".vi.jsonl", "").replace(".jsonl", "")
                if stem not in file_groups:
                    file_groups[stem] = []
                file_groups[stem].append(f)
    
    total_added = 0
    total_processed = 0
    
    logger.info(f"Found {len(file_groups)} data groups to process.")

    for stem, files in file_groups.items():
        # Prefer .vi.jsonl from normalized, then .jsonl from normalized, etc.
        vi_file = next((f for f in files if f.name.endswith(".vi.jsonl")), None)
        base_file = next((f for f in files if not f.name.endswith(".vi.jsonl")), None)
        
        target_file = vi_file or base_file
        if not target_file:
            continue

        logger.info(f"Processing group {stem} using file: {target_file.name}")
        
        records = load_jsonl(target_file)
        
        for rec in records:
            total_processed += 1
            if limit and total_added >= limit:
                break
            
            # Quality filter
            quality = rec.get("metadata", {}).get("quality_score", 0)
            if quality < min_quality:
                continue
            
            # Map skills
            primary_skill = rec.get("skill", {}).get("primary", "general")
            canonical_skill = mapper.map_skill(primary_skill)
            skills_list = [canonical_skill]
            
            # Prepare records to insert
            records_to_create = []
            
            # EN record
            en_q = clean_text(rec.get("question", {}).get("text", ""))
            en_ans = clean_text(rec.get("answer", {}).get("detailed", ""))
            if en_q:
                records_to_create.append({
                    "question": en_q,
                    "skills": skills_list,
                    "tip": en_ans,
                    "language": "en",
                    "evaluation_type": "technical"
                })
            
            # VI record (may exist in the same record if it's a .vi.jsonl)
            vi_q = clean_text(rec.get("question", {}).get("text_vi", ""))
            vi_ans = clean_text(rec.get("answer", {}).get("detailed_vi", ""))
            if vi_q:
                records_to_create.append({
                    "question": vi_q,
                    "skills": skills_list,
                    "tip": vi_ans,
                    "language": "vi",
                    "evaluation_type": "technical"
                })
            
            for r_data in records_to_create:
                # Check for duplicates by question text and language
                existing = db.query(QuestionBank).filter(
                    QuestionBank.question == r_data["question"],
                    QuestionBank.language == r_data["language"]
                ).first()
                
                if not existing:
                    try:
                        db_rec = QuestionBank(**r_data)
                        db.add(db_rec)
                        total_added += 1
                    except Exception as e:
                        logger.error(f"Error adding record: {e}")
            
            # Commit periodically
            if total_added > 0 and total_added % 50 == 0:
                db.commit()

    db.commit()
    db.close()
    logger.info(f"Ingestion complete. Total records processed: {total_processed}, Total added to DB: {total_added}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest interview Q&A into QuestionBank")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of records to add to DB")
    parser.add_argument("--min-quality", type=float, default=0.6, help="Minimum quality score (0-1)")
    args = parser.parse_args()
    
    ingest(limit=args.limit, min_quality=args.min_quality)
