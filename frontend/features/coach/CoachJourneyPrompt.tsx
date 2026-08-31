"use client";

import { ArrowRight, BellRing, BookOpenCheck, ClipboardCheck, FileChartColumn } from "lucide-react";
import Link from "next/link";

import type { LearningOverview } from "@/lib/types";

const promptCopy = {
  start_pre_assessment: { icon: ClipboardCheck, title: "先做入门测一测", copy: "做完后，我带你开始第一门课。", href: "/assessment/pre", button: "开始测一测" },
  start_post_assessment: { icon: ClipboardCheck, title: "六门课学完了", copy: "做一次后测，看看学会了多少。", href: "/assessment/post", button: "开始学习后测" },
  view_report: { icon: FileChartColumn, title: "入门阶段完成了", copy: "查看结果，再准备实训和上岗。", href: "/report", button: "查看学习结果" },
} as const;

export function CoachJourneyPrompt({ overview, starting, onContinueCourse }: { overview: LearningOverview; starting: boolean; onContinueCourse: () => void }) {
  if (overview.recommended_action === "continue_course") {
    return <section className="coach-journey-prompt" aria-label="下一步学习提醒"><div className="coach-journey-label"><BellRing aria-hidden="true" size={18} /><strong>下一步</strong></div><div className="coach-journey-main"><span><BookOpenCheck aria-hidden="true" size={23} /></span><div><h2>继续下一门课</h2><p>已完成 {overview.completed_core_courses}/{overview.total_core_courses} 门，我来一步一步讲。</p></div></div><button type="button" onClick={onContinueCourse} disabled={starting}><span>{starting ? "正在准备…" : "继续学习"}</span><ArrowRight aria-hidden="true" size={20} /></button></section>;
  }

  const prompt = promptCopy[overview.recommended_action];
  const Icon = prompt.icon;
  return <section className="coach-journey-prompt" aria-label="下一步学习提醒"><div className="coach-journey-label"><BellRing aria-hidden="true" size={18} /><strong>下一步</strong></div><div className="coach-journey-main"><span><Icon aria-hidden="true" size={23} /></span><div><h2>{prompt.title}</h2><p>{prompt.copy}</p></div></div><Link href={prompt.href}><span>{prompt.button}</span><ArrowRight aria-hidden="true" size={20} /></Link></section>;
}
