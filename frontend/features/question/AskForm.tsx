"use client";

import { ArrowLeft, ArrowRight, BookOpenCheck, Bot, CircleHelp, FileCheck2, Lightbulb, LockKeyhole, PencilLine, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { answerQuestion, AppError, confirmQuestion, createQuestion } from "@/lib/api";
import type { QuestionRequest } from "@/lib/types";

const examples = ["厨房油污，应该先擦哪里？", "清洁剂为什么不能随便混用？", "洗衣前应该先检查什么？"];

export function AskForm({ initialQuestion }: { initialQuestion: string }) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<QuestionRequest | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (result) requestAnimationFrame(() => resultRef.current?.focus());
  }, [result]);

  function validate() {
    const value = question.trim();
    if (value.length < 4) return "请再多写一点，让我们知道你具体想学什么。";
    if (value.length > 200) return "问题有点长，请精简到200字以内。";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      idempotencyRef.current ??= crypto.randomUUID();
      const created = await createQuestion(question.trim(), idempotencyRef.current);
      const answered = await answerQuestion(created.id);
      setResult(answered);
      setSubmitting(false);
    } catch (caught) {
      setSubmitting(false);
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  function askAgain() {
    setResult(null);
    setQuestion("");
    setError("");
    idempotencyRef.current = null;
  }

  async function continueLearning() {
    if (!result?.lesson_id) return;
    const session = await confirmQuestion(result.id);
    router.push(`/learn/${session.id}`);
  }

  return (
    <main id="main-content" className="flow-shell">
      <header className="flow-topbar">
        <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={20} />返回首页</Link>
        <span className="soft-chip soft-chip--mint"><Bot aria-hidden="true" size={16} />学习助手</span>
      </header>

      <section className="flow-intro">
        <p className="section-kicker">阿嬷 AI 老师</p>
        <h1>{result ? "先看回答" : "你想问什么？"}</h1>
        <p>{result ? "看完回答，再决定要不要学习相关课程。" : "像平时说话一样写下家政问题。"}</p>
      </section>

      {result ? (
        <QuestionResult ref={resultRef} result={result} onContinue={continueLearning} onAskAgain={askAgain} />
      ) : (
        <>
          {error && <div ref={errorRef} className="form-error" role="alert" tabIndex={-1}><strong>这个问题还不能提交</strong><span>{error}</span></div>}

          <form className="question-form" onSubmit={submit} noValidate>
            <label htmlFor="question">你的问题</label>
            <div className="textarea-wrap">
              <PencilLine aria-hidden="true" size={22} />
              <textarea
                id="question"
                value={question}
                onChange={(event) => { setQuestion(event.target.value); idempotencyRef.current = null; if (error) setError(""); }}
                onBlur={() => question.trim() && setError(validate())}
                aria-describedby="question-help question-count"
                aria-invalid={Boolean(error)}
                placeholder="例如：厨房油污应该先擦哪里？"
                rows={6}
                maxLength={220}
                autoFocus
              />
            </div>
            <div className="field-meta"><span id="question-help">一次只问一个问题</span><span id="question-count">{question.length}/200</span></div>

            <button className="rainbow-button" type="submit" disabled={submitting}>
              <span>{submitting ? "正在查找回答…" : "马上提问"}</span>
              {!submitting && <ArrowRight aria-hidden="true" size={22} />}
            </button>
          </form>

          <section className="example-panel" aria-labelledby="examples-title">
            <div className="example-panel__title"><Lightbulb aria-hidden="true" size={20} /><h2 id="examples-title">也可以直接选一个</h2></div>
            <div className="example-list">
              {examples.map((example) => <button key={example} type="button" onClick={() => { setQuestion(example); setError(""); }}>{example}<ArrowRight aria-hidden="true" size={18} /></button>)}
            </div>
          </section>

          <p className="privacy-card"><ShieldCheck aria-hidden="true" size={18} />AI 只使用已审核课程；找不到可靠内容时不会自由编答案。</p>
          <p className="privacy-card"><LockKeyhole aria-hidden="true" size={18} />请不要填写真实姓名、住址、电话或孩子姓名。</p>
        </>
      )}
    </main>
  );
}

function QuestionResult({ ref, result, onContinue, onAskAgain }: { ref: React.Ref<HTMLElement>; result: QuestionRequest; onContinue: () => Promise<void>; onAskAgain: () => void }) {
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState("");
  const available = Boolean(result.answer);
  const isBlocked = result.status === "blocked";
  const isNoMatch = result.status === "no_match";
  const isModel = result.answer_mode === "model";

  async function openCourse() {
    setStarting(true);
    setActionError("");
    try { await onContinue(); }
    catch (caught) { setActionError(caught instanceof AppError ? caught.message : "相关课程暂时打不开，请稍后再试。"); }
    finally { setStarting(false); }
  }

  if (isBlocked) return <section ref={ref} className="flow-card state-card state-card--danger ask-result-card" tabIndex={-1} aria-live="polite"><div className="state-icon"><ShieldAlert aria-hidden="true" size={34} /></div><p className="section-kicker">安全提醒 · {result.risk_level}</p><h2>这个问题需要专业帮助</h2><p>{result.message}</p><p className="urgent-box">{result.next_action}</p><button className="secondary-action" type="button" onClick={onAskAgain}>换一个家政问题</button></section>;

  if (isNoMatch) return <section ref={ref} className="flow-card state-card ask-result-card" tabIndex={-1} aria-live="polite"><div className="state-icon state-icon--sky"><CircleHelp aria-hidden="true" size={34} /></div><p className="section-kicker">这次先不随便回答</p><h2>还没有找到可靠内容</h2><p>{result.message}</p><button className="rainbow-button" type="button" onClick={onAskAgain}><span>换个问题再问</span><ArrowRight aria-hidden="true" size={22} /></button></section>;

  return <section ref={ref} className="flow-card ai-answer-card ask-result-card" tabIndex={-1} aria-live="polite">
    <div className={`ai-answer-mode ${isModel ? "is-model" : ""}`}><Sparkles aria-hidden="true" size={17} /><strong>{isModel ? "AI 生成回答" : available ? "已审核课程整理" : "AI 暂停生成"}</strong></div>
    <h2>{available ? "阿嬷 AI 老师这样回答" : "相关课程还在等待审核"}</h2>
    {available ? <><p className="ai-answer-copy">{result.answer}</p><SpeakButton text={result.answer ?? ""} label="播报回答" /></> : <div className="ai-unavailable"><ShieldCheck aria-hidden="true" size={23} /><div><strong>这次不自由编答案</strong><p>{result.message}</p></div></div>}
    {result.knowledge_refs.length > 0 && <div className="ai-sources"><strong>回答依据</strong>{result.knowledge_refs.map((source, index) => <div key={`${source.type}-${index}`}><FileCheck2 aria-hidden="true" size={18} /><span>{source.type === "course" ? `${source.title} · 第${source.version}版` : source.name}</span></div>)}</div>}
    <div className="ask-learning-prompt"><BookOpenCheck aria-hidden="true" size={25} /><div><strong>还想学得更清楚？</strong><p>{result.next_action ?? "进入相关课程，可以查看完整步骤并做理解检查。"}</p></div></div>
    {actionError && <div className="quiz-feedback" role="alert">{actionError}</div>}
    <button className="rainbow-button" type="button" onClick={() => void openCourse()} disabled={starting}><span>{starting ? "正在打开课程…" : "去学习相关课程"}</span><ArrowRight aria-hidden="true" size={22} /></button>
    <button className="secondary-action" type="button" onClick={onAskAgain}>再问一个问题</button>
  </section>;
}
