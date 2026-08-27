"use client";

import { ArrowRight, BookOpen, CheckCircle2, Clock3, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppError, getLearningRecords } from "@/lib/api";
import type { LearningSession } from "@/lib/types";

export function RecordsView() {
  const [records, setRecords] = useState<LearningSession[] | null>(null);
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
  const learning = records?.filter((record) => record.status !== "completed") ?? [];
  const completed = records?.filter((record) => record.status === "completed") ?? [];

  return (
    <main id="main-content" className="page-shell">
      <AppHeader current="records" />
      <section className="records-intro"><p className="section-kicker">你的学习足迹</p><h1>我学过的</h1><p>学习位置会保存，关闭页面后也可以继续。</p></section>
      {records === null && !error && <div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在加载学习记录</strong></div>}
      {error && <section className="empty-records"><div className="state-icon state-icon--sky"><RefreshCcw aria-hidden="true" size={34} /></div><h2>暂时加载不出来</h2><p>{error}</p><button className="rainbow-button" type="button" onClick={() => void load()}><span>再试一次</span><ArrowRight aria-hidden="true" size={22} /></button></section>}
      {records?.length === 0 && <section className="empty-records"><div className="state-icon state-icon--sky"><BookOpen aria-hidden="true" size={34} /></div><h2>还没有学习记录</h2><p>从一个具体的生活问题开始，学习位置就会保存在这里。</p><Link className="rainbow-button" href="/ask"><span>开始第一次学习</span><ArrowRight aria-hidden="true" size={22} /></Link></section>}
      {learning.length > 0 && <RecordGroup title="学习中" records={learning} />}
      {completed.length > 0 && <RecordGroup title="已完成" records={completed} />}
      <footer className="prototype-note">记录已保存到学习服务 · 当前使用本地测试身份</footer>
    </main>
  );
}

function RecordGroup({ title, records }: { title: string; records: LearningSession[] }) {
  return <section className="record-list" aria-label={title}><div className="list-heading"><h2>{title}</h2><span>{records.length}节</span></div>{records.map((record) => <article className="record-card" key={record.id}><div className="record-card__top"><span className="complete-chip">{record.status === "completed" ? <CheckCircle2 aria-hidden="true" size={17} /> : <Clock3 aria-hidden="true" size={17} />}{record.status === "completed" ? "已完成" : `学到第${record.current_step + 1}步`}</span>{record.completed_at && <span className="record-time"><Clock3 aria-hidden="true" size={16} />{new Date(record.completed_at).toLocaleDateString("zh-CN")}</span>}</div><h3>{record.lesson.title}</h3><Link href={`/learn/${record.id}`}>{record.status === "completed" ? "查看记录" : "继续学习"}<ArrowRight aria-hidden="true" size={19} /></Link></article>)}</section>;
}
