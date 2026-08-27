"use client";

import { ArrowLeft, ArrowRight, Award, BookOpenCheck, CheckCircle2, RefreshCcw, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppError, getLearningReport } from "@/lib/api";
import type { LearningReport } from "@/lib/types";

export function LearningReportView() {
  const [report, setReport] = useState<LearningReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getLearningReport()
      .then((value) => { if (!cancelled) setReport(value); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof AppError ? caught.message : "报告暂时加载不出来。"); });
    return () => { cancelled = true; };
  }, []);

  if (!report && !error) return <main className="flow-shell"><div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在整理学习结果</strong></div></main>;

  if (error) return <main className="flow-shell"><section className="flow-card state-card"><RefreshCcw size={34} /><h1>报告暂时加载不出来</h1><p>{error}</p><button className="rainbow-button" onClick={() => window.location.reload()}><span>再试一次</span><ArrowRight size={22} /></button></section></main>;

  if (!report || report.report_status === "incomplete") return <main className="flow-shell"><header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft size={20} />返回首页</Link></header><section className="flow-card state-card"><BookOpenCheck size={36} /><p className="section-kicker">学习记录还不完整</p><h1>完成学习前测和后测后再来看</h1><p>你的课程进度已经保存，不需要重新开始。</p><Link className="rainbow-button" href="/housekeeping"><span>继续家政学习</span><ArrowRight size={22} /></Link></section></main>;

  return (
    <main className="flow-shell report-shell">
      <header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft size={20} />返回首页</Link><span className="prototype-badge"><Award size={16} />学习提升</span></header>
      <section className="report-hero"><span><TrendingUp size={24} /></span><p className="section-kicker">家政入门学习报告</p><h1>{report.improvement_points !== null && report.improvement_points >= 0 ? "+" : ""}{report.improvement_points}分</h1><p>这是你的后测成绩比前测提高的百分点。</p></section>
      <section className="score-compare" aria-label="学习前后成绩"><div><small>学习前</small><strong>{report.pre_score}分</strong></div><ArrowRight aria-hidden="true" size={24} /><div><small>学习后</small><strong>{report.post_score}分</strong></div></section>
      <section className="report-section"><h2><CheckCircle2 size={22} />已经掌握</h2><div className="knowledge-tags">{report.mastered_knowledge_points.map((item) => <span key={item}>{item}</span>)}</div></section>
      <section className="report-section report-section--review"><h2><BookOpenCheck size={22} />建议再看看</h2>{report.review_knowledge_points.length ? <div className="knowledge-tags">{report.review_knowledge_points.map((item) => <span key={item}>{item}</span>)}</div> : <p>这次后测的六个模块都答对了，可以定期回来复习。</p>}</section>
      <Link className="rainbow-button" href="/housekeeping"><span>回到家政学习路径</span><ArrowRight size={22} /></Link>
      <p className="report-disclaimer">本报告只反映阿嬷学院内部测试题的知识学习结果，不代表家政实操能力、职业资格或就业保证。</p>
    </main>
  );
}
