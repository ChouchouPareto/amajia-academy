"use client";

import { BookOpenCheck, GraduationCap, House, NotebookTabs } from "lucide-react";
import Link from "next/link";

type CurrentPage = "home" | "records" | "tools";

const items = [
  { href: "/", label: "首页", key: "home", icon: House },
  { href: "/housekeeping", label: "家政课", key: "tools", icon: BookOpenCheck },
  { href: "/records", label: "我的学习", key: "records", icon: NotebookTabs },
] as const;

export function PillNav({ current }: { current?: CurrentPage }) {
  return (
    <div className="academy-pill-nav-container">
      <nav className="academy-pill-nav" aria-label="主要导航">
        <Link className="academy-pill-logo" href="/" aria-label="阿嬷学院首页">
          <GraduationCap aria-hidden="true" size={23} strokeWidth={2.2} />
        </Link>
        <ul className="academy-pill-list">
          {items.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <li key={item.href}>
                <Link className={active ? "academy-pill is-active" : "academy-pill"} href={item.href} aria-current={active ? "page" : undefined}>
                  <span className="academy-pill-fill" aria-hidden="true" />
                  <span className="academy-pill-label"><Icon aria-hidden="true" size={18} /><span>{item.label}</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
