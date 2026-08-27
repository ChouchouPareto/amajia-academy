"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2, CircleHelp, FileCheck2, RefreshCcw, ShieldAlert, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppError, confirmQuestion, getLearningSession, getQuestion, saveLearningProgress, submitQuiz } from "@/lib/api";
import type { LearningSession, Lesson, QuestionRequest } from "@/lib/types";

type View = "recovering" | "confirm" | "processing" | "conclusion" | "step" | "quiz" | "complete" | "blocked" | "no_match" | "failed";
const processingMessages = ["正在帮你判断这个问题", "正在查找可靠的学习内容", "正在整理成容易学的步骤"];

export function LearningFlow({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("recovering");
  const [questionRequest, setQuestionRequest] = useState<QuestionRequest | null>(null);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const lesson = learningSession?.lesson ?? null;
  const progress = lesson ? Math.round(((currentStep + 1) / lesson.steps.length) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    async function recover() {
      setView("recovering");
      try {
        if (sessionId.startsWith("question-")) {
          const id = Number(sessionId.slice("question-".length));
          if (!Number.isInteger(id)) throw new AppError("这次学习找不到了。", "INVALID_ID", false);
          const request = await getQuestion(id);
          if (cancelled) return;
          setQuestionRequest(request);
          if (request.status === "blocked") setView("blocked");
          else if (request.status === "no_match") setView("no_match");
          else if (request.status === "confirmed") {
            const session = await confirmQuestion(request.id);
            if (!cancelled) router.replace(`/learn/${session.id}`);
          } else setView("confirm");
          return;
        }
        const id = Number(sessionId);
        if (!Number.isInteger(id)) throw new AppError("这次学习找不到了。", "INVALID_ID", false);
        const session = await getLearningSession(id);
        if (cancelled) return;
        setLearningSession(session);
        setCurrentStep(session.current_step);
        setView(session.status === "completed" ? "complete" : session.status === "checking" ? "quiz" : "conclusion");
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof AppError ? caught.message : "这次学习暂时打不开。");
          setView("failed");
        }
      }
    }
    void recover();
    return () => { cancelled = true; };
  }, [router, sessionId]);

  async function startProcessing() {
    if (!questionRequest) return;
    setView("processing");
    setProcessingStep(0);
    const timerOne = window.setTimeout(() => setProcessingStep(1), 450);
    const timerTwo = window.setTimeout(() => setProcessingStep(2), 900);
    try {
      const session = await confirmQuestion(questionRequest.id);
      setLearningSession(session);
      window.setTimeout(() => router.replace(`/learn/${session.id}`), 1050);
    } catch (caught) {
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
      setError(caught instanceof AppError ? caught.message : "这一步没有完成，请再试一次。");
      setView("failed");
    }
  }

  async function nextStep() {
    if (!lesson || !learningSession || saving) return;
    if (currentStep === lesson.steps.length - 1) { setView("quiz"); return; }
    setSaving(true);
    try {
      const next = currentStep + 1;
      const session = await saveLearningProgress(learningSession.id, next);
      setLearningSession(session);
      setCurrentStep(next);
    } catch (caught) {
      setFeedback(caught instanceof AppError ? caught.message : "进度没有保存，请再试一次。");
    } finally { setSaving(false); }
  }

  async function checkAnswer() {
    if (!learningSession || !answer || saving) return;
    setSaving(true);
    try {
      const result = await submitQuiz(learningSession.id, answer);
      setLearningSession(result.session);
      setFeedback(result.message);
      if (result.correct) window.setTimeout(() => setView("complete"), 450);
    } catch (caught) {
      setFeedback(caught instanceof AppError ? caught.message : "答案没有提交成功，请再试一次。");
    } finally { setSaving(false); }
  }

  if (view === "recovering") return <main className="flow-shell"><div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在恢复这次学习</strong><p>已保存的进度不会丢失</p></div></main>;

  return (
    <main id="main-content" className="flow-shell">
      <header className="flow-topbar"><Link className="back-link" href={view === "confirm" ? `/ask?example=${encodeURIComponent(questionRequest?.original_text ?? "")}` : "/housekeeping"}><ArrowLeft aria-hidden="true" size={20} />{view === "confirm" ? "修改问题" : "返回学习路径"}</Link><span className="prototype-badge"><Sparkles aria-hidden="true" size={15} />家政入门</span></header>
      {view === "confirm" && questionRequest && <ConfirmView understood={questionRequest.understood_text} onConfirm={startProcessing} />}
      {view === "processing" && <ProcessingView step={processingStep} />}
      {view === "conclusion" && lesson && <ConclusionView lesson={lesson} onContinue={() => setView("step")} />}
      {view === "step" && lesson && <StepView lesson={lesson} currentStep={currentStep} progress={progress} saving={saving} feedback={feedback} onNext={nextStep} />}
      {view === "quiz" && lesson && <QuizView lesson={lesson} answer={answer} feedback={feedback} saving={saving} onAnswer={(value) => { setAnswer(value); setFeedback(""); }} onSubmit={checkAnswer} />}
      {view === "complete" && lesson && <CompleteView lesson={lesson} />}
      {view === "blocked" && questionRequest && <BlockedView result={questionRequest} />}
      {view === "no_match" && questionRequest && <NoMatchView result={questionRequest} />}
      {view === "failed" && <FailedView message={error} />}
      <footer className="prototype-note">学习进度由后端保存 · 当前为待专业审核的内部测试候选内容</footer>
    </main>
  );
}

