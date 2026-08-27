"use client";

import { ArrowUp, Image as ImageIcon, Paperclip, Plus, ScanLine, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { AppError, createQuestion } from "@/lib/api";

export function HomeComposer() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 4) { setError("请再多说一点，让我知道你具体想学什么。"); return; }
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
    <div className="composer-dock">
      <div className={expanded ? "attachment-tray is-open" : "attachment-tray"} aria-hidden={!expanded}>
        <ComposerLink href="/ask" label="拍照描述" icon={ScanLine} />
        <ComposerLink href="/ask" label="图片问题" icon={ImageIcon} />
        <ComposerLink href="/ask" label="文字提问" icon={Paperclip} />
      </div>
      {error && <p className="composer-error" role="alert">{error}</p>}
      <form className="home-composer" onSubmit={submit}>
        <button className="composer-round-button" type="button" aria-label={expanded ? "收起更多方式" : "展开更多方式"} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? <X aria-hidden="true" size={23} /> : <Plus aria-hidden="true" size={24} />}</button>
        <label className="sr-only" htmlFor="home-question">输入想学的问题</label>
        <input id="home-question" value={question} onChange={(event) => { setQuestion(event.target.value); idempotencyRef.current = null; if (error) setError(""); }} placeholder={submitting ? "正在帮你看…" : "输入你想学的问题"} maxLength={200} autoComplete="off" disabled={submitting} />
        <button className="composer-send-button" type="submit" aria-label="提交问题" disabled={!question.trim() || submitting}><ArrowUp aria-hidden="true" size={22} /></button>
      </form>
      <span className="composer-helper">一次只问一件事 · 请勿填写个人隐私</span>
    </div>
  );
}

function ComposerLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof ScanLine }) {
  return <Link href={href}><span><Icon aria-hidden="true" size={21} /></span>{label}</Link>;
}
