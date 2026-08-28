"""Published-course retrieval for Basic search and the AI coach RAG Tool.

The pipeline always applies structured publication/domain filters first. It
uses lexical recall locally and adds provider embeddings when configured.
No generative model is involved in this module.
"""

from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import CourseVersion, Lesson


@dataclass(frozen=True)
class KnowledgeChunk:
    course_id: str
    course_version_id: int
    version: int
    title: str
    section: str
    content: str
    disclaimer: str
    source_refs: list[dict[str, str]]


@dataclass(frozen=True)
class KnowledgeHit:
    chunk: KnowledgeChunk
    score: float
    lexical_score: float
    embedding_score: float | None


COURSE_HINTS: dict[str, tuple[str, ...]] = {
    "housekeeping-work-basics": ("职业", "规范", "服务范围", "隐私", "客户"),
    "cleaner-safety": ("清洁剂", "混用", "通风", "标签", "安全"),
    "kitchen-order": ("厨房", "油污", "灶台", "台面", "清洁顺序"),
    "bathroom-safety": ("卫生间", "厕所", "马桶", "湿滑", "分区"),
    "home-organize": ("收纳", "整理", "物品", "丢弃", "分类"),
    "laundry-basics": ("洗衣", "衣物", "洗标", "口袋", "分类"),
}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", "", value.lower())


def _terms(value: str) -> set[str]:
    normalized = _normalize(value)
    latin = set(re.findall(r"[a-z0-9]+", normalized))
    chinese = "".join(re.findall(r"[\u4e00-\u9fff]", normalized))
    grams = {chinese[index : index + 2] for index in range(max(0, len(chinese) - 1))}
    grams.update(chinese[index : index + 3] for index in range(max(0, len(chinese) - 2)))
    return latin | grams | ({chinese} if chinese else set())


def _lexical_score(query: str, chunk: KnowledgeChunk) -> float:
    query_terms = _terms(query)
    content_terms = _terms(f"{chunk.title}{chunk.section}{chunk.content}")
    if not query_terms:
        return 0.0
    overlap = len(query_terms & content_terms) / len(query_terms)
    normalized_query = _normalize(query)
    phrase_bonus = 0.35 if normalized_query and normalized_query in _normalize(chunk.content) else 0.0
    hint_bonus = 0.0
    for hint in COURSE_HINTS.get(chunk.course_id, ()):
        if hint in query:
            hint_bonus = min(0.4, hint_bonus + 0.12)
    return min(1.0, overlap + phrase_bonus + hint_bonus)


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right, strict=False))
    denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(sum(value * value for value in right))
    return numerator / denominator if denominator else 0.0


def _embedding_vectors(texts: list[str]) -> list[list[float]] | None:
    model = os.getenv("AI_EMBEDDING_MODEL")
    api_base = os.getenv("AI_API_BASE")
    api_key = os.getenv("AI_API_KEY")
    if not (model and api_base and api_key):
        return None
    try:
        with httpx.Client(timeout=float(os.getenv("AI_TIMEOUT_SECONDS", "12"))) as client:
            response = client.post(
                f"{api_base.rstrip('/')}/embeddings",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "input": texts},
            )
            response.raise_for_status()
            ordered = sorted(response.json()["data"], key=lambda item: item["index"])
            return [list(map(float, item["embedding"])) for item in ordered]
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


def _published_chunks(db: Session, domain: str) -> list[KnowledgeChunk]:
    versions = list(
        db.scalars(
            select(CourseVersion)
            .join(Lesson, Lesson.id == CourseVersion.course_id)
            .where(CourseVersion.review_status == "published", Lesson.domain == domain)
            .order_by(CourseVersion.published_at.desc(), CourseVersion.version.desc())
        )
    )
    chunks: list[KnowledgeChunk] = []
    for version in versions:
        shared = dict(
            course_id=version.course_id,
            course_version_id=version.id,
            version=version.version,
            title=version.title or version.course_id,
            disclaimer=version.disclaimer or "",
            source_refs=version.source_refs or [],
        )
        overview = "。".join(value for value in (version.summary, version.conclusion) if value)
        if overview:
            chunks.append(KnowledgeChunk(section="课程要点", content=overview, **shared))
        for index, step in enumerate(version.steps or []):
            content = "：".join(value for value in (step.get("title", ""), step.get("body", "")) if value)
            if content:
                chunks.append(KnowledgeChunk(section=f"步骤{index + 1}", content=content, **shared))
    return chunks


def retrieve_published_course(db: Session, course_id: str) -> CourseVersion | None:
    """Structured retrieval used by the professional coach after lesson routing."""
    return db.scalar(
        select(CourseVersion)
        .where(CourseVersion.course_id == course_id, CourseVersion.review_status == "published")
        .order_by(CourseVersion.version.desc())
    )


def search_published_knowledge(db: Session, query: str, *, domain: str = "housekeeping", limit: int = 5) -> tuple[list[KnowledgeHit], str]:
    chunks = _published_chunks(db, domain)
    if not chunks:
        return [], "structured_lexical"
    lexical = [_lexical_score(query, chunk) for chunk in chunks]
    vectors = _embedding_vectors([query, *[chunk.content for chunk in chunks]])
    embedding_scores = [_cosine(vectors[0], vector) for vector in vectors[1:]] if vectors else [None] * len(chunks)
    mode = "hybrid_embedding" if vectors else "structured_lexical"
    hits: list[KnowledgeHit] = []
    for chunk, lexical_score, embedding_score in zip(chunks, lexical, embedding_scores, strict=True):
        if embedding_score is None:
            score = lexical_score
        else:
            score = lexical_score * 0.55 + max(0.0, embedding_score) * 0.45
        if score >= 0.08:
            hits.append(KnowledgeHit(chunk=chunk, score=round(score, 4), lexical_score=round(lexical_score, 4), embedding_score=round(embedding_score, 4) if embedding_score is not None else None))
    hits.sort(key=lambda item: (item.score, item.chunk.version), reverse=True)
    return hits[: max(1, min(limit, 10))], mode