function ConfirmView({ understood, onConfirm }: { understood: string; onConfirm: () => void }) {
  return <section className="flow-card flow-card--question"><span className="step-pill">先确认一下</span><h1>你问的是这个吗？</h1><blockquote>{understood}</blockquote><button className="rainbow-button" onClick={onConfirm}><span><Check aria-hidden="true" size={21} />对，就是这个问题</span><ArrowRight aria-hidden="true" size={22} /></button><Link className="secondary-action" href="/ask">不是，我要改一下</Link></section>;
}

function ProcessingView({ step }: { step: number }) {
  return <section className="processing-card" aria-live="polite" aria-busy="true"><div className="orbit-mark" aria-hidden="true"><BookOpenCheck size={32} /></div><p className="section-kicker">请稍等一下</p><h1>{processingMessages[step]}</h1><div className="process-list">{processingMessages.map((message, index) => <div key={message} className={index <= step ? "process-item is-done" : "process-item"}>{index < step ? <CheckCircle2 aria-hidden="true" size={21} /> : <span aria-hidden="true">{index + 1}</span>}<strong>{message}</strong></div>)}</div><p className="processing-note">处理完成前不会展示未经检查的半段答案。</p></section>;
}

function ConclusionView({ lesson, onContinue }: { lesson: Lesson; onContinue: () => void }) {
  return <section className="flow-card"><div className="content-status"><FileCheck2 aria-hidden="true" size={18} /><strong>内部测试候选内容</strong><span>待专业审核</span></div><p className="section-kicker">先记住这一句</p><h1 className="conclusion-title">{lesson.conclusion}</h1><div className="condition-box"><CircleHelp aria-hidden="true" size={21} /><div><strong>适用范围</strong><p>适用于普通家庭的家政入门知识学习，不等同于线下实操培训。</p></div></div><div className="safety-note"><ShieldCheck aria-hidden="true" size={21} /><div><strong>安全提醒</strong><p>{lesson.disclaimer}</p></div></div><button className="rainbow-button" onClick={onContinue}><span>开始一步一步学</span><ArrowRight aria-hidden="true" size={22} /></button></section>;
}

function StepView({ lesson, currentStep, progress, saving, feedback, onNext }: { lesson: Lesson; currentStep: number; progress: number; saving: boolean; feedback: string; onNext: () => void }) {
  const step = lesson.steps[currentStep];
  return <section className="flow-card"><div className="progress-heading"><span>第{currentStep + 1}步，共{lesson.steps.length}步</span><strong>{progress}%</strong></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><div className="step-illustration" aria-hidden="true"><span>{currentStep + 1}</span><BookOpenCheck size={34} /></div><h1>{step.title}</h1><p className="learning-copy">{step.body}</p>{feedback && <div className="quiz-feedback" role="status">{feedback}</div>}<button className="rainbow-button" onClick={onNext} disabled={saving}><span>{saving ? "正在保存…" : currentStep === lesson.steps.length - 1 ? "去做一道小题" : "我明白了，下一步"}</span><ArrowRight aria-hidden="true" size={22} /></button></section>;
}

