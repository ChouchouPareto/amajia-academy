"use client";

import { ArrowRight, BookOpenCheck, Bot, CircleHelp, FileCheck2, GraduationCap, History, LockKeyhole, Menu, Mic, Plus, SendHorizontal, Settings, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { answerQuestion, AppError, confirmQuestion, createQuestion } from "@/lib/api";
import type { QuestionRequest } from "@/lib/types";

const examples = ["厨房油污，应该先擦哪里？", "清洁剂为什么不能随便混用？", "洗衣前应该先检查什么？"];
type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((event: SpeechEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type RecognitionConstructor = new () => Recognition;

function getRecognition() {
  if (typeof window === "undefined") return null;
  const voiceWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition ?? null;
}

export function AskForm({ initialQuestion }: { initialQuestion: string }) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<QuestionRequest | null>(null);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => { if (result) requestAnimationFrame(() => resultRef.current?.focus()); }, [result]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("keydown", closeOnEscape); recognitionRef.current?.stop(); };
  }, []);

  function validate() {
    const value = question.trim();
    if (value.length < 4) return "请再多说一点，让我知道你具体想学什么。";
    if (value.length > 200) return "问题有点长，请精简到200字以内。";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validate();
    if (message) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setSubmitting(true); setError("");
    try {
      idempotencyRef.current ??= crypto.randomUUID();
      const created = await createQuestion(question.trim(), idempotencyRef.current);
      setResult(await answerQuestion(created.id));
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setSubmitting(false); }
  }

  function chooseExample(example: string) { setQuestion(example); setError(""); setVoiceMessage(""); idempotencyRef.current = null; }
  function askAgain() {
    setResult(null); setQuestion(""); setError(""); setVoiceMessage(""); idempotencyRef.current = null;
    requestAnimationFrame(() => document.getElementById("coach-question")?.focus());
  }
  function toggleVoiceInput() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const RecognitionClass = getRecognition();
    if (!RecognitionClass) { setVoiceMessage("当前浏览器还不能听写，请先使用文字提问。"); return; }
    const recognition = new RecognitionClass();
    recognition.lang = "zh-CN"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => { const text = event.results[0]?.[0]?.transcript?.trim() ?? ""; if (text) chooseExample(text); };
    recognition.onerror = () => setVoiceMessage("这次没有听清，可以再说一次，或者直接打字。");
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition; setVoiceMessage("请说出一个家政问题，说完后我会把文字放进输入框。"); setListening(true); recognition.start();
  }
  async function continueLearning() {
    if (!result?.lesson_id) return;
    const session = await confirmQuestion(result.id);
    router.push(`/learn/${session.id}`);
  }

  return <main id="main-content" className="coach-shell">
    <header className="coach-topbar">
      <button className="coach-icon-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="打开学习菜单" aria-expanded={drawerOpen}><Menu aria-hidden="true" size={27} /></button>
      <div className="coach-brand" aria-label="阿嬷学院 AI 陪学"><strong>阿嬷 AI 老师</strong><span>家政入门陪学</span></div>
      <Link className="coach-icon-button" href="/housekeeping" aria-label="打开家政课程"><GraduationCap aria-hidden="true" size={27} /></Link>
    </header>
    <CoachDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

    <section className={`coach-stage ${result ? "has-result" : ""}`} aria-label="AI 陪学对话">
      {!result && <div className="coach-welcome">
        <div className="coach-avatar" aria-hidden="true"><Bot size={30} /></div>
        <p className="coach-kicker">专业版测试期免费</p>
        <h1>你好，我是阿嬷 AI 老师</h1>
        <p className="coach-welcome-copy">我会陪你学家政。可以打字，也可以直接说，今天想先问什么？</p>
        <div className="coach-suggestions" aria-label="推荐问题">{examples.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}><span>{example}</span><ArrowRight aria-hidden="true" size={20} /></button>)}</div>
      </div>}
      {result && <div className="coach-thread">
        <article className="coach-user-turn" aria-label="你的问题"><span>你问</span><p>{result.original_text}</p></article>
        <QuestionResult ref={resultRef} result={result} onContinue={continueLearning} onAskAgain={askAgain} />
      </div>}
    </section>

    {(error || voiceMessage) && <div ref={errorRef} className={`coach-notice ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} tabIndex={error ? -1 : undefined}>{error || voiceMessage}</div>}
    <div className="coach-composer-wrap">
      {!result && <div className="coach-quick-row" aria-label="快捷提问">{examples.map((example, index) => <button key={example} type="button" onClick={() => chooseExample(example)} aria-label={`选择问题：${example}`}>{index === 0 ? "厨房清洁" : index === 1 ? "清洁剂安全" : "衣物洗涤"}</button>)}</div>}
      <form className="coach-composer" onSubmit={submit} noValidate>
        <Link className="composer-side-button" href="/tools" aria-label="打开学习工具"><Plus aria-hidden="true" size={25} /></Link>
        <label className="sr-only" htmlFor="coach-question">写下家政问题</label>
        <textarea id="coach-question" value={question} onChange={(event) => { setQuestion(event.target.value); idempotencyRef.current = null; if (error) setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-describedby="coach-question-help" aria-invalid={Boolean(error)} placeholder={listening ? "正在听你说…" : "发消息或点话筒说话"} rows={1} maxLength={200} disabled={submitting || Boolean(result)} />
        <span className="sr-only" id="coach-question-help">一次只问一个问题，最多200字</span>
        {question.trim() && !result ? <button className="composer-submit" type="submit" disabled={submitting} aria-label={submitting ? "正在查找回答" : "发送问题"}>{submitting ? <span className="composer-loader" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" size={23} />}</button> : <button className={`composer-mic ${listening ? "is-listening" : ""}`} type="button" onClick={toggleVoiceInput} disabled={Boolean(result)} aria-label={listening ? "停止听写" : "语音输入"} aria-pressed={listening}><Mic aria-hidden="true" size={24} /></button>}
      </form>
      <p className="coach-footnote"><ShieldCheck aria-hidden="true" size={14} />只使用已审核课程回答</p>
    </div>
  </main>;
}

function CoachDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <div className={`coach-drawer-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
    <button className="coach-drawer-scrim" type="button" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="关闭学习菜单" />
    <aside className="coach-drawer" role="dialog" aria-modal="true" aria-label="学习菜单">
      <div className="coach-drawer-head"><div><strong>阿嬷学院</strong><span>从入门到上岗</span></div><button type="button" onClick={onClose} aria-label="关闭学习菜单"><X aria-hidden="true" size={24} /></button></div>
      <Link className="drawer-primary" href="/ask" onClick={onClose}><Plus aria-hidden="true" size={21} />开始新提问</Link>
      <nav aria-label="学习功能">
        <DrawerLink href="/housekeeping" icon={<BookOpenCheck />} title="家政入门课程" detail="六门基础课" onClick={onClose} />
        <DrawerLink href="/records" icon={<History />} title="我的学习记录" detail="继续上次学习" onClick={onClose} />
        <DrawerLink href="/career-path" icon={<GraduationCap />} title="学习与上岗" detail="技能和证书概览" onClick={onClose} />
        <DrawerLink href="/account" icon={<Settings />} title="账号与大字模式" detail="管理学习设置" onClick={onClose} />
      </nav>
      <p><LockKeyhole aria-hidden="true" size={17} />测试数据仅用于改进学习体验</p>
    </aside>
  </div>;
}

function DrawerLink({ href, icon, title, detail, onClick }: { href: string; icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <Link href={href} onClick={onClick}><span className="drawer-link-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight aria-hidden="true" size={18} /></Link>;
}

function QuestionResult({ ref, result, onContinue, onAskAgain }: { ref: React.Ref<HTMLElement>; result: QuestionRequest; onContinue: () => Promise<void>; onAskAgain: () => void }) {
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState("");
  const available = Boolean(result.answer);
  async function openCourse() { setStarting(true); setActionError(""); try { await onContinue(); } catch (caught) { setActionError(caught instanceof AppError ? caught.message : "相关课程暂时打不开，请稍后再试。"); } finally { setStarting(false); } }
  if (result.status === "blocked") return <section ref={ref} className="coach-answer coach-answer--danger" tabIndex={-1} aria-live="polite"><div className="coach-answer-label"><ShieldAlert aria-hidden="true" size={20} /><strong>安全提醒 · {result.risk_level}</strong></div><h2>这个问题需要专业帮助</h2><p>{result.message}</p><button className="coach-text-action" type="button" onClick={onAskAgain}>换一个家政问题</button></section>;
  if (result.status === "no_match") return <section ref={ref} className="coach-answer" tabIndex={-1} aria-live="polite"><div className="coach-answer-label"><CircleHelp aria-hidden="true" size={20} /><strong>这次先不随便回答</strong></div><h2>还没有找到可靠内容</h2><p>{result.message}</p><button className="coach-text-action" type="button" onClick={onAskAgain}>换个问题再问</button></section>;
  return <section ref={ref} className="coach-answer" tabIndex={-1} aria-live="polite">
    <div className="coach-answer-label"><Sparkles aria-hidden="true" size={18} /><strong>{result.answer_mode === "model" ? "阿嬷 AI 老师" : available ? "已审核课程整理" : "AI 暂停生成"}</strong></div>
    <h2>{available ? "先记住这几点" : "相关课程还在等待审核"}</h2>
    {available ? <><p className="coach-answer-copy">{result.answer}</p><SpeakButton text={result.answer ?? ""} label="播报回答" /></> : <div className="coach-unavailable"><ShieldCheck aria-hidden="true" size={22} /><div><strong>这次不自由编答案</strong><p>{result.message}</p></div></div>}
    {result.knowledge_refs.length > 0 && <div className="coach-sources"><strong>回答来自</strong>{result.knowledge_refs.map((source, index) => <div key={`${source.type}-${index}`}><FileCheck2 aria-hidden="true" size={17} /><span>{source.type === "course" ? `${source.title} · 第${source.version}版` : source.name}</span></div>)}</div>}
    {actionError && <div className="coach-action-error" role="alert">{actionError}</div>}
    {result.lesson_id && <button className="coach-course-action" type="button" onClick={() => void openCourse()} disabled={starting}><BookOpenCheck aria-hidden="true" size={22} /><span><strong>{starting ? "正在打开课程…" : "学习完整步骤"}</strong><small>{result.next_action ?? "看完整课程并做一道理解检查"}</small></span><ArrowRight aria-hidden="true" size={22} /></button>}
    <button className="coach-text-action" type="button" onClick={onAskAgain}>继续问一个问题</button>
  </section>;
}
