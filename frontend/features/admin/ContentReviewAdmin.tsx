"use client";

import { AlertTriangle, ArrowLeft, Check, Eye, EyeOff, FileCheck2, KeyRound, Link2, RefreshCcw, Send, ShieldCheck, Undo2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppError, getAdminCourseVersions, loginWithInvite, reviewAdminCourseVersion, runAdminCourseAction, updateAdminCourseVersion } from "@/lib/api";
import type { AdminCourseVersion } from "@/lib/types";

const statusLabel: Record<AdminCourseVersion["review_status"], string> = {
  draft: "草稿",
  in_review: "审核中",
  approved: "已审核",
  published: "已发布",
  suspended: "已下架",
  rejected: "已退回",
};

export function ContentReviewAdmin() {
  const [invitationCode, setInvitationCode] = useState("");
  const [showInvitationCode, setShowInvitationCode] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [versions, setVersions] = useState<AdminCourseVersion[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  async function load(authenticate = false) {
    setError("");
    setNotice("");
    setBusy("load");
    try {
      if (authenticate) await loginWithInvite(invitationCode.trim(), "内容管理员");
      setVersions(await getAdminCourseVersions());
    }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "审核列表暂时加载失败"); }
    finally { setBusy(""); }
  }

  async function mutate(label: string, task: () => Promise<AdminCourseVersion>) {
    setError("");
    setNotice("");
    setBusy(label);
    try {
      await task();
      setVersions(await getAdminCourseVersions());
      setNotice(`${label}已完成`);
    } catch (caught) { setError(caught instanceof AppError ? caught.message : `${label}没有完成`); }
    finally { setBusy(""); }
  }

  if (!versions) {
    return (
      <main id="main-content" className="admin-shell">
        <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={20} />返回学习端</Link>
        <section className="admin-login-card">
          <span className="admin-lock"><KeyRound aria-hidden="true" size={25} /></span>
          <p className="section-kicker">内部管理入口</p>
          <h1>课程内容审核</h1>
          <p>请使用管理员邀请码进入。登录状态保存在安全 Cookie 中，页面不会保存邀请码。</p>
          <form onSubmit={(event) => { event.preventDefault(); void load(true); }}>
            <label htmlFor="admin-key">管理员邀请码</label>
            <div className="admin-key-field">
              <input id="admin-key" type={showInvitationCode ? "text" : "password"} value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} autoComplete="current-password" placeholder="输入管理员邀请码" />
              <button type="button" aria-label={showInvitationCode ? "隐藏管理员邀请码" : "显示管理员邀请码"} aria-pressed={showInvitationCode} onClick={() => setShowInvitationCode((current) => !current)}>{showInvitationCode ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}</button>
            </div>
            <label className="auth-consent"><input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} /><span>我已阅读并同意<Link href="/privacy" target="_blank">《内部测试与隐私说明》</Link></span></label>
            {error && <div className="admin-message is-error" role="alert">{error}</div>}
            <button className="specular-action" type="submit" disabled={!invitationCode.trim() || !acceptedPrivacy || busy === "load"}><span>{busy === "load" ? "正在验证…" : "进入审核列表"}</span><Send aria-hidden="true" size={20} /></button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="admin-shell">
      <header className="admin-heading"><div><p className="section-kicker">阿嬷学院内部管理</p><h1>内容审核与发布</h1><p>只有来源和必要审核完整的版本才能发布。</p></div><div className="admin-heading-actions"><Link href="/admin/invitations"><UserPlus aria-hidden="true" size={18} />邀请码</Link><button type="button" onClick={() => void load()} disabled={Boolean(busy)}><RefreshCcw aria-hidden="true" size={18} />刷新</button></div></header>
      {notice && <div className="admin-message is-success" role="status"><Check aria-hidden="true" size={18} />{notice}</div>}
      {error && <div className="admin-message is-error" role="alert"><AlertTriangle aria-hidden="true" size={18} />{error}</div>}
      <section className="admin-course-list" aria-label="课程版本列表">
        {versions.map((version) => <CourseReviewCard key={version.id} version={version} busy={busy} mutate={mutate} />)}
      </section>
      <p className="admin-footnote">审核操作受管理员会话和角色权限保护；请勿转发管理员邀请码。</p>
    </main>
  );
}

