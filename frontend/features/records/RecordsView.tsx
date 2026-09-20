"use client";

import { ArrowRight, BookOpen, CheckCircle2, Clock3, RefreshCcw, ShieldAlert, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppError, getLearningMastery, getLearningRecords } from "@/lib/api";
import type { LearningSession, MasteryOverview } from "@/lib/types";

export function RecordsView() {
  const [records, setRecords] = useState<LearningSession[] | null>(null);
  const [mastery, setMastery] = useState<MasteryOverview | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setRecords(null);
    try { setRecords(await getLearningRecords()); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "学习记录暂时加载不出来。"); }
  }

  useEffect(() => {
    let cancelled = false;
    getLearningRecords()
      .then((items) => { if (!cancelled) setRecords(items); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof AppError ? caught.message : "学习记录暂时加载不出来。"); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    getLearningMastery().then((value) => { if (!cancelled) setMastery(value); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const learning = records?.filter((record) => record.status !== "completed") ?? [];
  const completed = records?.filter((record) => record.status === "completed") ?? [];

  return (
    <main id="main-content" className="page-shell">
      <AppHeader current="records" />
      <section className="records-intro"><h1>学习记录</h1><p>看看已经学了什么，接着上次继续。</p></section>
      {mastery && <MasterySummary mastery={mastery} />}
      {records === null && !error && <div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在加载学习记录</strong></div>}
      {error && <section className="empty-records"><div className="state-icon state-icon--sky"><RefreshCcw aria-hidden="true" size={34} /></div><h2>暂时加载不出来</h2><p>{error}</p><button className="rainbow-button" type="button" onClick={() => void load()}><span>再试一次</span><ArrowRight aria-hidden="true" size={22} /></button></section>}
      {records?.length === 0 && <section className="empty-records"><div className="state-icon state-icon--sky"><BookOpen aria-hidden="true" size={34} /></div><h2>还没有学习记录</h2><p>开始一门课程，学习位置就会保存在这里。</p><Link className="rainbow-button" href="/housekeeping"><span>浏览家政课</span><ArrowRight aria-hidden="true" size={22} /></Link></section>}
      {learning.length > 0 && <RecordGroup title="学习中" records={learning} />}
      {completed.length > 0 && <RecordGroup title="已完成" records={completed} />}
      <footer className="prototype-note">记录已保存到学习服务 · 当前使用本地测试身份</footer>
    </main>
  );
}

function MasterySummary({ mastery }: { mastery: MasteryOverview }) {
  const progress = Math.round((mastery.mastered_count / mastery.total_count) * 100);
  return <section className="mastery-summary" aria-labelledby="mastery-summary-title">
    <div className="mastery-summary__heading"><span><Target aria-hidden="true" size={22} /></span><div><small>根据测评和学习记录计算</small><h2 id="mastery-summary-title">已掌握 {mastery.mastered_count}/{mastery.total_count} 项</h2></div></div>
    <div className="mastery-summary__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    <div className="mastery-module-list">{mastery.modules.map((module) => <span className={`is-${module.status}`} key={module.course_id}>{module.safety_attention && <ShieldAlert aria-hidden="true" size={14} />}{module.knowledge_point}</span>)}</div>
    {mastery.recommended_course_id && <Link className="mastery-next" href={`/housekeeping?review=${mastery.recommended_course_id}`}><span><small>建议下一步</small><strong>{mastery.recommended_title}</strong><em>{mastery.recommendation_reason}</em></span><ArrowRight aria-hidden="true" size={20} /></Link>}
  </section>;
}

function RecordGroup({ title, records }: { title: string; records: LearningSession[] }) {
  return <section className="record-list" aria-label={title}><div className="list-heading"><h2>{title}</h2><span>{records.length}节</span></div>{records.map((record) => <article className="record-card" key={record.id}><div className="record-card__top"><span className="complete-chip">{record.status === "completed" ? <CheckCircle2 aria-hidden="true" size={17} /> : <Clock3 aria-hidden="true" size={17} />}{record.status === "completed" ? "已完成" : `学到第${record.current_step + 1}步`}</span>{record.completed_at && <span className="record-time"><Clock3 aria-hidden="true" size={16} />{new Date(record.completed_at).toLocaleDateString("zh-CN")}</span>}</div><h3>{record.lesson.title}</h3><Link href={`/learn/${record.id}`}>{record.status === "completed" ? "查看记录" : "继续学习"}<ArrowRight aria-hidden="true" size={19} /></Link></article>)}</section>;
}
