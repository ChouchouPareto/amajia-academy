"use client";

import { ArrowRight, Bot, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AppError, createQuestion, getAiCapability } from "@/lib/api";
import type { AiCapability } from "@/lib/types";

const examples = ["厨房油污先擦哪里？", "洗衣前先检查什么？"];

export function HomeComposer() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [capability, setCapability] = useState<AiCapability | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAiCapability().then((value) => { if (!cancelled) setCapability(value); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 4) { setError("请再多说一点，让 AI 老师知道你具体想学什么。"); return; }
    setSubmitting(true);
    try {
      idempotencyRef.current ??= crypto.randomUUID();
      const result = await createQuestion(value, idempotencyRef.current);
      router.push(`/learn/question-${result.id}`);
    } catch (caught) {
      setSubmitting(false);
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
    }
  }

  return (
    <section className="ai-teacher-card" aria-labelledby="ai-teacher-title">
      <div className="ai-teacher-heading">
        <span className="ai-teacher-icon"><Bot aria-hidden="true" size={25} /></span>
        <div><p><Sparkles aria-hidden="true" size={15} />AI 学习助手</p><h2 id="ai-teacher-title">问问阿嬷 AI 老师</h2></div>
        <span className={`ai-status ai-status--${capability?.mode ?? "loading"}`} role="status">{capability?.label ?? "正在检查"}</span>
      </div>
      <p className="ai-teacher-copy">{capability?.message ?? "正在检查可用的审核课程与 AI 能力。"}</p>
      {error && <p className="ai-inline-error" role="alert">{error}</p>}
      <form className="ai-teacher-form" onSubmit={submit}>
        <label htmlFor="home-ai-question">你想问的家政问题</label>
        <div><input id="home-ai-question" value={question} onChange={(event) => { setQuestion(event.target.value); setError(""); idempotencyRef.current = null; }} placeholder="例如：清洁剂为什么不能混用？" maxLength={200} disabled={submitting} /><button type="submit" disabled={submitting || question.trim().length < 4}><span>{submitting ? "正在理解" : "问 AI 老师"}</span><ArrowRight aria-hidden="true" size={20} /></button></div>
      </form>
      <div className="ai-examples" aria-label="示例问题">{examples.map((example) => <button type="button" key={example} onClick={() => setQuestion(example)}>{example}</button>)}</div>
      <p className="ai-boundary"><ShieldCheck aria-hidden="true" size={17} />只依据已审核课程回答；没有可靠内容时会明确停下。</p>
    </section>
  );
}
