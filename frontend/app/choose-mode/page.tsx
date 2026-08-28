import { ArrowRight, BookOpenCheck, Bot, CheckCircle2, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function ChooseModePage() {
  return (
    <main id="main-content" className="mode-shell">
      <header className="mode-header">
        <span className="mode-logo"><Bot aria-hidden="true" size={25} /></span>
        <div><strong>阿嬷学院</strong><span>学习记录会自动同步</span></div>
      </header>

      <section className="mode-intro">
        <p className="section-kicker">选择学习方式</p>
        <h1>今天想怎么学？</h1>
        <p>自己按课程学，或者让 AI 老师全程陪着学。</p>
      </section>

      <section className="mode-options" aria-label="选择学习方式">
        <article className="mode-card mode-card--basic">
          <div className="mode-card-head"><span><BookOpenCheck aria-hidden="true" size={28} /></span><div><p>基础学习版</p><h2>自己按课程学习</h2></div></div>
          <ul>
            <li><CheckCircle2 aria-hidden="true" size={18} />选择六门家政基础课</li>
            <li><CheckCircle2 aria-hidden="true" size={18} />阅读步骤并完成练习</li>
            <li><CheckCircle2 aria-hidden="true" size={18} />查看进度和学习报告</li>
          </ul>
          <Link href="/" className="mode-action mode-action--basic"><span>进入基础学习版</span><ArrowRight aria-hidden="true" size={22} /></Link>
        </article>

        <article className="mode-card mode-card--coach">
          <span className="mode-free"><Sparkles aria-hidden="true" size={15} />测试期免费</span>
          <div className="mode-card-head"><span><MessageCircleMore aria-hidden="true" size={28} /></span><div><p>AI 专业陪学版</p><h2>让 AI 老师全程陪着学</h2></div></div>
          <ul>
            <li><CheckCircle2 aria-hidden="true" size={18} />在对话里完成整门课程</li>
            <li><CheckCircle2 aria-hidden="true" size={18} />可以说话、听讲和随时提问</li>
            <li><CheckCircle2 aria-hidden="true" size={18} />根据错题补讲并接着上次学习</li>
          </ul>
          <Link href="/coach" className="mode-action mode-action--coach"><span>进入 AI 专业陪学</span><ArrowRight aria-hidden="true" size={22} /></Link>
        </article>
      </section>

      <p className="mode-trust"><ShieldCheck aria-hidden="true" size={17} />测试期间两个版本均免费，不会要求支付</p>
    </main>
  );
}
