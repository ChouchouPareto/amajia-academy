import { ArrowRight, Baby, BookOpenCheck, Home, ListChecks, MessageSquareText, ShieldCheck, WashingMachine } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

const groups = [
  { title: "开始学习", items: [
    { icon: MessageSquareText, title: "文字提问", copy: "像平时说话一样写问题", href: "/ask", tone: "sky" },
    { icon: BookOpenCheck, title: "分步学习", copy: "把难题拆成容易跟的步骤", href: "/ask", tone: "mint" },
  ] },
  { title: "生活场景", items: [
    { icon: WashingMachine, title: "家政清洁", copy: "清洁顺序与注意事项", href: "/ask?example=%E5%8E%A8%E6%88%BF%E6%B2%B9%E6%B1%A1%EF%BC%8C%E5%BA%94%E8%AF%A5%E5%85%88%E6%93%A6%E5%93%AA%E9%87%8C%EF%BC%9F", tone: "peach" },
    { icon: Baby, title: "育儿照护", copy: "用更简单的方法解决日常问题", href: "/ask?example=%E5%AD%A9%E5%AD%90%E7%9D%A1%E5%89%8D%E6%80%BB%E6%8B%96%E5%BB%B6%EF%BC%8C%E6%80%8E%E4%B9%88%E5%AE%89%E6%8E%92%E9%A1%BA%E5%BA%8F%EF%BC%9F", tone: "sky" },
    { icon: Home, title: "家庭整理", copy: "从一个小区域开始整理", href: "/ask?example=%E5%AE%B6%E9%87%8C%E4%B8%9C%E8%A5%BF%E5%A4%AA%E5%A4%9A%EF%BC%8C%E5%BA%94%E8%AF%A5%E4%BB%8E%E5%93%AA%E9%87%8C%E5%BC%80%E5%A7%8B%E6%94%B6%EF%BC%9F", tone: "mint" },
    { icon: ShieldCheck, title: "安全常识", copy: "识别风险并找到下一步", href: "/ask", tone: "peach" },
  ] },
  { title: "我的内容", items: [
    { icon: ListChecks, title: "学习记录", copy: "找回完成过的学习", href: "/records", tone: "mint" },
  ] },
];

export default function ToolsPage() {
  return (
    <main id="main-content" className="page-shell tools-shell">
      <AppHeader current="tools" />
      <header className="tools-intro"><span>按场景快速开始</span><h1>学习工具</h1><p>选一个最接近的入口，不确定时直接使用“文字提问”。</p></header>
      {groups.map((group) => <section className="tool-group" key={group.title} aria-labelledby={`tool-${group.title}`}><h2 id={`tool-${group.title}`}>{group.title}</h2><div className="tool-card-grid">{group.items.map(({ icon: Icon, title, copy, href, tone }) => <Link href={href} key={title}><span className={`tool-icon tone-${tone}`}><Icon aria-hidden="true" size={25} /></span><span><strong>{title}</strong><small>{copy}</small></span><ArrowRight aria-hidden="true" size={19} /></Link>)}</div></section>)}
      <p className="prototype-note">工具会根据实际能力逐步开放</p>
    </main>
  );
}
