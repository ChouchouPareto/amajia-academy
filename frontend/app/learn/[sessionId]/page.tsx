import { LearningFlow } from "@/features/learning/LearningFlow";

export default async function LearningPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <LearningFlow sessionId={sessionId} />;
}
