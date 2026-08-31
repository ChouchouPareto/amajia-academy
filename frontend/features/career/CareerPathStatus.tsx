"use client";

import { ArrowRight, Check, Circle, Home, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppError, getLearningOverview } from "@/lib/api";
import type { LearningOverview } from "@/lib/types";

const actionCopy = {
  start_pre_assessment: {
    title: "从入门测一测开始",
    copy: "先了解当前基础，再安排六门课的学习顺序。",
    href: "/assessment/pre",
    button: "开始测一测",
    currentStep: 0,
  },
  continue_course: {
    title: "继续完成家政基础课",
    copy: "学习记录会自动保存，完成六门课后进入学习后测。",
    href: "/housekeeping",
    button: "继续学习",
    currentStep: 1,
  },
  start_post_assessment: {
    title: "完成学习后测",
    copy: "检查学习提升，生成下一步复习建议。",
    href: "/assessment/post",
    button: "开始学习后测",
    currentStep: 2,
  },
  view_report: {
    title: "线上入门阶段已完成",
    copy: "现在可以查看学习结果，再根据所在城市准备实训、证书与岗位核验。",
    href: "/report",
    button: "查看学习结果",
    currentStep: 3,
  },
} as const;

const steps = ["入门测评", "六门课程", "学习后测", "查看结果"];

export function CareerPathStatus() {
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getLearningOverview()
      .then((value) => { if (active) setOverview(value); })
      .catch((caught) => { if (active) setError(caught instanceof AppError ? caught.message : "学习进度暂时加载不出来。"); });
    return () => { active = false; };
  }, []);

  if (!overview && !error) {
    return <section className="career-status-card" aria-live="polite"><LoaderCircle className="career-status-loader" aria-hidden="true" size={24} /><strong>正在整理你的完整流程…</strong></section>;
  }

  if (!overview) {
    return <section className="career-status-card career-status-card--error"><strong>暂时看不到学习结果</strong><p>{error}</p><Link href="/">返回首页</Link></section>;
  }

  const action = actionCopy[overview.recommended_action];
  return (
    <section className="career-status-card" aria-labelledby="career-status-title">
      <p className="section-kicker">你的当前结果</p>
      <h2 id="career-status-title">{action.title}</h2>
      <p>{action.copy}</p>
      <ol className="career-status-steps" aria-label="线上入门阶段进度">
        {steps.map((step, index) => {
          const completed = index < action.currentStep || overview.recommended_action === "view_report";
          const current = index === action.currentStep && overview.recommended_action !== "view_report";
          return <li className={completed ? "is-complete" : current ? "is-current" : ""} key={step}>{completed ? <Check aria-hidden="true" size={16} /> : <Circle aria-hidden="true" size={13} />}<span>{step}</span>{current && <small>现在</small>}</li>;
        })}
      </ol>
      <Link className="career-status-primary" href={action.href}><span>{action.button}</span><ArrowRight aria-hidden="true" size={20} /></Link>
      <Link className="career-status-return" href="/"><Home aria-hidden="true" size={18} />暂时不做，返回首页</Link>
    </section>
  );
}
