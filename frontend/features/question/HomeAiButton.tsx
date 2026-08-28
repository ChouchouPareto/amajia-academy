import { Bot } from "lucide-react";
import Link from "next/link";

export function HomeAiButton() {
  return (
    <Link className="home-ai-fab" href="/coach" aria-label="进入 AI 专业陪学版">
      <Bot aria-hidden="true" size={22} />
      <span>AI 陪学</span>
    </Link>
  );
}
