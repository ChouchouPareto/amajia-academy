import { AssessmentFlow } from "@/features/assessment/AssessmentFlow";

export default async function AssessmentPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return <AssessmentFlow kind={kind === "post" ? "post" : "pre"} />;
}
