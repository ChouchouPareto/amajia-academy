"use client";

import { ArrowRight, Award, NotebookTabs } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppError, getLearningOverview } from "@/lib/api";
import type { LearningOverview } from "@/lib/types";
import { HomeControls } from "@/features/home/HomeControls";

const actions = {
  start_pre_assessment: { href: "/assessment/pre", eyebrow: "先了解现在的基础", title: "开始家政入门测一测", copy: "12道小题，不计考试，只用来推荐学习顺序。", button: "开始测一测" },
  continue_course: { href: "/housekeeping", eyebrow: "继续上一次学习", title: "接着学习下一门家政课", copy: "每节约8～10分钟，学习位置会自动保存。", button: "继续学习" },
  start_post_assessment: { href: "/assessment/post", eyebrow: "六门入门课已完成", title: "看看我学会了多少", copy: "完成后会得到前后对比和复习建议。", button: "开始学习后测" },
  view_report: { href: "/report", eyebrow: "本阶段学习已完成", title: "查看我的学习提升", copy: "看看已经掌握的内容，以及下一步应该复习什么。", button: "查看学习报告" },
} as const;

export function HomeDashboard() {
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getLearningOverview()
      .then((value) => { if (!cancelled) setOverview(value); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof AppError ? caught.message : "学习进度暂时加载不出来。"); });
    return () => { cancelled = true; };
  }, []);

  const action = actions[overview?.recommended_action ?? "start_pre_assessment"];
  const percent = overview?.total_core_courses ? Math.round((overview.completed_core_courses / overview.total_core_courses) * 100) : 0;

  return (
    <main id="main-content" className="home-shell academy-home">
      <AppHeader current="home" />
      <div className="v2-home-intro"><h1>今天接着学</h1><p>按课程慢慢学，进度自动保存。</p></div>

      <section className="academy-primary-card academy-learning-summary academy-spotlight" aria-busy={!overview && !error}>
        {error ? (
          <div className="academy-state"><strong>进度暂时加载不出来</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>再试一次</button></div>
        ) : !overview ? (
          <div className="academy-state"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在准备你的学习路径</strong></div>
        ) : (
          <>
            <div className="academy-spotlight-copy">
              <p className="section-kicker">{action.eyebrow}</p>
              <h2>{action.title}</h2>
              <p>{action.copy}</p>
              <Link className="academy-main-action specular-action" href={action.href}><span>{action.button}</span><ArrowRight aria-hidden="true" size={22} /></Link>
            </div>
            <div className="academy-inline-progress"><div><span>家政入门进度</span><strong>{overview.completed_core_courses}/{overview.total_core_courses} 门</strong></div><div className="academy-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div></div>
          </>
        )}
      </section>

      <section className="academy-shortcuts" aria-labelledby="shortcut-title">
        <h2 id="shortcut-title" className="sr-only">学习与上岗</h2>
        <div>
          <Link href="/records"><NotebookTabs aria-hidden="true" size={23} /><span className="academy-shortcut-copy"><strong>学习记录</strong><small>看看已经学了什么</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
          <Link href="/career-path"><Award aria-hidden="true" size={23} /><span className="academy-shortcut-copy"><strong>上岗准备</strong><small>了解实训与就业路径</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
        </div>
      </section>
      <details className="v2-more"><summary>更多功能</summary><HomeControls /></details>
      <p className="home-content-note">内测学习记录不等于职业资格或实操认证</p>
    </main>
  );
}
