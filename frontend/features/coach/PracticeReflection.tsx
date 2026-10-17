"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import { getPractice, submitPractice, type PracticeTask } from "@/lib/outcomes";
import { useReturnRefresh } from "@/lib/use-return-refresh";

export type PracticeControls = { acceptDraft: (text: string) => boolean };

export function PracticeReflection({ sessionId, onSaved, ref, onComposerModeChange, composerActive = false }: {sessionId: number; onSaved?: () => void; ref?: React.Ref<PracticeControls>; onComposerModeChange?: (active: boolean) => void; composerActive?: boolean}) {
  const [task, setTask] = useState<PracticeTask | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const composing = composerActive;
  const [draftNotice, setDraftNotice] = useState("");
  const returned = useReturnRefresh();
  const mutation = useRef(0);
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const canEdit = task?.can_submit && (!task.attempt || task.attempt.status === "needs_revision");
  useEffect(() => {
    if (lock.current) return;
    let active = true;
    const epoch = mutation.current;
    getPractice(sessionId).then((value) => { if (active && epoch === mutation.current) { setTask(value); setText((draft) => draft || value.attempt?.response_text || ""); } })
      .catch((caught) => { if (active && epoch === mutation.current) setError(caught instanceof Error ? caught.message : "复述记录暂时没有读到。"); });
    return () => { active = false; };
  }, [sessionId, refresh, returned]);

  useImperativeHandle(ref, () => ({ acceptDraft(value: string) {
    if (!composing || !canEdit || lock.current) return false;
    setText(value); key.current = null; onComposerModeChange?.(false);
    setDraftNotice("已填入做法，还没有提交。看一遍，再交给教练。");
    requestAnimationFrame(() => document.getElementById(`practice-${sessionId}`)?.focus());
    return true;
  } }));

  async function save() {
    if (!task || lock.current) return;
    if (text.trim().length < 20) { setError("请至少写20字，把顺序、安全和交接说清楚。"); return; }
    lock.current = true; setBusy(true); setError("");
    mutation.current += 1;
    key.current ??= crypto.randomUUID();
    try { setTask(await submitPractice(sessionId, text.trim(), key.current, task.attempt?.attempt_no ?? 0)); key.current = null; onComposerModeChange?.(false); setDraftNotice(""); onSaved?.(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "没有提交成功，你写的内容还在。"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="outcome-reflection" aria-label="说说你的做法">
    <h3>{task?.attempt?.status === "reviewed" ? "这次复述已由教练确认" : task?.attempt?.status === "submitted" ? "已收到，等待教练复核" : "换你说说，会怎么做？"}</h3>
    {!task && !error && <p role="status">正在读取复述记录…</p>}
    {task && <>
      {task.attempt?.feedback && <div className="outcome-feedback"><strong>教练给你的建议</strong><p>{task.attempt.feedback}</p></div>}
      {canEdit && <><p>{task.prompt}</p><SpeakButton text={task.prompt} label="听老师提问" /></>}
      {task.attempt?.status === "submitted" && <p role="status">回来时会更新复核结果；等待期间也能继续学。</p>}
      {task.content_status !== "published" && <p className="outcome-note">内测候选课：内容仍待专业审核。</p>}
      {canEdit ? <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        {onComposerModeChange && <button className="v2-secondary" type="button" disabled={busy} aria-pressed={composing} onClick={() => { const active = !composing; onComposerModeChange(active); if (active) requestAnimationFrame(() => document.getElementById("coach-question")?.focus()); }}>{composing ? "取消对话框作答" : "用下面对话框回答"}</button>}
        <label htmlFor={`practice-${sessionId}`}>我的做法（20—1200字）</label>
        <textarea id={`practice-${sessionId}`} value={text} maxLength={1200} rows={4} disabled={busy} onChange={(event) => { setText(event.target.value); key.current = null; setDraftNotice(""); }} aria-describedby={`practice-privacy-${sessionId}`} />
        {draftNotice && <p role="status">{draftNotice}</p>}
        <p id={`practice-privacy-${sessionId}`} className="outcome-note">只描述假想任务。不要填写客户姓名、地址或联系方式；内容将交给本平台教练复核。</p>
        <button type="submit" className="v2-primary" disabled={busy}>{busy ? "正在提交…" : "交给教练看看"}</button>
      </form> : task.attempt ? <><details><summary>看看我说的做法</summary><p className="outcome-quote">{task.attempt.response_text}</p></details><button className="v2-secondary" type="button" onClick={() => { setError(""); setRefresh((value) => value + 1); }}>刷新复核结果</button></> : <p>先完成课程理解检查，再来试着复述。</p>}
      <details className="v2-more"><summary>这代表什么？</summary><p>{task.boundary}</p></details>
    </>}
    {error && <div role="alert"><p>{error}</p><button className="v2-secondary" type="button" onClick={() => { setError(""); setRefresh((value) => value + 1); }}>重新读取记录</button></div>}
  </section>;
}
