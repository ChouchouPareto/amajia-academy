"use client";

import { ArrowRight, BookOpenCheck, Bot, Check, CircleHelp, FileCheck2, LockKeyhole, Menu, Mic, Plus, Repeat2, SendHorizontal, Settings, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { CoachJourneyPrompt } from "@/features/coach/CoachJourneyPrompt";
import { HomeVersionSelector } from "@/features/home/HomeVersionSelector";
import { answerQuestion, AppError, confirmQuestion, createCoachConversation, createQuestion, getCoachConversationQuestions, getCoachConversations, getLearningMedia, getLearningOverview, saveLearningProgress, startHousekeepingCourse, submitQuiz } from "@/lib/api";
import type { CoachConversation, LearningOverview, LearningSession, MediaAsset, QuestionRequest } from "@/lib/types";

const examples = ["厨房油污，应该先擦哪里？", "清洁剂为什么不能随便混用？", "洗衣前应该先检查什么？"];
type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((event: SpeechEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type RecognitionConstructor = new () => Recognition;

function getRecognition() {
  if (typeof window === "undefined") return null;
  const voiceWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition ?? null;
}

export function AskForm({ initialQuestion, initialConversationId }: { initialQuestion: string; initialConversationId?: number }) {
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const conversationBootRef = useRef<Promise<number> | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<QuestionRequest | null>(null);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId ?? null);
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [startingJourney, setStartingJourney] = useState(false);

  useEffect(() => {
    let active = true;
    async function restoreConversation() {
      try {
        const id = initialConversationId ?? await (conversationBootRef.current ??= createCoachConversation().then((item) => item.id));
        const [history, recent] = await Promise.all([getCoachConversationQuestions(id), getCoachConversations()]);
        if (!active) return;
        setConversationId(id);
        setConversations(recent);
        if (!initialConversationId) window.history.replaceState(null, "", `/coach?conversation=${id}`);
        const latest = history.at(-1);
        if (!latest) return;
        const restored = latest.status === "waiting_confirmation" && !latest.answer_mode ? await answerQuestion(latest.id) : latest;
        if (!active) return;
        setQuestion(restored.original_text);
        setResult(restored);
        if (restored.status === "confirmed") {
          const session = await confirmQuestion(restored.id);
          if (active) setLearningSession(session);
        }
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof AppError ? caught.message : "暂时无法恢复学习记录，请稍后再试。");
      }
    }
    void restoreConversation();
    return () => { active = false; };
  }, [initialConversationId]);

  useEffect(() => {
    let active = true;
    getLearningOverview().then((value) => { if (active) setOverview(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
      const activeConversationId = conversationId ?? await (conversationBootRef.current ??= createCoachConversation().then((item) => item.id));
      setConversationId(activeConversationId);
      const created = await createQuestion(question.trim(), idempotencyRef.current, activeConversationId);
      setResult(await answerQuestion(created.id));
      setConversations(await getCoachConversations());
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setSubmitting(false); }
  }

  function chooseExample(example: string) { setQuestion(example); setError(""); setVoiceMessage(""); idempotencyRef.current = null; }
  function askAgain() {
    setResult(null); setLearningSession(null); setQuestion(""); setError(""); setVoiceMessage(""); idempotencyRef.current = null;
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
    setLearningSession(await confirmQuestion(result.id));
  }

  async function continueJourneyCourse() {
    if (!overview?.recommended_course_id) return;
    setStartingJourney(true); setError("");
    try {
      setResult(null);
      setLearningSession(await startHousekeepingCourse(overview.recommended_course_id));
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "下一门课暂时打不开，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setStartingJourney(false); }
  }

  function refreshOverview() {
    getLearningOverview().then(setOverview).catch(() => undefined);
  }

  return <main id="main-content" className="coach-shell">
    <header className="coach-topbar">
      <HomeVersionSelector />
      <div className="coach-brand" aria-label="阿嬷学院 AI 陪学"><strong>阿嬷 AI 老师</strong><span>家政入门陪学</span></div>
      <button className="coach-icon-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="打开学习菜单" aria-expanded={drawerOpen}><Menu aria-hidden="true" size={27} /></button>
    </header>
    <CoachDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} conversations={conversations} currentConversationId={conversationId} />

    <section className={`coach-stage ${result ? "has-result" : ""}`} aria-label="AI 陪学对话">
      {!result && !learningSession && <div className="coach-welcome">
        <div className="coach-avatar" aria-hidden="true"><Bot size={30} /></div>
        <p className="coach-kicker">专业版测试期免费</p>
        <h1>你好，我是阿嬷 AI 老师</h1>
        <p className="coach-welcome-copy">我会陪你学家政。可以打字，也可以直接说，今天想先问什么？</p>
        {overview && <CoachJourneyPrompt overview={overview} starting={startingJourney} onContinueCourse={() => void continueJourneyCourse()} />}
        <div className="coach-suggestions" aria-label="推荐问题">{examples.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}><span>{example}</span><ArrowRight aria-hidden="true" size={20} /></button>)}</div>
      </div>}
      {(result || learningSession) && <div className="coach-thread">
        {result && <article className="coach-user-turn" aria-label="你的问题"><span>你问</span><p>{result.original_text}</p></article>}
        {result && <QuestionResult ref={resultRef} result={result} learningStarted={Boolean(learningSession)} onContinue={continueLearning} onAskAgain={askAgain} />}
        {learningSession && <CoachLesson session={learningSession} onSessionChange={setLearningSession} onCompleted={refreshOverview} />}
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

function CoachDrawer({ open, onClose, conversations, currentConversationId }: { open: boolean; onClose: () => void; conversations: CoachConversation[]; currentConversationId: number | null }) {
  return <div className={`coach-drawer-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
    <button className="coach-drawer-scrim" type="button" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="关闭学习菜单" />
    <aside className="coach-drawer" role="dialog" aria-modal="true" aria-label="学习菜单">
      <div className="coach-drawer-head"><div><strong>阿嬷学院</strong><span>从入门到上岗</span></div><button type="button" onClick={onClose} aria-label="关闭学习菜单"><X aria-hidden="true" size={24} /></button></div>
      <Link className="drawer-primary" href="/coach" onClick={onClose}><Plus aria-hidden="true" size={21} />开始新提问</Link>
      {conversations.length > 0 && <section className="coach-history" aria-labelledby="coach-history-title">
        <h2 id="coach-history-title">最近对话</h2>
        <div>{conversations.slice(0, 8).map((conversation) => <Link className={conversation.id === currentConversationId ? "is-current" : ""} key={conversation.id} href={`/coach?conversation=${conversation.id}`} onClick={onClose}><span>{conversation.title}</span><ArrowRight aria-hidden="true" size={17} /></Link>)}</div>
      </section>}
      <nav aria-label="学习功能">
        <DrawerLink href="/choose-mode" icon={<Repeat2 />} title="切换学习方式" detail="基础版或 AI 专业陪学版" onClick={onClose} />
        <DrawerLink href="/account" icon={<Settings />} title="账号与大字模式" detail="管理学习设置" onClick={onClose} />
      </nav>
      <p><LockKeyhole aria-hidden="true" size={17} />测试数据仅用于改进学习体验</p>
    </aside>
  </div>;
}

function DrawerLink({ href, icon, title, detail, onClick }: { href: string; icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <Link href={href} onClick={onClick}><span className="drawer-link-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight aria-hidden="true" size={18} /></Link>;
}

function QuestionResult({ ref, result, learningStarted, onContinue, onAskAgain }: { ref: React.Ref<HTMLElement>; result: QuestionRequest; learningStarted: boolean; onContinue: () => Promise<void>; onAskAgain: () => void }) {
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
    {result.lesson_id && !learningStarted && <button className="coach-course-action" type="button" onClick={() => void openCourse()} disabled={starting}><BookOpenCheck aria-hidden="true" size={22} /><span><strong>{starting ? "正在准备陪学…" : "在对话里继续学习"}</strong><small>{result.next_action ?? "AI 老师会在这里一步一步带你学"}</small></span><ArrowRight aria-hidden="true" size={22} /></button>}
    {!learningStarted && <button className="coach-text-action" type="button" onClick={onAskAgain}>继续问一个问题</button>}
  </section>;
}

function CoachLesson({ session, onSessionChange, onCompleted }: { session: LearningSession; onSessionChange: (session: LearningSession) => void; onCompleted: () => void }) {
  const [phase, setPhase] = useState<"intro" | "step" | "quiz" | "complete">(session.status === "completed" ? "complete" : "intro");
  const [stepIndex, setStepIndex] = useState(session.current_step);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const lesson = session.lesson;
  const step = lesson.steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / lesson.steps.length) * 100);

  useEffect(() => { getLearningMedia(session.id).then(setMedia).catch(() => setMedia([])); }, [session.id]);
  const stepMedia = media.filter((asset) => asset.step_index === stepIndex);

  async function nextStep() {
    if (stepIndex >= lesson.steps.length - 1) { setPhase("quiz"); return; }
    setSaving(true); setFeedback("");
    try {
      const next = stepIndex + 1;
      const updated = await saveLearningProgress(session.id, next);
      onSessionChange(updated); setStepIndex(next);
    } catch (caught) { setFeedback(caught instanceof AppError ? caught.message : "进度没有保存，请再试一次。"); }
    finally { setSaving(false); }
  }

  async function checkAnswer() {
    if (!answer) return;
    setSaving(true); setFeedback("");
    try {
      const checked = await submitQuiz(session.id, answer);
      onSessionChange(checked.session); setFeedback(checked.message);
      if (checked.correct) window.setTimeout(() => { setPhase("complete"); onCompleted(); }, 500);
    } catch (caught) { setFeedback(caught instanceof AppError ? caught.message : "答案没有提交成功，请再试一次。"); }
    finally { setSaving(false); }
  }

  if (phase === "intro") return <section className="coach-lesson-card" aria-live="polite"><div className="coach-answer-label"><Bot aria-hidden="true" size={19} /><strong>现在开始陪你学</strong></div><h2>{lesson.title}</h2><p className="coach-answer-copy">先记住：{lesson.conclusion}</p><div className="coach-safety-line"><ShieldCheck aria-hidden="true" size={20} /><span>{lesson.disclaimer}</span></div><SpeakButton text={`${lesson.conclusion}。安全提醒：${lesson.disclaimer}`} label="听老师讲" /><button className="coach-course-action" type="button" onClick={() => setPhase("step")}><BookOpenCheck aria-hidden="true" size={22} /><span><strong>开始第一步</strong><small>共{lesson.steps.length}个小步骤，每次只学一件事</small></span><ArrowRight aria-hidden="true" size={22} /></button></section>;

  if (phase === "step") return <section className="coach-lesson-card" aria-live="polite"><div className="coach-lesson-progress"><span>第{stepIndex + 1}步，共{lesson.steps.length}步</span><strong>{progress}%</strong></div><div className="coach-lesson-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><p className="coach-kicker">阿嬷 AI 老师正在讲</p><h2>{step.title}</h2><p className="coach-answer-copy">{step.body}</p>{stepMedia.map((asset) => <CoachMediaCard key={asset.id} asset={asset} />)}<SpeakButton text={`${step.title}。${step.body}`} label="播报这一步" />{feedback && <div className="coach-action-error" role="status">{feedback}</div>}<button className="coach-course-action" type="button" onClick={() => void nextStep()} disabled={saving}><Check aria-hidden="true" size={22} /><span><strong>{saving ? "正在保存…" : stepIndex === lesson.steps.length - 1 ? "我明白了，检查一下" : "我明白了，下一步"}</strong><small>学习位置会自动同步到基础版</small></span><ArrowRight aria-hidden="true" size={22} /></button></section>;

  if (phase === "quiz") return <section className="coach-lesson-card" aria-live="polite"><div className="coach-answer-label"><Bot aria-hidden="true" size={19} /><strong>我来检查一下</strong></div><h2>{lesson.quiz.question}</h2><SpeakButton text={`${lesson.quiz.question}。${lesson.quiz.options.map((option) => `${option.id}，${option.label}`).join("。")}`} label="播报题目" /><div className="coach-answer-options" role="radiogroup" aria-label="答案选项">{lesson.quiz.options.map((option) => <button key={option.id} type="button" role="radio" aria-checked={answer === option.id} className={answer === option.id ? "is-selected" : ""} onClick={() => { setAnswer(option.id); setFeedback(""); }}><span>{option.id.toUpperCase()}</span><strong>{option.label}</strong>{answer === option.id && <Check aria-hidden="true" size={20} />}</button>)}</div>{feedback && <div className="coach-action-error" role="status">{feedback}</div>}<button className="coach-course-action" type="button" onClick={() => void checkAnswer()} disabled={!answer || saving}><Check aria-hidden="true" size={22} /><span><strong>{saving ? "正在检查…" : "提交给 AI 老师"}</strong><small>答错了也没关系，我会继续陪你学</small></span><ArrowRight aria-hidden="true" size={22} /></button></section>;

  return <section className="coach-lesson-card coach-lesson-complete" aria-live="polite"><div className="coach-complete-mark"><Check aria-hidden="true" size={32} /></div><p className="coach-kicker">学习记录已经同步</p><h2>这门课学完了</h2><p>你完成了{lesson.steps.length}个步骤和一道理解检查。可以继续问我，也可以切换学习方式查看同一份进度。</p><button className="coach-text-action" type="button" onClick={() => { setPhase("intro"); setStepIndex(0); }}>再听一遍这门课</button></section>;
}

function CoachMediaCard({ asset }: { asset: MediaAsset }) {
  return <figure className="coach-media-card">{asset.media_type === "image" ? <Image src={asset.url} alt={asset.alt_text} width={720} height={480} sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : <video controls preload="metadata" poster={asset.thumbnail_url ?? undefined} aria-label={asset.alt_text}><source src={asset.url} />{asset.transcript && <track kind="captions" label="中文字幕" />}</video>}<figcaption><strong>{asset.title}</strong><span>标准教学素材 · 已审核</span></figcaption></figure>;
}
