"use client";

import { ArrowRight, Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppError, loginWithInvite } from "@/lib/api";

export function InviteWelcome() {
  const [displayName, setDisplayName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await loginWithInvite(invitationCode.trim(), displayName.trim());
      const requested = new URLSearchParams(window.location.search).get("next");
      const safeNext = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      window.location.replace(user.role === "learner" ? safeNext : "/admin/content");
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "暂时无法进入，请检查邀请码后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="auth-shell">
      <section className="auth-intro">
        <span className="auth-mark"><GraduationCap aria-hidden="true" size={27} /></span>
        <p className="section-kicker">家政入门内部测试</p>
        <h1>欢迎来到<br />阿嬷学院</h1>
        <p>用负责人发给你的邀请码进入。每次只学一件事，学习位置会自动保存。</p>
      </section>

      <form className="auth-card" onSubmit={submit} aria-busy={busy}>
        <div>
          <h2>开始学习</h2>
          <p>邀请码只用于确认内部测试身份。</p>
        </div>
        <label htmlFor="display-name">怎么称呼你</label>
        <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" placeholder="例如：王阿姨" minLength={2} maxLength={30} required />
        <label htmlFor="invitation-code">邀请码</label>
        <div className="auth-code-field">
          <input id="invitation-code" type={showCode ? "text" : "password"} value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} autoComplete="current-password" placeholder="可以直接粘贴邀请码" minLength={8} maxLength={80} required />
          <button type="button" aria-label={showCode ? "隐藏邀请码" : "显示邀请码"} aria-pressed={showCode} onClick={() => setShowCode((value) => !value)}>{showCode ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}</button>
        </div>
        <label className="auth-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>我已阅读并同意<Link href="/privacy" target="_blank">《内部测试与隐私说明》</Link></span></label>
        {error && <div className="auth-error" role="alert">{error}<span>请检查姓名和邀请码，或联系测试负责人。</span></div>}
        <button className="specular-action auth-submit" type="submit" disabled={busy || !accepted || displayName.trim().length < 2 || invitationCode.trim().length < 8}><span>{busy ? "正在进入…" : "进入阿嬷学院"}</span><ArrowRight aria-hidden="true" size={21} /></button>
        <p className="auth-helper"><ShieldCheck aria-hidden="true" size={17} />不会要求身份证、银行卡或支付信息</p>
      </form>
    </main>
  );
}
