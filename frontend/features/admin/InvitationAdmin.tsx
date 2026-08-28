"use client";

import { ArrowLeft, Check, Clipboard, KeyRound, Plus, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppError, createInvitation, getInvitations } from "@/lib/api";
import type { Invitation, IssuedInvitation } from "@/lib/types";

export function InvitationAdmin() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [issued, setIssued] = useState<IssuedInvitation | null>(null);
  const [label, setLabel] = useState("");
  const [expiresDays, setExpiresDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void getInvitations().then(setInvitations).catch((caught) => setError(caught instanceof AppError ? caught.message : "邀请码列表暂时无法加载")); }, []);

  async function issue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setIssued(null); setCopied(false);
    try { const result = await createInvitation(label.trim(), expiresDays); setIssued(result); setLabel(""); setInvitations(await getInvitations()); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "邀请码暂时无法生成"); }
    finally { setBusy(false); }
  }

  async function copyCode() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.invitation_code);
    setCopied(true);
  }

  return (
    <main id="main-content" className="admin-shell invitation-shell">
      <Link className="back-link" href="/admin/content"><ArrowLeft aria-hidden="true" size={20} />返回课程审核</Link>
      <header className="admin-heading"><div><p className="section-kicker">内部测试用户</p><h1>发放邀请码</h1><p>每个邀请码只绑定一个测试用户，过期后不能首次使用。</p></div></header>
      {error && <div className="admin-message is-error" role="alert">{error}<span>{invitations === null && <>请先到<Link href="/admin/content">课程审核页</Link>使用管理员邀请码登录。</>}</span></div>}
      <form className="invitation-form" onSubmit={issue}>
        <label htmlFor="invite-label">用户标记<input id="invite-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="例如：首批试学用户01" minLength={2} maxLength={120} required /></label>
        <label htmlFor="invite-days">首次使用有效期<select id="invite-days" value={expiresDays} onChange={(event) => setExpiresDays(Number(event.target.value))}><option value={7}>7天</option><option value={14}>14天</option><option value={30}>30天</option></select></label>
        <button className="admin-wide-action is-primary" type="submit" disabled={busy || label.trim().length < 2}><Plus aria-hidden="true" size={19} />{busy ? "正在生成…" : "生成一个邀请码"}</button>
      </form>
      {issued && <section className="issued-invitation" role="status"><span><KeyRound aria-hidden="true" size={23} /></span><div><small>只显示在本次页面中，请立即发送给对应用户</small><strong>{issued.invitation_code}</strong></div><button type="button" onClick={() => void copyCode()}>{copied ? <Check aria-hidden="true" size={18} /> : <Clipboard aria-hidden="true" size={18} />}{copied ? "已复制" : "复制"}</button></section>}
      <section className="invitation-list" aria-label="邀请码发放记录">
        <h2>发放记录</h2>
        {invitations?.map((item) => <article key={item.id}><span className={item.claimed_by_user_id ? "is-claimed" : ""}>{item.claimed_by_user_id ? <UserCheck aria-hidden="true" size={19} /> : <KeyRound aria-hidden="true" size={19} />}</span><div><strong>{item.label}</strong><small>{item.claimed_by_user_id ? "已绑定用户" : item.active ? "等待首次使用" : "已停用"} · {item.expires_at ? `${new Date(item.expires_at).toLocaleDateString("zh-CN")} 到期` : "长期有效"}</small></div></article>)}
        {invitations?.length === 0 && <p>还没有发放记录。</p>}
      </section>
    </main>
  );
}
