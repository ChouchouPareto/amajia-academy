"use client";

import { ArrowLeft, LogOut, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppError, deleteCurrentAccount, getCurrentUser, logout } from "@/lib/api";
import type { User } from "@/lib/types";

const DELETE_PHRASE = "删除我的学习数据";

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  useEffect(() => { void getCurrentUser().then(setUser).catch((caught) => setError(caught instanceof AppError ? caught.message : "账号信息暂时无法加载")); }, []);

  async function signOut() {
    setBusy("logout"); setError("");
    try { await logout(); window.location.replace("/welcome"); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "暂时无法退出，请重试"); setBusy(""); }
  }

  async function removeAccount() {
    if (!window.confirm("确认永久删除账号、学习进度、测评答案和提问记录？删除后无法恢复。")) return;
    setBusy("delete"); setError("");
    try { const result = await deleteCurrentAccount(confirmation); setReceipt(result.receipt); setUser(null); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "删除没有完成，请重试"); }
    finally { setBusy(""); }
  }

  if (receipt) return <main id="main-content" className="account-shell"><section className="account-success"><ShieldCheck aria-hidden="true" size={30} /><h1>学习数据已删除</h1><p>删除回执：<code>{receipt}</code></p><p>请保存这个回执。原邀请码已经停用。</p><Link className="specular-action" href="/welcome"><span>返回邀请码页面</span></Link></section></main>;

  return (
    <main id="main-content" className="account-shell">
      <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={20} />返回首页</Link>
      <header><p className="section-kicker">账号与隐私</p><h1>我的账号</h1><p>管理登录状态和自己的学习数据。</p></header>
      {error && <div className="auth-error" role="alert">{error}<span>请重试，仍有问题时联系测试负责人。</span></div>}
      <section className="account-card"><span className="account-icon"><UserRound aria-hidden="true" size={24} /></span><div><small>当前称呼</small><strong>{user?.display_name ?? "正在加载…"}</strong><p>{user?.role === "learner" ? "内部测试学员" : "内部内容管理员"}</p></div></section>
      <button className="account-logout" type="button" disabled={Boolean(busy)} onClick={() => void signOut()}><LogOut aria-hidden="true" size={20} />{busy === "logout" ? "正在退出…" : "退出当前账号"}</button>
      <section className="account-danger">
        <span><Trash2 aria-hidden="true" size={22} /></span><div><h2>删除账号和学习数据</h2><p>将永久删除学习进度、测评答案和提问记录，无法恢复。</p></div>
        <label htmlFor="delete-confirmation">请输入“{DELETE_PHRASE}”</label>
        <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        <button type="button" disabled={busy === "delete" || confirmation !== DELETE_PHRASE} onClick={() => void removeAccount()}>{busy === "delete" ? "正在删除…" : "永久删除"}</button>
      </section>
      <Link className="account-privacy-link" href="/privacy">查看《内部测试与隐私说明》</Link>
    </main>
  );
}
