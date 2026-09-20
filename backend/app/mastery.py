"""Evidence-based module mastery for the housekeeping learning loop."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from .assessments import questions_for
from .models import AssessmentAttempt, LearningSession, Lesson
from .seed import COURSE_META


MASTERY_VERSION = "housekeeping-mastery-v1"

MODULES = (
    ("housekeeping-work-basics", "岗位边界"),
    ("service-confirmation", "任务确认"),
    ("workplace-safety", "燃气安全"),
    ("cleaner-safety", "产品混用"),
    ("home-cleaning-sop", "操作顺序"),
    ("kitchen-order", "食品隔离"),
    ("bathroom-safety", "工具分区"),
    ("laundry-basics", "洗护标签"),
    ("home-organize", "处置权限"),
    ("communication-handover", "异常报告"),
    ("employment-rights", "证书防骗"),
    ("doorstep-simulation", "验收交接"),
)


@dataclass(frozen=True)
class AssessmentEvidence:
    ratio: float
    safety_missed: bool


def _assessment_evidence(attempt: AssessmentAttempt | None) -> dict[str, AssessmentEvidence]:
    if attempt is None:
        return {}
    grouped: dict[str, list[tuple[bool, bool]]] = {}
    for question in questions_for(attempt.kind, attempt.assessment_version):
        name = str(question["knowledge_point"])
        correct = (attempt.answers or {}).get(str(question["id"])) == question["correct_answer"]
        grouped.setdefault(name, []).append((correct, bool(question.get("is_safety_critical"))))
    return {
        name: AssessmentEvidence(
            ratio=sum(int(correct) for correct, _ in results) / len(results),
            safety_missed=any(not correct and safety for correct, safety in results),
        )
        for name, results in grouped.items()
    }


def build_mastery(db: Session, user_id: int) -> dict[str, object]:
    attempts = list(
        db.scalars(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == user_id,
                AssessmentAttempt.status == "submitted",
                AssessmentAttempt.is_official.is_(True),
            )
        )
    )
    pre = next((item for item in attempts if item.kind == "pre"), None)
    post = next((item for item in attempts if item.kind == "post"), None)
    pre_results = _assessment_evidence(pre)
    post_results = _assessment_evidence(post)
    sessions = {
        item.lesson_id: item
        for item in db.scalars(
            select(LearningSession).where(
                LearningSession.user_id == user_id,
                LearningSession.lesson_id.in_(tuple(COURSE_META)),
            )
        )
    }
    lessons = {item.id: item for item in db.scalars(select(Lesson).where(Lesson.id.in_(tuple(COURSE_META))))}

    modules: list[dict[str, object]] = []
    for course_id, knowledge_point in MODULES:
        lesson = lessons[course_id]
        session = sessions.get(course_id)
        pre_evidence = pre_results.get(knowledge_point)
        post_evidence = post_results.get(knowledge_point)
        completed = bool(session and session.status == "completed")
        total_steps = max(len(lesson.steps), 1)
        progress_ratio = 1.0 if completed else min((session.current_step / total_steps), 1.0) if session else 0.0

        score = 0.0
        evidence: list[str] = []
        if pre_evidence:
            score += pre_evidence.ratio * 20
            evidence.append("已完成入门测评")
        if session:
            score += progress_ratio * 30
            evidence.append("课程已完成" if completed else f"课程学习到第{session.current_step + 1}步")
        if completed:
            quiz_points = max(10, 20 - max(session.quiz_attempts - 1, 0) * 4)
            score += quiz_points
            evidence.append("随堂理解检查已通过")
        if post_evidence:
            score += post_evidence.ratio * 30
            evidence.append("已完成学习后测")

        score_int = min(100, round(score))
        safety_attention = bool(post_evidence and post_evidence.safety_missed)
        if completed and post_evidence and post_evidence.ratio == 1:
            status = "mastered"
        elif post_evidence and post_evidence.ratio < 1:
            status = "needs_review"
        elif session or pre_evidence:
            status = "learning"
        else:
            status = "not_started"
        modules.append(
            {
                "course_id": course_id,
                "title": lesson.title,
                "knowledge_point": knowledge_point,
                "score": score_int,
                "status": status,
                "safety_attention": safety_attention,
                "evidence": evidence,
            }
        )

    review_candidates = [item for item in modules if item["status"] == "needs_review"]
    review_candidates.sort(key=lambda item: (not bool(item["safety_attention"]), int(item["score"])))
    learning_candidates = [item for item in modules if item["status"] in ("learning", "not_started")]
    recommended = review_candidates[0] if review_candidates else learning_candidates[0] if learning_candidates else None
    reason = None
    if recommended:
        if recommended["safety_attention"]:
            reason = "这里有一道安全关键题需要再确认"
        elif recommended["status"] == "needs_review":
            reason = "后测显示这个模块还需要复习"
        elif recommended["status"] == "learning":
            reason = "从上次保存的位置继续学习"
        else:
            reason = "这是接下来建议学习的模块"

    return {
        "version": MASTERY_VERSION,
        "modules": modules,
        "mastered_count": sum(item["status"] == "mastered" for item in modules),
        "total_count": len(modules),
        "recommended_course_id": recommended["course_id"] if recommended else None,
        "recommended_title": recommended["title"] if recommended else None,
        "recommendation_reason": reason,
    }
