"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getPracticeQueue, getPilotSummary, reviewPractice, type PracticeTask, type PilotSummary } from "@/lib/outcomes";

export function PracticeReviewAdmin() {
  const [items, setItems] = useState<PracticeTask[] | null>(null);
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([getPracticeQueue(), getPilotSummary()]).then(([queue, stats]) => { if (active) { setItems(queue); setSummary(stats); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "复核列表加载失败"); });
    return () => { active = false; };
  }, [refresh]);
  return <main id="main-content" className="admin-shell">
    <Link className="back-link" href="/admin/content">返回内容审核</Link>
    <header className="admin-heading"><div><p className="section-kicker">邀请制试点 · 教练工作台</p><h1>复述复核</h1><p>帮助学员把做法讲清楚，不替代现场实操考核。</p></div><button className="v2-secondary" onClick={() => { setError(""); setRefresh((value) => value + 1); }}>刷新</button></header>
    {summary && <section className="outcome-summary"><h2>当前试点数据</h2><dl className="outcome-metrics">
      {[['学员', summary.learners], ['开始学习', summary.started_learners], ['课程完成次数', summary.completed_lessons], ['待复核', summary.awaiting_review], ['复述已确认', summary.reviewed_teachbacks], ['已发布课程', `${summary.published_courses}/${summary.total_courses}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl><p className="outcome-note">{summary.measurement_note}</p></section>}
    {error && <section role="alert"><p>{error}</p><Link href="/welcome">使用管理员邀请码登录</Link></section>}
    {!items && !error && <p role="status">正在加载待复核记录…</p>}
    {items?.length === 0 && <section className="outcome-summary"><h2>暂时没有待复核的复述</h2><p>学员完成课程并提交自己的做法后，会出现在这里。</p></section>}
    <section aria-label="待复核列表">{items?.map((item) => <ReviewCard key={item.attempt!.id} item={item} onSaved={() => setRefresh((value) => value + 1)} />)}</section>
    {!!items?.length && <p className="outcome-note">按提交时间显示最早20条；处理后自动补入下一条。</p>}
  </main>;
}

function ReviewCard({item, onSaved}: {item: PracticeTask; onSaved: () => void}) {
  const [criteria, setCriteria] = useState<Record<string, boolean>>({sequence: false, safety: false, handover: false});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function review(decision: "reviewed" | "needs_revision") {
    if (lock.current) return;
    if (feedback.trim().length < 10) { setError("请至少写10字，给学员一条具体建议。"); return; }
    lock.current = true; setBusy(true); setError("");
    try { await reviewPractice(item.attempt!.id, decision, feedback.trim(), criteria); onSaved(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "复核未保存"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <article className="outcome-summary">
    <p className="section-kicker">学员 #{item.learner_id} · 第 {item.attempt!.attempt_no} 次复述</p><h2>{item.title}</h2>
    {item.content_status !== "published" && <p className="outcome-note">候选课程尚未发布：复述复核不能代替课程内容审核。</p>}
    <p>{item.prompt}</p><blockquote className="outcome-quote">{item.attempt!.response_text}</blockquote>
    <details><summary>查看本次学习版本的课程依据</summary><p>{item.reference_disclaimer}</p>{item.reference_steps?.map((step, index) => <p key={index}><strong>{step.title}</strong>：{step.body}</p>)}</details>
    <fieldset disabled={busy}><legend>逐项核对理解，不评定实际操作能力</legend>{Object.entries(item.criteria_labels).map(([key, label]) => <label className="outcome-checkbox" key={key}><input type="checkbox" checked={criteria[key]} onChange={(event) => setCriteria({...criteria, [key]: event.target.checked})} />{label}</label>)}</fieldset>
    <label htmlFor={`feedback-${item.attempt!.id}`}>给学员的具体建议</label><textarea id={`feedback-${item.attempt!.id}`} rows={3} maxLength={800} value={feedback} disabled={busy} onChange={(event) => setFeedback(event.target.value)} />
    {error && <p role="alert">{error}</p>}
    <div className="outcome-actions"><button className="v2-primary" disabled={busy || !Object.values(criteria).every(Boolean)} onClick={() => void review("reviewed")}>确认线上复述</button><button className="v2-secondary" disabled={busy} onClick={() => void review("needs_revision")}>请学员补充</button></div>
  </article>;
}
