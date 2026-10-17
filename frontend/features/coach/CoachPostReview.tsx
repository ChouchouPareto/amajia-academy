"use client";
import { useEffect, useRef, useState } from "react";
import { getLearningReport, saveAssessmentAnswer, startAssessment, submitAssessment } from "@/lib/api";
import type { AssessmentAttempt, LearningReport } from "@/lib/types";
import { SpeakButton } from "@/components/SpeakButton";

export function CoachPostReview({ onAsk }: {onAsk: (question: string) => void}) {
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const question = attempt?.questions.find((item) => !attempt.answers[item.id]);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [reportError, setReportError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (attempt?.status !== "submitted") return;
    let active = true;
    getLearningReport().then((value) => { if (active) { setReport(value); setReportError(""); } })
      .catch(() => { if (active) setReportError("回顾已保存，薄弱点暂时没读到。"); });
    return () => { active = false; };
  }, [attempt?.status, retry]);
  async function act(answer?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (!attempt) { key.current ??= crypto.randomUUID(); setAttempt(await startAssessment("post", key.current)); }
      else {
        const saved = answer && question ? await saveAssessmentAnswer(attempt.id, question.id, answer) : attempt;
        setAttempt(saved);
        if (saved.questions.every((item) => saved.answers[item.id])) {
          const result = await submitAssessment(saved.id);
          setAttempt({...saved, status: "submitted", score: result.score});
        }
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "暂时没有保存，请重试。"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="outcome-reflection">
    {!attempt ? <><h3>一起回顾几个工作情景</h3><p>一次看一个，随时可以停下。回答会保存，不必跳出对话。</p><button className="v2-primary" disabled={busy} onClick={() => void act()}>{busy ? "正在恢复…" : "开始或继续学后回顾"}</button></>
      : attempt.status === "submitted" ? <><h3>学后回顾已保存</h3><p>本次线上理解得分：{attempt.score} 分。这不是实操成绩，也不代表上岗资格。</p>
        {report?.review_knowledge_points.length ? <><p>先把这几处再讲清楚，不用把整套题重新做一遍。</p><div className="outcome-actions">{report.review_knowledge_points.slice(0, 3).map((point) => <button className="v2-secondary" key={point} onClick={() => onAsk(`我在学后回顾中对「${point}」还不太明白，请结合已审核的课程再讲讲，不要替我判定实操合格。`)}>{point} · 问老师</button>)}</div></> : report ? <p>这次情景判断都回答正确，下一步仍需由教练核验真实操作。</p> : !reportError ? <p role="status">正在整理需要再讲的地方…</p> : null}
        {reportError && <p role="alert">{reportError}<button className="v2-secondary" onClick={() => setRetry((value) => value + 1)}>重试读取薄弱点</button></p>}
        <details><summary>接下来怎么做？</summary><p>完成复述复核，并由线下教练检查实际动作与安全习惯。没有课前测评时，不计算提升幅度；平台不承诺提供岗位。</p></details></>
      : question ? <><p>已回顾 {Object.keys(attempt.answers).length}/{attempt.questions.length} 个情景</p><h3>{question.prompt}</h3><SpeakButton text={question.prompt} label="听这个情景" /><div className="coach-answer-options">{question.options.map((option) => <button key={option.id} disabled={busy} onClick={() => void act(option.id)}><span>{option.id.toUpperCase()}</span><strong>{option.label}</strong></button>)}</div></>
      : <button className="v2-primary" disabled={busy} onClick={() => void act()}>保存回顾结果</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
