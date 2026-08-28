"use client";

import { ArrowRight, BookOpenCheck, ChartNoAxesColumnIncreasing, CheckCircle2, Clock3, GraduationCap, House, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppError, getLearningOverview } from "@/lib/api";
import type { LearningOverview } from "@/lib/types";
import { HomeComposer } from "@/features/question/HomeComposer";

const actions = {
  start_pre_assessment: { href: "/assessment/pre", eyebrow: "先了解现在的基础", title: "开始家政入门测一测", copy: "6道小题，不计考试，只用来推荐学习顺序。", button: "开始测一测" },
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
      <AppHeader current="home" />
      <section className="academy-welcome">
        <span className="academy-badge"><GraduationCap aria-hidden="true" size={18} />家政入门内测版</span>
        <p>你好，欢迎来到</p>
        <h1>阿嬷学院</h1>
        <h2>从家政入门，学会一门新本事。</h2>
        <p className="academy-lead">不用怕看不懂。我们把家政基础知识拆成小步骤，每次只学一件事。</p>
      </section>

      <HomeComposer />

      <section className="academy-primary-card" aria-busy={!overview && !error}>
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
          </>
        )}
      </section>

      <section className="academy-progress-card" aria-label="家政学习进度">
        <div><span className="academy-icon tone-mint"><ChartNoAxesColumnIncreasing aria-hidden="true" size={23} /></span><div><small>家政入门进度</small><strong>{overview ? `已完成 ${overview.completed_core_courses}/${overview.total_core_courses} 门` : "正在加载"}</strong></div><span>{percent}%</span></div>
        <div className="academy-progress-track"><span style={{ width: `${percent}%` }} /></div>
        <Link href="/housekeeping">查看完整学习路径<ArrowRight aria-hidden="true" size={18} /></Link>
      </section>

      <section className="academy-shortcuts" aria-labelledby="shortcut-title">
        <div className="mobile-section-title"><div><span>清楚知道下一步</span><h2 id="shortcut-title">家政入门学习</h2></div></div>
        <div>
          <Link href="/housekeeping"><span className="academy-icon tone-sky"><House aria-hidden="true" size={23} /></span><span className="academy-shortcut-copy"><strong>六门基础课</strong><small>从职业规范学到衣物洗涤</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
          <Link href="/records"><span className="academy-icon tone-peach"><BookOpenCheck aria-hidden="true" size={23} /></span><span className="academy-shortcut-copy"><strong>我的学习</strong><small>继续学习或回看已完成内容</small></span><ArrowRight aria-hidden="true" size={19} /></Link>
        </div>
      </section>

      <div className="academy-trust">
        <span><ShieldCheck aria-hidden="true" size={18} />候选内容明确标识，待专业审核</span>
        <span><Clock3 aria-hidden="true" size={18} />每节约8～10分钟</span>
        {overview?.report_status === "complete" && <span><CheckCircle2 aria-hidden="true" size={18} />学习提升已经可以查看</span>}
      </div>
      <p className="home-content-note">当前为内部开发测试，线上学习结果不等于职业资格或实操认证</p>
      <Link className="home-account-link" href="/account"><UserRound aria-hidden="true" size={17} />账号与隐私</Link>
    </main>
  );
}
