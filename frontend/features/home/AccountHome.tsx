"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppError, getCurrentUser, getLearningMode } from "@/lib/api";
import { learningHome } from "@/lib/learning-mode";
import { BrandIdentity } from "@/components/BrandIdentity";

export function AccountHome() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function enter() {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (user.role !== "learner") { router.replace("/admin/content"); return; }
        const preference = await getLearningMode();
        if (active) router.replace(learningHome(preference.preferred_mode));
      } catch (caught) {
        if (!active) return;
        if (caught instanceof AppError && ["AUTH_REQUIRED", "SESSION_INVALID"].includes(caught.code)) {
          router.replace("/welcome"); return;
        }
        setError(caught instanceof Error ? caught.message : "暂时无法读取账号，请重试。");
      }
    }
    void enter();
    return () => { active = false; };
  }, [attempt, router]);
  return <main className="account-entry" id="main-content">
    <BrandIdentity compact />
    {error ? <section role="alert"><h1>暂时进不去首页</h1><p>{error}</p><button className="v2-primary" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>重试</button><Link href="/welcome">重新登录</Link></section>
      : <p role="status">正在打开你的学习首页…</p>}
  </main>;
}
