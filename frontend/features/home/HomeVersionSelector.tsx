"use client";

import { BookOpenCheck, Bot, Check, ChevronDown, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function HomeVersionSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeWhenOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", closeWhenOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      window.removeEventListener("pointerdown", closeWhenOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <div className="academy-version-selector" ref={containerRef}>
      <button
        className="academy-badge"
        type="button"
        aria-expanded={open}
        aria-controls="academy-version-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <GraduationCap aria-hidden="true" size={18} />
        <span>家政入门内测版</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>

      {open && (
        <div className="academy-version-menu" id="academy-version-menu" aria-label="选择学习版本">
          <Link href="/" className="is-current" onClick={() => setOpen(false)}>
            <span className="academy-version-icon"><BookOpenCheck aria-hidden="true" size={20} /></span>
            <span><strong>基础学习版</strong><small>自己按课程学习</small></span>
            <Check aria-hidden="true" size={19} />
          </Link>
          <Link href="/coach" onClick={() => setOpen(false)}>
            <span className="academy-version-icon"><Bot aria-hidden="true" size={20} /></span>
            <span><strong>AI 专业陪学版</strong><small>测试期免费 · 对话式陪学</small></span>
          </Link>
        </div>
      )}
    </div>
  );
}
