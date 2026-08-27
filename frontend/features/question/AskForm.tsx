"use client";

import { ArrowLeft, ArrowRight, Lightbulb, LockKeyhole, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { AppError, createQuestion } from "@/lib/api";

const examples = ["厨房油污，应该先擦哪里？", "孩子睡前总拖延，怎么安排顺序？", "家里东西太多，应该从哪里开始收？"];

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
        <span className="soft-chip soft-chip--mint">文字提问</span>
      </header>

      <section className="flow-intro">
        <p className="section-kicker">先说一件具体的事</p>
        <h1>你想学什么？</h1>
        <p>像平时说话一样写下来就可以，不用想专业词。</p>
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
          <span>{submitting ? "正在打开确认页…" : "帮我看看这个问题"}</span>
          {!submitting && <ArrowRight aria-hidden="true" size={22} />}
        </button>
      </form>

      <section className="example-panel" aria-labelledby="examples-title">
        <div className="example-panel__title"><Lightbulb aria-hidden="true" size={20} /><h2 id="examples-title">也可以直接选一个</h2></div>
        <div className="example-list">
          {examples.map((example) => <button key={example} type="button" onClick={() => { setQuestion(example); setError(""); }}>{example}<ArrowRight aria-hidden="true" size={18} /></button>)}
        </div>
      </section>

      <p className="privacy-card"><LockKeyhole aria-hidden="true" size={18} />请不要填写真实姓名、住址、电话或孩子姓名。</p>
    </main>
  );
}