function QuizView({ lesson, answer, feedback, saving, onAnswer, onSubmit }: { lesson: Lesson; answer: string; feedback: string; saving: boolean; onAnswer: (value: string) => void; onSubmit: () => void }) {
  return <section className="flow-card"><span className="step-pill">检查一下</span><h1>{lesson.quiz.question}</h1><div className="answer-list" role="radiogroup" aria-label="答案选项">{lesson.quiz.options.map((option) => <button key={option.id} type="button" className={answer === option.id ? "answer-choice is-selected" : "answer-choice"} role="radio" aria-checked={answer === option.id} onClick={() => onAnswer(option.id)}><span>{option.id.toUpperCase()}</span><strong>{option.label}</strong>{answer === option.id && <Check aria-hidden="true" size={21} />}</button>)}</div>{feedback && <div className="quiz-feedback" role="status">{feedback}</div>}<button className="rainbow-button" onClick={onSubmit} disabled={!answer || saving}><span>{saving ? "正在提交…" : "提交答案"}</span><ArrowRight aria-hidden="true" size={22} /></button></section>;
}

function CompleteView({ lesson }: { lesson: Lesson }) {
  return <section className="flow-card complete-card"><div className="complete-mark"><Check aria-hidden="true" size={38} strokeWidth={2.5} /></div><p className="section-kicker">学习记录已保存</p><h1>这节已完成</h1><p>你完成了{lesson.steps.length}个步骤和1道理解检查。这里不代表专业技能认证。</p><Link className="rainbow-button" href="/housekeeping"><span>继续下一门课</span><ArrowRight aria-hidden="true" size={22} /></Link><Link className="secondary-action" href="/records">查看我学过的</Link></section>;
}

function BlockedView({ result }: { result: QuestionRequest }) {
  return <section className="flow-card state-card state-card--danger"><div className="state-icon"><ShieldAlert aria-hidden="true" size={34} /></div><p className="section-kicker">安全提醒 · {result.risk_level}</p><h1>这个问题目前不能在这里继续讲</h1><p>{result.message}</p><div className="urgent-box"><AlertTriangle aria-hidden="true" size={22} /><span>{result.next_action}</span></div><Link className="rainbow-button" href="/ask"><span>重新问一个问题</span><ArrowRight aria-hidden="true" size={22} /></Link><Link className="secondary-action" href="/">返回首页</Link></section>;
}

function NoMatchView({ result }: { result: QuestionRequest }) {
  return <section className="flow-card state-card"><div className="state-icon state-icon--sky"><CircleHelp aria-hidden="true" size={34} /></div><p className="section-kicker">这次先不随便回答</p><h1>还没有找到足够可靠的内容</h1><p>{result.message}</p><Link className="rainbow-button" href={`/ask?example=${encodeURIComponent(result.original_text)}`}><span><RefreshCcw aria-hidden="true" size={20} />换一个说法</span><ArrowRight aria-hidden="true" size={22} /></Link><Link className="secondary-action" href="/">看看示例问题</Link></section>;
}

function FailedView({ message }: { message: string }) {
  return <section className="flow-card state-card"><div className="state-icon state-icon--sky"><WifiOff aria-hidden="true" size={34} /></div><p className="section-kicker">连接遇到问题</p><h1>这次学习暂时打不开</h1><p>{message}</p><button className="rainbow-button" type="button" onClick={() => window.location.reload()}><span><RefreshCcw aria-hidden="true" size={20} />再试一次</span><ArrowRight aria-hidden="true" size={22} /></button><Link className="secondary-action" href="/">返回首页</Link></section>;
}
