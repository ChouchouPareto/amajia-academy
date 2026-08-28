"use client";

import { ArrowLeft, ArrowRight, Bot, Lightbulb, LockKeyhole, PencilLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { AppError, createQuestion } from "@/lib/api";

const examples = ["厨房油污，应该先擦哪里？", "清洁剂为什么不能随便混用？", "洗衣前应该先检查什么？"];

export function AskForm({ initialQuestion }: { initialQuestion: string }) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const result = await createQuestion(question.trim(), idempotencyRef.current);
      router.push(`/learn/question-${result.id}`);
    } catch (caught) {
      setSubmitting(false);
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <main id="main-content" className="flow-shell">
      <header className="flow-topbar">
        <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={20} />返回首页</Link>
        <span className="soft-chip soft-chip--mint"><Bot aria-hidden="true" size={16} />AI 学习助手</span>
      </header>

      <section className="flow-intro">
        <p className="section-kicker">阿嬷 AI 老师</p>
        <h1>你想问什么？</h1>
        <p>像平时说话一样写下家政问题。系统会先确认理解，再从已审核课程中找答案。</p>
      </section>

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
          <span>{submitting ? "正在理解你的问题…" : "问问 AI 老师"}</span>
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
    </main>
  );
}
