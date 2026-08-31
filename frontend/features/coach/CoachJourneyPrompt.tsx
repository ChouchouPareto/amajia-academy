"use client";

import { ArrowRight, BellRing, BookOpenCheck, ClipboardCheck, FileChartColumn, Sparkles } from "lucide-react";
import Link from "next/link";

import type { LearningOverview } from "@/lib/types";

const promptCopy = {
  start_pre_assessment: { icon: ClipboardCheck, title: "先做一次入门测一测", copy: "做完回来，我会按照你的基础陪你开始第一门课。", href: "/assessment/pre", button: "去做入门测一测" },
  start_post_assessment: { icon: ClipboardCheck, title: "六门课已经学完", copy: "现在做学习后测，我会继续提醒你查看提升结果。", href: "/assessment/post", button: "去做学习后测" },
  view_report: { icon: FileChartColumn, title: "线上入门阶段完成了", copy: "查看学习结果后，我会继续陪你准备实训、证书和上岗步骤。", href: "/report", button: "查看学习结果" },
} as const;

export function CoachJourneyPrompt({ overview, starting, onContinueCourse }: { overview: LearningOverview; starting: boolean; onContinueCourse: () => void }) {
  if (overview.recommended_action === "continue_course") {
    return <section className="coach-journey-prompt" aria-label="AI 学习提醒"><div className="coach-journey-label"><BellRing aria-hidden="true" size={18} /><strong>AI 学习提醒</strong></div><div className="coach-journey-main"><span><BookOpenCheck aria-hidden="true" size={23} /></span><div><h2>接着学习下一门家政课</h2><p>已完成 {overview.completed_core_courses}/{overview.total_core_courses} 门。我会在对话里一步一步讲，并自动同步进度。</p></div></div><button type="button" onClick={onContinueCourse} disabled={starting}><span>{starting ? "正在准备下一课…" : "继续学习，AI 陪着我"}</span><ArrowRight aria-hidden="true" size={20} /></button></section>;
  }

  const prompt = promptCopy[overview.recommended_action];
  const Icon = prompt.icon;
  return <section className="coach-journey-prompt" aria-label="AI 学习提醒"><div className="coach-journey-label"><BellRing aria-hidden="true" size={18} /><strong>AI 学习提醒</strong></div><div className="coach-journey-main"><span><Icon aria-hidden="true" size={23} /></span><div><h2>{prompt.title}</h2><p>{prompt.copy}</p></div></div><Link href={prompt.href}><span>{prompt.button}</span><ArrowRight aria-hidden="true" size={20} /></Link><p className="coach-journey-note"><Sparkles aria-hidden="true" size={15} />完成后回到这里，我会读取同一份学习记录并提醒下一步。</p></section>;
}
