"use client";

import { ArrowRight, Award, BookOpenCheck, CheckCircle2, ShieldCheck } from "lucide-react";
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
  const percent = overview ? Math.round((overview.completed_core_courses / overview.total_core_courses) * 100) : 0;

  return (
    <main id="main-content" className="home-shell academy-home">
      <div className="academy-home-head">
        <AppHeader current="home" />
        <section className="academy-welcome">
          <div className="academy-welcome-copy"><h1>阿嬷学院</h1><p className="academy-lead">从入门学到上岗。</p></div>
        </section>
      </div>

      <section className="academy-primary-card academy-learning-summary" aria-busy={!overview && !error}>
        {error ? (
          <div className="academy-state"><strong>进度暂时加载不出来</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>再试一次</button></div>
        ) : !overview ? (
          <div className="academy-state"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在准备你的学习路径</strong></div>
        ) : (
          <>
            <p className="section-kicker">{action.eyebrow}</p>
            <h2>{action.title}</h2>
            <p>{action.copy}</p>
            <Link className="academy-main-action specular-action" href={action.href}><span>{action.button}</span><ArrowRight aria-hidden="true" size={22} /></Link>
            <div className="academy-inline-progress"><div><span>家政入门进度</span><strong>{overview.completed_core_courses}/{overview.total_core_courses} 门</strong></div><div className="academy-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div></div>
          </>
        )}
      </section>

      <HomeControls />
      <section className="academy-shortcuts" aria-labelledby="shortcut-title">
        <div className="mobile-section-title"><div><span>常用入口</span><h2 id="shortcut-title">学习与上岗</h2></div></div>
        <div>
          <Link href="/housekeeping"><span className="academy-icon tone-sky"><BookOpenCheck aria-hidden="true" size={23} /></span><span className="academy-shortcut-copy"><strong>六门家政基础课</strong><small>查看课程，继续上次学习</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
          <Link href="/career-path"><span className="academy-icon tone-peach"><Award aria-hidden="true" size={23} /></span><span className="academy-shortcut-copy"><strong>从入门到上岗</strong><small>技能、实操、证书和就业全流程</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
        </div>
      </section>

      <div className="academy-trust">
        <span><ShieldCheck aria-hidden="true" size={18} />候选内容明确标识，待专业审核</span>
        {overview?.report_status === "complete" && <span><CheckCircle2 aria-hidden="true" size={18} />学习提升已经可以查看</span>}
      </div>
      <p className="home-content-note">当前为内部开发测试，线上学习结果不等于职业资格或实操认证</p>
    </main>
  );
}
