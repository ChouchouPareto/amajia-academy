import { Bot } from "lucide-react";
import Link from "next/link";

export function HomeAiButton() {
  return (
    <Link className="home-ai-fab" href="/ask" aria-label="打开阿嬷 AI 老师提问页">
      <Bot aria-hidden="true" size={22} />
      <span>问 AI</span>
    </Link>
  );
}
