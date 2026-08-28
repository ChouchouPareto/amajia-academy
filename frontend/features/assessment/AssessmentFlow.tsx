"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AppError, saveAssessmentAnswer, startAssessment, submitAssessment } from "@/lib/api";
import type { AssessmentAttempt, AssessmentResult } from "@/lib/types";
import { SpeakButton } from "@/components/SpeakButton";

export function AssessmentFlow({ kind }: { kind: "pre" | "post" }) {
  const keyRef = useRef(`${kind}-${crypto.randomUUID()}`);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startAssessment(kind, keyRef.current)
      .then((value) => {
        if (cancelled) return;
        setAttempt(value);
        if (value.status === "submitted" && value.score !== null) {
          setResult({ attempt_id: value.id, kind: value.kind, status: "submitted", score: value.score, correct_count: 0, question_count: value.questions.length, knowledge_point_results: {}, is_official: true });
        } else {
          const firstOpen = value.questions.findIndex((question) => !value.answers[question.id]);
          setCurrent(firstOpen < 0 ? value.questions.length - 1 : firstOpen);
        }
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof AppError ? caught.message : "这次测一测暂时打不开。"); });
    return () => { cancelled = true; };
  }, [kind]);

  async function choose(value: string) {
    if (!attempt || saving) return;
    const question = attempt.questions[current];
    setSaving(true);
    try {
      const updated = await saveAssessmentAnswer(attempt.id, question.id, value);
      setAttempt(updated);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "答案没有保存，请再试一次。");
    } finally { setSaving(false); }
  }

  async function next() {
    if (!attempt) return;
    if (current < attempt.questions.length - 1) { setCurrent((value) => value + 1); return; }
    setSaving(true);
    try { setResult(await submitAssessment(attempt.id)); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "还有题目没有完成。"); }
    finally { setSaving(false); }
  }

  if (error && !attempt) return <main className="flow-shell"><header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft size={20} />返回首页</Link></header><section className="flow-card state-card"><AlertTriangle size={34} /><h1>暂时不能开始</h1><p>{error}</p><Link className="rainbow-button" href={kind === "post" ? "/housekeeping" : "/"}><span>{kind === "post" ? "查看学习路径" : "返回首页"}</span><ArrowRight size={22} /></Link></section></main>;
  if (!attempt) return <main className="flow-shell"><div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在准备题目</strong></div></main>;

  if (result) return (
    <main className="flow-shell"><header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft size={20} />返回首页</Link></header>
      <section className="flow-card assessment-result"><div className="complete-mark"><Check size={38} /></div><p className="section-kicker">{kind === "pre" ? "基础情况已保存" : "学习后测已完成"}</p><h1>{result.score}分</h1>
        <p>{kind === "pre" ? "这不是考试。接下来从家政入门课开始，一步一步学。" : "你的学习结果已经保存，可以查看前后对比。"}</p>
        <Link className="rainbow-button" href={kind === "pre" ? "/housekeeping" : "/report"}><span>{kind === "pre" ? "开始第一门课" : "查看学习提升"}</span><ArrowRight size={22} /></Link>
      </section>
    </main>
  );

  const question = attempt.questions[current];
  const answer = attempt.answers[question.id] ?? "";
  const percent = Math.round(((current + 1) / attempt.questions.length) * 100);

  return (
    <main className="flow-shell assessment-shell">
      <header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft size={20} />稍后再做</Link><span className="prototype-badge"><ClipboardCheck size={16} />{kind === "pre" ? "学习前测" : "学习后测"}</span></header>
      <section className="assessment-progress"><span>第{current + 1}题，共{attempt.questions.length}题</span><strong>{percent}%</strong><div><i style={{ width: `${percent}%` }} /></div></section>
      <section className="flow-card assessment-card">
        {question.is_safety_critical && <span className="safety-question"><ShieldCheck size={17} />这是一道安全题</span>}
        <p className="section-kicker">{question.knowledge_point}</p><h1>{question.prompt}</h1><SpeakButton text={`${question.prompt}。${question.options.map((option) => `${option.id}，${option.label}`).join("。")}`} label="播报题目" />
        <div className="answer-list">{question.options.map((option) => <button key={option.id} type="button" className={answer === option.id ? "answer-choice is-selected" : "answer-choice"} onClick={() => void choose(option.id)} disabled={saving}><span>{option.id.toUpperCase()}</span><strong>{option.label}</strong>{answer === option.id && <Check size={21} />}</button>)}</div>
        {error && <div className="quiz-feedback" role="alert"><RefreshCcw size={18} />{error}</div>}
        <button className="rainbow-button" type="button" onClick={() => void next()} disabled={!answer || saving}><span>{saving ? "正在保存…" : current === attempt.questions.length - 1 ? "提交这次测一测" : "下一题"}</span><ArrowRight size={22} /></button>
      </section>
      <p className="prototype-note">答案会自动保存 · 第一次正式结果用于学习前后对比</p>
    </main>
  );
}
