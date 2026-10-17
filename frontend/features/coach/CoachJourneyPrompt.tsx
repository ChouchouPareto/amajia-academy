"use client";

import { ArrowRight, BookOpenCheck } from "lucide-react";
import type { LearningOverview, MasteryOverview } from "@/lib/types";
import type { LearningOutcomes } from "@/lib/outcomes";
import { CoachPostReview } from "./CoachPostReview";

type Props = {
  overview: LearningOverview | null;
  mastery: MasteryOverview | null;
  outcomes: LearningOutcomes | null;
  starting: boolean;
  loading: boolean;
  error: string;
  examples: string[];
  onRetry: () => void;
  onContinueCourse: (courseId?: string | null) => void;
  onChooseExample: (example: string) => void;
};

export function CoachJourneyPrompt({ overview, mastery, outcomes, starting, loading, error, examples, onRetry, onContinueCourse, onChooseExample }: Props) {
  const review = overview?.recommended_action === "view_report" && mastery?.recommended_course_id;
  const next = outcomes?.next_action;
  const courseId = next?.course_id ?? (review ? mastery.recommended_course_id : overview?.recommended_course_id);
  const canResume = Boolean(courseId);
  const firstLesson = overview?.recommended_action === "start_pre_assessment";
  const primaryLabel = next?.label ?? (review ? "一起复习" : canResume ? firstLesson ? "开始第一门课" : "接着上次学习" : "和老师聊聊");
  const feedbackTask = next?.kind === "practice" ? outcomes?.tasks.find((task) => task.session_id === next.session_id && task.attempt?.status === "needs_revision") : undefined;
  return <section className="v2-coach-home">
    <div className="v2-home-intro"><h1>今天接着学</h1><p>和老师聊，一步一步学会家政。</p></div>
    <article className="v2-resume-card" aria-busy={loading}>
      {loading ? <p role="status">正在读取学习进度…</p> : error ? <><h2>进度暂时没读到</h2><p role="alert">{error}</p><button className="v2-secondary" onClick={onRetry}>重新读取</button></> : <>
        <div className="v2-card-label"><BookOpenCheck aria-hidden="true" size={19} /><span>{feedbackTask ? "教练有新建议" : next?.kind === "handoff" ? "准备下一阶段" : review ? "值得再练一练" : canResume && !firstLesson ? "接着上次" : "从这里开始"}</span></div>
        <h2>{next?.kind === "practice" ? "把做法说清楚" : next?.kind === "handoff" ? "线上学习之后" : review ? mastery.recommended_title : canResume ? firstLesson ? "一起学家政入门" : "继续你的家政学习" : "想先学点什么？"}</h2>
        {next && <p>{next.reason}</p>}
        {feedbackTask && <div className="outcome-feedback" role="status"><strong>{feedbackTask.title}</strong><p>{feedbackTask.attempt?.feedback}</p></div>}
        <p>{overview ? `已完成 ${overview.completed_core_courses}/${overview.total_core_courses} 门 · 学习位置自动保存` : "可以打字，也可以点话筒说话。"}</p>
        {next?.kind === "handoff" ? <CoachPostReview onAsk={onChooseExample} /> : <button className="v2-primary" disabled={starting} onClick={() => canResume ? onContinueCourse(courseId) : onChooseExample("我想从家政入门开始学，你能陪我一起吗？")}><span>{starting ? "正在准备…" : primaryLabel}</span><ArrowRight aria-hidden="true" size={20} /></button>}
        {!!outcomes?.awaiting_review && <p role="status">{outcomes.awaiting_review} 次复述等待教练复核。{next?.kind === "handoff" ? "有不清楚的地方，可以继续问老师。" : "等待时也能继续学习。"}</p>}
      </>}
    </article>
    <details className="v2-more"><summary>不知道问什么？</summary><div className="v2-examples">{examples.map((example) => <button key={example} onClick={() => onChooseExample(example)}><span>{example}</span><ArrowRight aria-hidden="true" size={17} /></button>)}</div></details>
  </section>;
}
