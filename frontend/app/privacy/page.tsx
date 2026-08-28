import type { Metadata } from "next";
import { ArrowLeft, Database, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "内部测试与隐私说明｜阿嬷学院" };

export default function PrivacyPage() {
  return (
    <main id="main-content" className="legal-shell">
      <Link className="back-link" href="/welcome"><ArrowLeft aria-hidden="true" size={20} />返回邀请码页面</Link>
      <header><p className="section-kicker">版本：2026-08-28-v1</p><h1>内部测试与隐私说明</h1><p>请先看懂我们会保存什么、为什么保存，以及怎样删除。</p></header>
      <section><span><Database aria-hidden="true" size={23} /></span><div><h2>保存哪些信息</h2><p>你的称呼、学习进度、测评答案、提问记录和登录会话。邀请码只保存不可还原的哈希值。</p></div></section>
      <section><span><ShieldCheck aria-hidden="true" size={23} /></span><div><h2>为什么保存</h2><p>用于恢复学习位置、生成学习提升报告、排查内测问题。当前不会用于广告，也不会要求身份证、银行卡或支付信息。</p></div></section>
      <section><span><Trash2 aria-hidden="true" size={23} /></span><div><h2>你可以随时删除</h2><p>在“我的账号”中可以删除账号和学习数据。删除后无法恢复，原邀请码同时停用，只保留不含身份信息的删除回执。</p></div></section>
      <div className="legal-notice"><strong>重要边界</strong><p>课程仍是内部测试候选内容，不等同于职业培训、资格证书、就业承诺或实操认证。遇到人身安全、误食或化学品事故，请联系当地专业应急服务。</p></div>
      <p className="legal-contact">对数据有疑问时，请联系向你发放邀请码的测试负责人。</p>
    </main>
  );
}
