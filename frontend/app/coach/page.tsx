import { AskForm } from "@/features/question/AskForm";

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ example?: string; conversation?: string }> }) {
  const { example = "", conversation } = await searchParams;
  const conversationId = conversation && /^\d+$/.test(conversation) ? Number(conversation) : undefined;
  return <AskForm key={conversationId ?? "new"} initialQuestion={example} initialConversationId={conversationId} />;
}
