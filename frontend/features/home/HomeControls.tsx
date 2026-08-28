"use client";

import { BookOpenCheck, Bot, Check, ChevronRight, Text, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Panel = "course" | "guide" | null;

export function HomeControls() {
  const [panel, setPanel] = useState<Panel>(null);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    const enabled = window.localStorage.getItem("amajia-large-text") === "true";
    document.documentElement.classList.toggle("large-text", enabled);
    queueMicrotask(() => setLargeText(enabled));
  }, []);

  useEffect(() => {
    if (!panel) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", closeOnEscape); };
  }, [panel]);

  function toggleLargeText() {
    const next = !largeText;
    setLargeText(next);
    window.localStorage.setItem("amajia-large-text", String(next));
    document.documentElement.classList.toggle("large-text", next);
  }

  return (
    <>
      <section className="home-controls" aria-label="常用功能">
        <button type="button" onClick={() => setPanel("course")}><BookOpenCheck aria-hidden="true" size={21} /><span>课程</span><small>家政入门</small></button>
        <button type="button" aria-pressed={largeText} onClick={toggleLargeText}><Text aria-hidden="true" size={21} /><span>大字</span><small>{largeText ? "已开启" : "标准"}</small></button>
        <button type="button" onClick={() => setPanel("guide")}><Bot aria-hidden="true" size={21} /><span>AI 引导</span><small>教我操作</small></button>
        <Link href="/account"><UserRound aria-hidden="true" size={21} /><span>账号</span><small>管理资料</small></Link>
      </section>
      {panel && <div className="home-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
        <section className="home-modal" role="dialog" aria-modal="true" aria-labelledby="home-modal-title">
          <button className="home-modal-close" type="button" aria-label="关闭窗口" autoFocus onClick={() => setPanel(null)}><X aria-hidden="true" size={22} /></button>
          {panel === "course" ? <CoursePanel /> : <GuidePanel />}
        </section>
      </div>}
    </>
  );
}

function CoursePanel() {
  return <><p className="section-kicker">课程选择</p><h2 id="home-modal-title">选择学习方向</h2><div className="course-switch-list"><Link href="/housekeeping"><span><BookOpenCheck aria-hidden="true" size={22} /></span><div><strong>家政入门</strong><small>当前开放 · 6门基础课</small></div><Check aria-hidden="true" size={21} /></Link><div aria-disabled="true"><span>02</span><div><strong>更多职业方向</strong><small>后续经过调研和审核后开放</small></div></div></div></>;
}

function GuidePanel() {
  return <><p className="section-kicker">AI 引导操作</p><h2 id="home-modal-title">我可以一步一步带你用</h2><ol className="ai-guide-steps"><li><span>1</span><div><strong>说出你想学的事</strong><p>不用专业词，像平时说话一样提问。</p></div></li><li><span>2</span><div><strong>先确认我有没有听懂</strong><p>不对就返回修改，不会直接乱回答。</p></div></li><li><span>3</span><div><strong>跟着课程一步步学</strong><p>每次只做一件事，学习位置自动保存。</p></div></li></ol><Link className="modal-primary-action" href="/ask">现在问 AI 老师<ChevronRight aria-hidden="true" size={21} /></Link></>;
}
