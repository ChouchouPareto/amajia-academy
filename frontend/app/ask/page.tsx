import { AskForm } from "@/features/question/AskForm";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ example?: string }> }) {
  const { example = "" } = await searchParams;
  return <AskForm initialQuestion={example} />;
}
