"use client";

import { BookOpenCheck, Bot, Check, ChevronRight, Repeat2, Text, UserRound, X } from "lucide-react";
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
        <Link href="/choose-mode"><Repeat2 aria-hidden="true" size={21} /><span>版本</span><small>切换方式</small></Link>
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
  return <><p className="section-kicker">AI 专业陪学</p><h2 id="home-modal-title">AI 老师可以全程陪着学</h2><ol className="ai-guide-steps"><li><span>1</span><div><strong>说出你想学的事</strong><p>不用专业词，像平时说话一样提问。</p></div></li><li><span>2</span><div><strong>在对话里一步一步学</strong><p>不用跳回普通课程页面。</p></div></li><li><span>3</span><div><strong>进度自动同步</strong><p>切换回基础版也能看到同一份学习记录。</p></div></li></ol><Link className="modal-primary-action" href="/coach">进入 AI 专业陪学<ChevronRight aria-hidden="true" size={21} /></Link></>;
}
