"use client";

import { ArrowRight, BookOpenCheck, Check, CircleHelp, FileCheck2, LockKeyhole, Menu, Mic, Plus, Repeat2, SendHorizontal, Settings, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useImperativeHandle, useRef, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { CoachJourneyPrompt } from "@/features/coach/CoachJourneyPrompt";
import { HomeVersionSelector } from "@/features/home/HomeVersionSelector";
import { answerQuestion, AppError, confirmQuestion, createCoachConversation, createQuestion, getCoachConversationQuestions, getCoachConversations, getLearningMastery, getLearningMedia, getLearningOverview, runCoachTurn } from "@/lib/api";
import type { CoachConversation, LearningOverview, LearningSession, MasteryOverview, MediaAsset, QuestionRequest } from "@/lib/types";

const examples = ["厨房油污，应该先擦哪里？", "清洁剂为什么不能随便混用？", "洗衣前应该先检查什么？"];
type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((event: SpeechEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type RecognitionConstructor = new () => Recognition;
type LessonControls = { reply: (text: string) => Promise<boolean> };

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
  const lessonControlsRef = useRef<LessonControls>(null);
  const submitLockRef = useRef(false);
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<QuestionRequest | null>(null);
  const [previousResults, setPreviousResults] = useState<QuestionRequest[]>([]);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId ?? null);
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [overviewAttempt, setOverviewAttempt] = useState(0);
  const [mastery, setMastery] = useState<MasteryOverview | null>(null);
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
        setPreviousResults(history.slice(0, -1));
        setResult(restored);
        if (restored.status === "confirmed") {
          const session = await confirmQuestion(restored.id);
          if (active) setLearningSession(session);
        }
      } catch (caught) {
        if (!active) return;
        conversationBootRef.current = null;
        setError(caught instanceof AppError ? caught.message : "暂时无法恢复学习记录，请稍后再试。");
      }
    }
    void restoreConversation();
    return () => { active = false; };
  }, [initialConversationId]);

  useEffect(() => {
    let active = true;
    getLearningOverview().then((value) => { if (active) setOverview(value); })
      .catch((caught) => { if (active) setOverviewError(caught instanceof Error ? caught.message : "请稍后再试。"); })
      .finally(() => { if (active) setOverviewLoading(false); });
    getLearningMastery().then((value) => { if (active) setMastery(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [overviewAttempt]);

  useEffect(() => { if (result) requestAnimationFrame(() => resultRef.current?.focus()); }, [result]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("keydown", closeOnEscape); recognitionRef.current?.stop(); };
  }, []);

  function validate() {
    const value = question.trim();
    if (!value) return "先说一句话，我在听。";
    if (value.length > 200) return "问题有点长，请精简到200字以内。";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) return;
    const message = validate();
    if (message) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    submitLockRef.current = true;
    setSubmitting(true); setError("");
    try {
      if (lessonControlsRef.current && await lessonControlsRef.current.reply(question.trim())) {
        setQuestion(""); idempotencyRef.current = null;
        return;
      }
      idempotencyRef.current ??= crypto.randomUUID();
      const activeConversationId = conversationId ?? await (conversationBootRef.current ??= createCoachConversation().then((item) => item.id));
      setConversationId(activeConversationId);
      const created = await createQuestion(question.trim(), idempotencyRef.current, activeConversationId);
      const answered = await answerQuestion(created.id);
      if (result && result.id !== answered.id) setPreviousResults((items) => [...items, result]);
      setResult(answered);
      setQuestion(""); idempotencyRef.current = null;
      getCoachConversations().then(setConversations).catch(() => undefined);
    } catch (caught) {
      if (!conversationId) conversationBootRef.current = null;
      setError(caught instanceof AppError ? caught.message : "这次没有提交成功，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { submitLockRef.current = false; setSubmitting(false); }
  }

  function chooseExample(example: string) {
    setQuestion(example); setError(""); setVoiceMessage(""); idempotencyRef.current = null;
    requestAnimationFrame(() => document.getElementById("coach-question")?.focus());
  }
  function askAgain() {
    setQuestion(""); setError(""); setVoiceMessage(""); idempotencyRef.current = null;
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
    recognitionRef.current = recognition;
    setVoiceMessage("说完会转成文字，确认后再发送。"); setListening(true);
    try { recognition.start(); } catch { setListening(false); recognitionRef.current = null; setVoiceMessage("麦克风暂时不能使用，你可以继续打字。"); }
  }
  async function continueLearning() {
    if (!result?.lesson_id) return;
    setLearningSession(await confirmQuestion(result.id));
  }

  async function continueJourneyCourse(courseId?: string | null) {
    const targetCourseId = courseId ?? overview?.recommended_course_id;
    if (!targetCourseId) return;
    setStartingJourney(true); setError("");
    try {
      const turn = await runCoachTurn({ action: "start_or_resume", course_id: targetCourseId });
      setResult(null);
      setLearningSession(turn.session);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "下一门课暂时打不开，请稍后再试。");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setStartingJourney(false); }
  }

  function refreshOverview() {
    getLearningOverview().then(setOverview).catch(() => undefined);
    getLearningMastery().then(setMastery).catch(() => undefined);
  }

  return <main id="main-content" className="coach-shell">
    <header className="coach-topbar">
      <button className="coach-icon-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="打开学习菜单" aria-expanded={drawerOpen}><Menu aria-hidden="true" size={27} /></button>
      <div className="coach-brand" aria-label="阿嬷学院 AI 陪学"><strong>阿嬷 AI 老师</strong><span>家政入门陪学</span></div>
      <HomeVersionSelector />
    </header>
    <CoachDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} conversations={conversations} currentConversationId={conversationId} />

    <section className={`coach-stage ${result || learningSession ? "has-result" : ""}`} aria-label="AI 陪学对话">
      <div className="coach-thread">
        {previousResults.map((item) => <div key={item.id}>
          <article className="coach-user-turn" aria-label="你的消息"><p>{item.original_text}</p></article>
          <article className="coach-assistant-turn" aria-label="老师的回复"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={17} /><strong>阿嬷 AI 老师</strong></div><p>{item.answer ?? item.message}</p></article>
        </div>)}
        {!result && !learningSession && <CoachJourneyPrompt overview={overview} mastery={mastery} starting={startingJourney} loading={overviewLoading} error={overviewError} onRetry={() => { setOverviewLoading(true); setOverviewError(""); setOverviewAttempt((value) => value + 1); }} examples={examples} onContinueCourse={(courseId) => void continueJourneyCourse(courseId)} onChooseExample={chooseExample} />}
        {result && <article className="coach-user-turn" aria-label="你的问题"><span>你问</span><p>{result.original_text}</p></article>}
        {result && <QuestionResult ref={resultRef} result={result} learningStarted={Boolean(learningSession)} onContinue={continueLearning} onAskAgain={askAgain} />}
        {learningSession && <CoachLesson key={learningSession.id} ref={lessonControlsRef} session={learningSession} onSessionChange={setLearningSession} onCompleted={refreshOverview} />}
      </div>
    </section>

    {(error || voiceMessage) && <div ref={errorRef} className={`coach-notice ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} tabIndex={error ? -1 : undefined}>{error || voiceMessage}</div>}
    <div className="coach-composer-wrap">
      <form className="coach-composer" onSubmit={submit} noValidate>
        <button className="composer-side-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="打开学习菜单"><Plus aria-hidden="true" size={25} /></button>
        <label className="sr-only" htmlFor="coach-question">写下家政问题</label>
        <textarea id="coach-question" value={question} onChange={(event) => { setQuestion(event.target.value); idempotencyRef.current = null; if (error) setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-describedby="coach-question-help" aria-invalid={Boolean(error)} placeholder={listening ? "正在听你说…" : "发消息或点话筒说话"} rows={1} maxLength={200} disabled={submitting} />
        <span className="sr-only" id="coach-question-help">一次只问一个问题，最多200字</span>
        {question.trim() ? <button className="composer-submit" type="submit" disabled={submitting} aria-label={submitting ? "正在查找回答" : "发送问题"}>{submitting ? <span className="composer-loader" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" size={23} />}</button> : <button className={`composer-mic ${listening ? "is-listening" : ""}`} type="button" onClick={toggleVoiceInput} disabled={submitting} aria-label={listening ? "停止听写" : "语音输入"} aria-pressed={listening}><Mic aria-hidden="true" size={24} /></button>}
      </form>
      <p className="coach-footnote"><ShieldCheck aria-hidden="true" size={14} />测试期免费 · AI 建议需结合实际核实</p>
    </div>
  </main>;
}

function CoachDrawer({ open, onClose, conversations, currentConversationId }: { open: boolean; onClose: () => void; conversations: CoachConversation[]; currentConversationId: number | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);
  return <dialog ref={dialogRef} className={`coach-drawer-layer ${open ? "is-open" : ""}`} onClose={onClose} aria-label="学习菜单">
    <button className="coach-drawer-scrim" type="button" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="关闭学习菜单" />
    <aside className="coach-drawer">
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
  </dialog>;
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
    <div className="coach-answer-label"><Sparkles aria-hidden="true" size={18} /><strong>{result.answer_mode === "model" || result.answer_mode === "coach_state" ? "阿嬷 AI 老师" : available ? "已审核课程整理" : "AI 暂停生成"}</strong></div>
    {!available && <h2>相关课程还在等待审核</h2>}
    {available ? <><p className="coach-answer-copy">{result.answer}</p><SpeakButton text={result.answer ?? ""} label="播报回答" /></> : <div className="coach-unavailable"><ShieldCheck aria-hidden="true" size={22} /><div><strong>这次不自由编答案</strong><p>{result.message}</p></div></div>}
    {result.knowledge_refs.length > 0 && <details className="coach-sources"><summary>查看回答来源</summary>{result.knowledge_refs.map((source, index) => <div key={`${source.type}-${index}`}><FileCheck2 aria-hidden="true" size={17} /><span>{source.type === "course" ? `${source.title} · 第${source.version}版` : source.name}</span></div>)}</details>}
    {actionError && <div className="coach-action-error" role="alert">{actionError}</div>}
    {result.lesson_id && !learningStarted && <button className="coach-course-action" type="button" onClick={() => void openCourse()} disabled={starting}><BookOpenCheck aria-hidden="true" size={22} /><span><strong>{starting ? "正在准备陪学…" : "在对话里继续学习"}</strong><small>{result.next_action ?? "AI 老师会在这里一步一步带你学"}</small></span><ArrowRight aria-hidden="true" size={22} /></button>}
    {!learningStarted && <button className="coach-text-action" type="button" onClick={onAskAgain}>继续问一个问题</button>}
  </section>;
}

function CoachLesson({ ref, session, onSessionChange, onCompleted }: { ref: React.Ref<LessonControls>; session: LearningSession; onSessionChange: (session: LearningSession) => void; onCompleted: () => void }) {
  const actionLockRef = useRef(false);
  const [phase, setPhase] = useState<"step" | "quiz" | "complete">(session.status === "completed" ? "complete" : session.status === "checking" ? "quiz" : "step");
  const [stepIndex, setStepIndex] = useState(session.current_step);
  const [acknowledgedSteps, setAcknowledgedSteps] = useState<number[]>([]);
  const [showSimpleCopy, setShowSimpleCopy] = useState(false);
  const [simpleCopy, setSimpleCopy] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [checkedAnswer, setCheckedAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const lesson = session.lesson;
  const step = lesson.steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / lesson.steps.length) * 100);

  useEffect(() => { getLearningMedia(session.id).then(setMedia).catch(() => setMedia([])); }, [session.id]);
  const stepMedia = media.filter((asset) => asset.step_index === stepIndex);

  async function acknowledgeStep() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSaving(true); setFeedback("");
    try {
      const turn = await runCoachTurn({ action: "continue", session_id: session.id, expected_step: stepIndex });
      setAcknowledgedSteps((items) => items.includes(stepIndex) ? items : [...items, stepIndex]);
      setShowSimpleCopy(false);
      onSessionChange(turn.session);
      if (turn.phase === "checking") setPhase("quiz");
      else setStepIndex(turn.session.current_step);
    } catch (caught) { setFeedback(caught instanceof AppError ? caught.message : "进度没有保存，请再试一次。"); }
    finally { actionLockRef.current = false; setSaving(false); }
  }

  async function checkAnswer() {
    if (!answer) return;
    setSaving(true); setFeedback("");
    try {
      const turn = await runCoachTurn({ action: "submit_check", session_id: session.id, answer, expected_quiz_attempts: session.quiz_attempts });
      onSessionChange(turn.session); setCheckedAnswer(answer); setFeedback(turn.reply_text);
      if (turn.correct) window.setTimeout(() => { setPhase("complete"); onCompleted(); }, 500);
    } catch (caught) { setFeedback(caught instanceof AppError ? caught.message : "答案没有提交成功，请再试一次。"); }
    finally { setSaving(false); }
  }

  async function explainAgain() {
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setSaving(true); setFeedback("");
      try {
        const turn = await runCoachTurn({ action: "explain_again", session_id: session.id });
        setSimpleCopy(turn.reply_text); setShowSimpleCopy(true);
      } catch (caught) { setFeedback(caught instanceof AppError ? caught.message : "这次没有讲清楚，请再试一次。"); }
      finally { actionLockRef.current = false; setSaving(false); }
    }

  useImperativeHandle(ref, () => ({
    async reply(text: string) {
      if (phase !== "step") return false;
      const value = text.replace(/[\s。！？!?,，]/g, "");
      if (["继续", "接着", "懂了", "听懂了", "听懂了继续", "继续讲", "下一步"].includes(value)) { await acknowledgeStep(); return true; }
      if (["没懂", "没听懂", "不懂", "再讲一遍", "再说一遍"].includes(value)) { await explainAgain(); return true; }
      return false;
    },
  }));

  const pastTurns = acknowledgedSteps.map((index) => <div className="coach-past-turn" key={index}><article className="coach-lesson-message is-past"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={16} /><strong>阿嬷 AI 老师</strong></div><h3>{lesson.steps[index].title}</h3><p>{lesson.steps[index].body}</p></article><article className="coach-user-turn coach-user-turn--short"><p>听懂了，继续讲</p></article></div>);

  if (phase === "step") {
    return <section className="coach-live-lesson" aria-live="polite">
      <div className="coach-live-progress"><span>{lesson.title}</span><strong>{stepIndex + 1}/{lesson.steps.length}</strong></div>
      <div className="coach-lesson-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      {pastTurns}
      <article className="coach-lesson-message"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={17} /><strong>阿嬷 AI 老师</strong></div><p className="coach-turn-lead">这一步只学一件事</p><h2>{step.title}</h2><p className="coach-answer-copy">{step.body}</p>{stepIndex === 0 && <div className="coach-safety-line"><ShieldCheck aria-hidden="true" size={20} /><span>{lesson.disclaimer}</span></div>}{stepMedia.length > 0 && <details className="v2-demonstration" key={stepIndex}><summary>看这一步的示范</summary>{stepMedia.map((asset) => <CoachMediaCard key={asset.id} asset={asset} />)}</details>}<div className="coach-turn-actions"><button className="is-primary" type="button" onClick={() => void acknowledgeStep()} disabled={saving}><span>{saving ? "正在保存…" : "听懂了，继续"}</span><ArrowRight aria-hidden="true" size={18} /></button><SpeakButton text={`${step.title}。${step.body}`} label="听老师讲" /><button type="button" onClick={() => void explainAgain()} disabled={showSimpleCopy || saving}><CircleHelp aria-hidden="true" size={18} />没听懂</button></div></article>
      {showSimpleCopy && <><article className="coach-user-turn coach-user-turn--short"><p>我还没听懂，能再简单一点吗？</p></article><article className="coach-lesson-message coach-simple-explanation"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={16} /><strong>阿嬷 AI 老师</strong></div><p>{simpleCopy}</p><div className="coach-turn-actions"><SpeakButton text={simpleCopy} label="再听一遍" /><button className="is-primary" type="button" onClick={() => void acknowledgeStep()} disabled={saving}>这次听懂了<ArrowRight aria-hidden="true" size={18} /></button></div></article></>}
      {feedback && <div className="coach-action-error" role="status">{feedback}</div>}
    </section>;
  }

  if (phase === "quiz") {
    const selectedLabel = lesson.quiz.options.find((option) => option.id === checkedAnswer)?.label;
    return <section className="coach-live-lesson" aria-live="polite">
      {pastTurns}
      <article className="coach-lesson-message"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={17} /><strong>阿嬷 AI 老师</strong></div><p className="coach-turn-lead">我想确认一下你有没有听懂：</p><h2>{lesson.quiz.question}</h2><SpeakButton text={`${lesson.quiz.question}。${lesson.quiz.options.map((option) => `${option.id}，${option.label}`).join("。")}`} label="听老师读题" /><div className="coach-answer-options" role="radiogroup" aria-label="可以这样回答">{lesson.quiz.options.map((option) => <button key={option.id} type="button" role="radio" aria-checked={answer === option.id} className={answer === option.id ? "is-selected" : ""} onClick={() => { setAnswer(option.id); setCheckedAnswer(""); setFeedback(""); }}><span>{option.id.toUpperCase()}</span><strong>{option.label}</strong>{answer === option.id && <Check aria-hidden="true" size={20} />}</button>)}</div><div className="coach-turn-actions coach-turn-actions--submit"><button className="is-primary" type="button" onClick={() => void checkAnswer()} disabled={!answer || saving}><span>{saving ? "正在听…" : "就这样回答"}</span><ArrowRight aria-hidden="true" size={18} /></button></div></article>
      {checkedAnswer && selectedLabel && <article className="coach-user-turn coach-user-turn--short"><p>我的回答：{selectedLabel}</p></article>}
      {feedback && <article className="coach-lesson-message coach-feedback-turn" role="status"><div className="coach-answer-label"><Sparkles aria-hidden="true" size={16} /><strong>阿嬷 AI 老师</strong></div><p>{feedback}</p></article>}
    </section>;
  }

  return <section className="coach-live-lesson coach-lesson-complete" aria-live="polite"><article className="coach-lesson-message"><div className="coach-complete-mark"><Check aria-hidden="true" size={28} /></div><p className="coach-kicker">学习记录已经同步</p><h2>这门课已学完</h2><p className="coach-answer-copy">做得很好。记住今天最重要的一句：{lesson.conclusion}</p><p>可以继续问我，也可以休息一下。下次我会从新的内容接着陪你学。</p><button className="coach-text-action" type="button" onClick={() => { setPhase("step"); setStepIndex(0); setAcknowledgedSteps([]); }}>再听老师讲一遍</button></article></section>;
}

function CoachMediaCard({ asset }: { asset: MediaAsset }) {
  return <figure className="coach-media-card">{asset.media_type === "image" ? <Image src={asset.url} alt={asset.alt_text} width={720} height={480} sizes="(max-width: 760px) 100vw, 680px" unoptimized /> : <video controls preload="metadata" poster={asset.thumbnail_url ?? undefined} aria-label={asset.alt_text}><source src={asset.url} />{asset.transcript && <track kind="captions" label="中文字幕" />}</video>}<figcaption><strong>{asset.title}</strong><span>标准教学素材 · 已审核</span></figcaption></figure>;
}
