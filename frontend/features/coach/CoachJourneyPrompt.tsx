"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import type { LearningOverview } from "@/lib/types";

const promptCopy = {
  start_pre_assessment: { copy: "我们先用几道小题了解你的基础，做完后我就从最合适的一课开始陪你学。", href: "/assessment/pre", button: "先了解我的基础" },
  start_post_assessment: { copy: "六门入门课已经学完了。我们简单回顾一下，看看哪些已经掌握、哪些还要再讲。", href: "/assessment/post", button: "一起回顾一下" },
  view_report: { copy: "入门学习已经完成。我把这段时间的学习结果整理好了，接下来可以准备实训和上岗。", href: "/report", button: "看看我的学习结果" },
} as const;

type Props = {
  overview: LearningOverview | null;
  starting: boolean;
  examples: string[];
  onContinueCourse: () => void;
  onChooseExample: (example: string) => void;
};

export function CoachJourneyPrompt({ overview, starting, examples, onContinueCourse, onChooseExample }: Props) {
  const exampleReplies = examples.slice(0, overview ? 2 : 3).map((example) => (
    <button key={example} type="button" onClick={() => onChooseExample(example)}>
      <span>{example}</span><ArrowRight aria-hidden="true" size={17} />
    </button>
  ));

  if (!overview) {
    return <AssistantTurn copy="你好。你可以直接告诉我想学什么，也可以从下面选一个问题开始。">{exampleReplies}</AssistantTurn>;
  }

  if (overview.recommended_action === "continue_course") {
    return <AssistantTurn copy={`我记得你已经完成 ${overview.completed_core_courses}/${overview.total_core_courses} 门。今天可以接着学下一门，我会直接开始讲；哪里没听懂，随时告诉我。`}>
      <button className="is-recommended" type="button" onClick={onContinueCourse} disabled={starting}><span>{starting ? "正在准备…" : "接着上次学习"}</span><ArrowRight aria-hidden="true" size={17} /></button>
      {exampleReplies}
    </AssistantTurn>;
  }

  const prompt = promptCopy[overview.recommended_action];
  return <AssistantTurn copy={prompt.copy}>
    <Link className="is-recommended" href={prompt.href}><span>{prompt.button}</span><ArrowRight aria-hidden="true" size={17} /></Link>
    {exampleReplies}
  </AssistantTurn>;
}

function AssistantTurn({ copy, children }: { copy: string; children: React.ReactNode }) {
  return <article className="coach-assistant-turn" aria-label="阿嬷 AI 老师">
    <div className="coach-answer-label"><Sparkles aria-hidden="true" size={17} /><strong>阿嬷 AI 老师</strong></div>
    <p>{copy}</p>
    <div className="coach-conversation-replies" aria-label="可以这样回复">{children}</div>
  </article>;
}
