import { redirect } from "next/navigation";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ example?: string }> }) {
  const { example = "" } = await searchParams;
  const suffix = example ? `?example=${encodeURIComponent(example)}` : "";
  redirect(`/coach${suffix}`);
}
