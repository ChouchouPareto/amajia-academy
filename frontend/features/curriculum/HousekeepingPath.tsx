"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check, Clock3, GraduationCap, LockKeyhole, Play, RefreshCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppError, getHousekeepingCourses, startHousekeepingCourse } from "@/lib/api";
import type { CourseCard } from "@/lib/types";

export function HousekeepingPath() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseCard[] | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState("");

  async function load() {
    setError("");
    setCourses(null);
    try { setCourses(await getHousekeepingCourses()); }
    catch (caught) { setError(caught instanceof AppError ? caught.message : "课程暂时加载不出来。"); }
  }

  useEffect(() => {
    let cancelled = false;
    getHousekeepingCourses()
      .then((value) => { if (!cancelled) setCourses(value); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof AppError ? caught.message : "课程暂时加载不出来。"); });
    return () => { cancelled = true; };
  }, []);

  async function start(course: CourseCard) {
    if (starting) return;
    setStarting(course.id);
    try {
      const session = await startHousekeepingCourse(course.id);
      router.push(`/learn/${session.id}`);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "课程暂时打不开。");
      setStarting("");
    }
  }

  const completed = courses?.filter((course) => course.progress_status === "completed").length ?? 0;

  return (
    <main id="main-content" className="flow-shell curriculum-shell">
      <header className="flow-topbar"><Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={20} />返回首页</Link><span className="prototype-badge"><GraduationCap aria-hidden="true" size={16} />家政入门</span></header>
      <section className="curriculum-intro">
        <p className="section-kicker">从第一门开始，慢慢学</p>
        <h1>家政入门学习路径</h1>
        <p>六门基础课，每节约8～10分钟。学到哪里都会自动保存。</p>
        <div className="curriculum-summary"><strong>{completed}/6</strong><span>门已完成</span><div><i style={{ width: `${Math.round(completed / 6 * 100)}%` }} /></div></div>
      </section>
      <div className="candidate-notice"><AlertCircle aria-hidden="true" size={21} /><div><strong>内部测试候选课程</strong><p>当前内容正在等待专业审核，暂不代表职业培训或实操认证。</p></div></div>
      {courses === null && !error && <div className="loading-card"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><strong>正在准备课程</strong></div>}
      {error && <div className="form-error" role="alert"><strong>暂时加载不出来</strong><span>{error}</span><button type="button" onClick={() => void load()}><RefreshCcw aria-hidden="true" size={18} />再试一次</button></div>}
      {courses && <section className="course-path" aria-label="家政课程">{courses.map((course, index) => {
        const isCompleted = course.progress_status === "completed";
        const isLearning = course.progress_status !== "not_started" && !isCompleted;
        return (
          <article className="course-path-card" key={course.id}>
            <div className={isCompleted ? "course-number is-complete" : "course-number"}>{isCompleted ? <Check aria-hidden="true" size={22} /> : index + 1}</div>
            <div className="course-path-content">
              <div className="course-card-meta"><span>{course.code}</span><span><Clock3 aria-hidden="true" size={15} />约{course.estimated_minutes}分钟</span><span><ShieldCheck aria-hidden="true" size={15} />{course.risk_level}</span></div>
              <h2>{course.title}</h2><p>{course.summary}</p>
              <div className="course-review-status"><LockKeyhole aria-hidden="true" size={15} />内容版本 v{course.version.version} · 待专业审核</div>
              <button type="button" onClick={() => void start(course)} disabled={Boolean(starting)}>
                <span>{starting === course.id ? "正在打开…" : isCompleted ? "重新看看" : isLearning ? "继续学习" : "开始学习"}</span>
                {isLearning ? <Play aria-hidden="true" size={18} /> : <ArrowRight aria-hidden="true" size={18} />}
              </button>
            </div>
          </article>
        );
      })}</section>}
      <p className="prototype-note">完成六门课程后，将开放家政综合后测</p>
    </main>
  );
}
