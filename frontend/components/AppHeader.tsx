"use client";

import { ArrowRight, BookOpenText, Clock3, Grid2X2, House, Menu, MessageSquarePlus, NotebookTabs, Settings, ShieldCheck, X } from "lucide-react";
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
        <Link className="assistant-name" href="/" aria-label="4060学习助手首页"><span>4060学习助手</span><small>陪你一步一步学</small></Link>
        <Link className={current === "tools" ? "icon-button is-active" : "icon-button"} href="/tools" aria-label="打开学习工具"><Grid2X2 aria-hidden="true" size={24} /></Link>
      </header>

      {open && (
        <div className="drawer-layer" role="presentation">
          <button className="drawer-scrim" type="button" aria-label="关闭导航菜单" onClick={() => setOpen(false)} />
          <aside id="app-drawer" className="app-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="drawer-heading">
              <div><span className="drawer-logo"><BookOpenText aria-hidden="true" size={22} /></span><div><strong id="drawer-title">4060学习助手</strong><small>把生活难题变成小步骤</small></div></div>
              <button ref={closeButtonRef} className="icon-button" type="button" aria-label="关闭导航菜单" onClick={() => setOpen(false)}><X aria-hidden="true" size={24} /></button>
            </div>
            <Link className="new-learning-link" href="/ask" onClick={() => setOpen(false)}><MessageSquarePlus aria-hidden="true" size={22} />开始新问题<ArrowRight aria-hidden="true" size={20} /></Link>
            <nav className="drawer-nav" aria-label="应用导航">
              <Link className={current === "home" ? "is-current" : ""} href="/" onClick={() => setOpen(false)}><House aria-hidden="true" size={21} /><span><strong>首页</strong><small>继续学习或开始提问</small></span></Link>
              <Link className={current === "records" ? "is-current" : ""} href="/records" onClick={() => setOpen(false)}><NotebookTabs aria-hidden="true" size={21} /><span><strong>我的学习</strong><small>查看已完成的学习记录</small></span></Link>
              <Link className={current === "tools" ? "is-current" : ""} href="/tools" onClick={() => setOpen(false)}><Grid2X2 aria-hidden="true" size={21} /><span><strong>学习工具</strong><small>按场景选择学习入口</small></span></Link>
            </nav>
            <div className="drawer-note"><ShieldCheck aria-hidden="true" size={19} /><span><strong>隐私提醒</strong><small>不要填写姓名、住址或电话号码</small></span></div>
            <div className="drawer-footer"><Clock3 aria-hidden="true" size={18} />每次只学一件事，约 3～5 分钟<Settings aria-hidden="true" size={18} /></div>
          </aside>
        </div>
      )}
    </>
  );
}
