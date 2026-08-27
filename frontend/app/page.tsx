import { ArrowRight, BookOpenCheck, Clock3, HeartHandshake, Home, ListChecks, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { HomeComposer } from "@/features/question/HomeComposer";

const suggestions = ["厨房油污，应该先擦哪里？", "孩子睡前总拖延，怎么安排顺序？", "家里东西太多，应该从哪里开始收？"];
const quickTools = [
  { href: "/ask", icon: BookOpenCheck, label: "问一问", detail: "输入问题" },
  { href: `/ask?example=${encodeURIComponent(suggestions[0])}`, icon: Home, label: "家务", detail: "清洁整理" },
  { href: `/ask?example=${encodeURIComponent(suggestions[1])}`, icon: HeartHandshake, label: "育儿", detail: "家庭照护" },
  { href: "/records", icon: ListChecks, label: "学习记录", detail: "再学一遍" },
];

export default function HomePage() {
  return (
    <main id="main-content" className="home-shell mobile-home">
      <AppHeader current="home" />
      <section className="assistant-welcome" aria-labelledby="home-title">
        <div className="welcome-mark" aria-hidden="true"><BookOpenCheck size={28} /></div>
        <p className="welcome-kicker">你的生活学习伙伴</p>
        <h1 id="home-title">你好，我是<br /><span>4060学习助手</span></h1>
        <p className="welcome-copy">不用会搜索，也不用看很长的文章。告诉我一件具体的事，我会先确认，再陪你一步一步学。</p>
        <div className="trust-row" aria-label="产品特点"><span><ShieldCheck aria-hidden="true" size={17} />先确认再回答</span><span><Clock3 aria-hidden="true" size={17} />3～5分钟一节</span></div>
      </section>
      <section className="suggestion-section" aria-labelledby="suggestion-title">
        <div className="mobile-section-title"><div><span>不会写也没关系</span><h2 id="suggestion-title">可以这样问我</h2></div><Link href="/tools">更多工具<ArrowRight aria-hidden="true" size={17} /></Link></div>
        <div className="suggestion-list">
          {suggestions.map((question, index) => <Link key={question} href={`/ask?example=${encodeURIComponent(question)}`}><span className={`suggestion-number tone-${index + 1}`}>{index + 1}</span><strong>{question}</strong><ArrowRight aria-hidden="true" size={20} /></Link>)}
        </div>
      </section>
      <section className="quick-tool-section" aria-labelledby="quick-tool-title">
        <div className="mobile-section-title"><div><span>常用入口</span><h2 id="quick-tool-title">想学什么</h2></div></div>
        <div className="quick-tool-grid">
          {quickTools.map(({ href, icon: Icon, label, detail }) => <Link key={label} href={href}><span><Icon aria-hidden="true" size={22} /></span><strong>{label}</strong><small>{detail}</small></Link>)}
        </div>
      </section>
      <p className="home-content-note">当前为内部演示，学习内容尚未经过专业审核</p>
      <HomeComposer />
    </main>
  );
}