function CourseReviewCard({ version, busy, mutate }: { version: AdminCourseVersion; busy: string; mutate: (label: string, task: () => Promise<AdminCourseVersion>) => Promise<void> }) {
  const firstSource = version.source_refs[0] ?? { name: "", url: "" };
  const [sourceName, setSourceName] = useState(firstSource.name);
  const [sourceUrl, setSourceUrl] = useState(firstSource.url);
  const [reviewer, setReviewer] = useState("");
  const [comment, setComment] = useState("");
  const professionalApproved = version.reviews.some((item) => item.review_type === "professional" && item.decision === "approved");
  const safetyApproved = version.reviews.some((item) => item.review_type === "safety" && item.decision === "approved");
  const needsSafety = version.risk_level === "L2" || version.risk_level === "L3";
  const locked = Boolean(busy);

  return (
    <article className="admin-course-card">
      <div className="admin-course-title"><div><span>{version.code} · v{version.version}</span><h2>{version.title}</h2></div><span className={`review-status is-${version.review_status}`}>{statusLabel[version.review_status]}</span></div>
      <p>{version.summary}</p>
      <div className="admin-review-checks"><span className={version.source_refs.length ? "is-done" : ""}><Link2 aria-hidden="true" size={17} />内容来源</span><span className={professionalApproved ? "is-done" : ""}><FileCheck2 aria-hidden="true" size={17} />专业审核</span>{needsSafety && <span className={safetyApproved ? "is-done" : ""}><ShieldCheck aria-hidden="true" size={17} />安全审核</span>}</div>

      {(version.review_status === "draft" || version.review_status === "rejected") && <div className="admin-form-block"><label>来源名称<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="例如：机构内部家政安全规范" /></label><label>来源链接<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label><div className="admin-action-row"><button type="button" disabled={locked || !sourceName.trim() || !sourceUrl.trim()} onClick={() => void mutate("保存来源", () => updateAdminCourseVersion(version, [{ name: sourceName.trim(), url: sourceUrl.trim() }], "内容管理员"))}>保存来源</button><button className="is-primary" type="button" disabled={locked || !version.source_refs.length} onClick={() => void mutate("提交审核", () => runAdminCourseAction(version.id, "submit-review", "内容管理员", "提交人工审核"))}>提交审核</button></div></div>}

      {version.review_status === "in_review" && <div className="admin-form-block"><label>审核人<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="填写真实审核人" /></label><label>审核意见<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="写明通过依据或需要修改的内容" /></label><div className="admin-action-row"><button type="button" disabled={locked || !reviewer.trim()} onClick={() => void mutate("退回修改", () => reviewAdminCourseVersion(version.id, professionalApproved && needsSafety ? "safety" : "professional", reviewer, "rejected", comment))}>退回修改</button>{!professionalApproved && <button className="is-primary" type="button" disabled={locked || !reviewer.trim()} onClick={() => void mutate("专业审核", () => reviewAdminCourseVersion(version.id, "professional", reviewer, "approved", comment))}>专业审核通过</button>}{professionalApproved && needsSafety && !safetyApproved && <button className="is-primary" type="button" disabled={locked || !reviewer.trim()} onClick={() => void mutate("安全审核", () => reviewAdminCourseVersion(version.id, "safety", reviewer, "approved", comment))}>安全审核通过</button>}</div></div>}

      {version.review_status === "approved" && <button className="admin-wide-action is-primary" type="button" disabled={locked} onClick={() => { if (window.confirm(`确认发布《${version.title}》v${version.version}？`)) void mutate("发布课程", () => runAdminCourseAction(version.id, "publish", "发布管理员", "发布至内部测试目录")); }}><Send aria-hidden="true" size={19} />发布到内部测试</button>}
      {version.review_status === "published" && <button className="admin-wide-action is-danger" type="button" disabled={locked} onClick={() => { if (window.confirm(`确认临时下架《${version.title}》？学习端将立即不可见。`)) void mutate("下架课程", () => runAdminCourseAction(version.id, "suspend", "发布管理员", "管理员手动下架")); }}><AlertTriangle aria-hidden="true" size={19} />临时下架</button>}
      {version.review_status === "suspended" && <button className="admin-wide-action" type="button" disabled={locked} onClick={() => { if (window.confirm(`确认恢复到《${version.title}》v${version.version}？`)) void mutate("回滚版本", () => runAdminCourseAction(version.id, "rollback", "发布管理员", "恢复已审核版本")); }}><Undo2 aria-hidden="true" size={19} />恢复这个版本</button>}
    </article>
  );
}
