"use client";

import { ArrowRight, BookOpenText, Clock3, GraduationCap, House, Menu, MessageSquarePlus, NotebookTabs, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AppHeaderProps = { current?: "home" | "records" | "tools" };

export function AppHeader({ current }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const opener = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="app-topbar">
        <button ref={menuButtonRef} className="icon-button" type="button" aria-label="打开导航菜单" aria-expanded={open} aria-controls="app-drawer" onClick={() => setOpen(true)}>
          <Menu aria-hidden="true" size={26} />
        </button>
        <Link className="assistant-name" href="/" aria-label="阿嬷学院首页"><span>阿嬷学院</span><small>从家政入门学本事</small></Link>
        <Link className={current === "tools" ? "icon-button is-active" : "icon-button"} href="/housekeeping" aria-label="打开家政学习路径"><GraduationCap aria-hidden="true" size={24} /></Link>
      </header>

      {open && (
        <div className="drawer-layer" role="presentation">
          <button className="drawer-scrim" type="button" aria-label="关闭导航菜单" onClick={() => setOpen(false)} />
          <aside id="app-drawer" className="app-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="drawer-heading">
              <div><span className="drawer-logo"><BookOpenText aria-hidden="true" size={22} /></span><div><strong id="drawer-title">阿嬷学院</strong><small>从家政入门，学会新本事</small></div></div>
              <button ref={closeButtonRef} className="icon-button" type="button" aria-label="关闭导航菜单" onClick={() => setOpen(false)}><X aria-hidden="true" size={24} /></button>
            </div>
            <Link className="new-learning-link" href="/housekeeping" onClick={() => setOpen(false)}><MessageSquarePlus aria-hidden="true" size={22} />开始家政学习<ArrowRight aria-hidden="true" size={20} /></Link>
            <nav className="drawer-nav" aria-label="应用导航">
              <Link className={current === "home" ? "is-current" : ""} href="/" onClick={() => setOpen(false)}><House aria-hidden="true" size={21} /><span><strong>首页</strong><small>查看当前学习任务</small></span></Link>
              <Link className={current === "records" ? "is-current" : ""} href="/records" onClick={() => setOpen(false)}><NotebookTabs aria-hidden="true" size={21} /><span><strong>我的学习</strong><small>查看已完成的学习记录</small></span></Link>
              <Link className={current === "tools" ? "is-current" : ""} href="/housekeeping" onClick={() => setOpen(false)}><GraduationCap aria-hidden="true" size={21} /><span><strong>家政学习路径</strong><small>按顺序完成六门入门课</small></span></Link>
            </nav>
            <div className="drawer-note"><ShieldCheck aria-hidden="true" size={19} /><span><strong>隐私提醒</strong><small>不要填写姓名、住址或电话号码</small></span></div>
            <div className="drawer-footer"><Clock3 aria-hidden="true" size={18} />每次只学一件事，约 8～10 分钟<Settings aria-hidden="true" size={18} /></div>
          </aside>
        </div>
      )}
    </>
  );
}
