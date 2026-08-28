"""Small offline evaluation harness for the published knowledge index."""

import json
from pathlib import Path

from sqlalchemy.orm import Session

from .knowledge_retrieval import search_published_knowledge


EVAL_SET = Path(__file__).resolve().parents[1] / "evals" / "knowledge_retrieval_v1.json"


def evaluate_retrieval(db: Session) -> dict[str, float | int]:
    cases = json.loads(EVAL_SET.read_text(encoding="utf-8"))
    correct = 0
    no_answer_correct = 0
    answerable_count = sum(1 for case in cases if case["answerable"])
    no_answer_count = len(cases) - answerable_count
    for case in cases:
        hits, _ = search_published_knowledge(db, case["query"], limit=3)
        course_ids = {hit.chunk.course_id for hit in hits}
        if case["answerable"] and case["expected_course_id"] in course_ids:
            correct += 1
        if not case["answerable"] and not hits:
            no_answer_correct += 1
    return {
        "case_count": len(cases),
        "answerable_recall_at_3": round(correct / answerable_count, 4) if answerable_count else 0.0,
        "no_answer_accuracy": round(no_answer_correct / no_answer_count, 4) if no_answer_count else 0.0,
    }
