"use client";
import { useEffect, useState } from "react";
import { getOutcomes, type LearningOutcomes } from "@/lib/outcomes";
import { PracticeReflection } from "./PracticeReflection";
import { useReturnRefresh } from "@/lib/use-return-refresh";

export function LearningOutcomeSummary() {
  const [state, setState] = useState<LearningOutcomes | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const returned = useReturnRefresh();
  useEffect(() => { let active = true; getOutcomes().then((value) => { if (active) { setState(value); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "记录读取失败"); }); return () => { active = false; }; }, [attempt, returned]);
  return <section className="outcome-summary">
    <h2>从听懂，到说得清</h2>
    {!state && !error && <p role="status">正在读取学习成果…</p>}
    {error && <p role="alert">{error} <button onClick={() => { setError(""); setAttempt((value) => value + 1); }}>重试</button></p>}
    {state && <><p>课程完成 {state.course_completed}/{state.total_courses} · 复述已确认 {state.teachback_reviewed} · 等待复核 {state.awaiting_review}</p><p className="outcome-note">{state.boundary}</p>
      {state.tasks.map((task) => <details key={task.session_id}><summary>{task.title} · {task.attempt?.status === "reviewed" ? "复述已确认" : task.attempt?.status === "submitted" ? "等待教练" : task.attempt?.status === "needs_revision" ? "需要补充" : "试着复述"}</summary><PracticeReflection sessionId={task.session_id} onSaved={() => setAttempt((value) => value + 1)} /></details>)}
    </>}
  </section>;
}
