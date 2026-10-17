import { api } from "./api";

export type PracticeAttempt = {
  id: number; attempt_no: number; response_text: string;
  status: "submitted" | "reviewed" | "needs_revision";
  feedback: string | null; criteria: Record<string, boolean>;
  submitted_at: string; reviewed_at: string | null;
};
export type PracticeTask = {
  session_id: number; course_id: string; title: string; prompt: string;
  content_status: string; boundary: string; can_submit: boolean;
  criteria_labels: Record<string, string>; attempt: PracticeAttempt | null;
  learner_id?: number;
  reference_steps?: {title: string; body: string}[];
  reference_disclaimer?: string;
};
export type LearningOutcomes = {
  course_completed: number; total_courses: number; teachback_reviewed: number;
  awaiting_review: number; needs_revision: number; practical_verified: false;
  boundary: string; tasks: PracticeTask[];
  next_action: {kind: "course" | "practice" | "handoff"; course_id: string | null; session_id: number | null; label: string; reason: string};
};
export type PilotSummary = {
  learners: number; started_learners: number; completed_lessons: number;
  submitted_teachbacks: number; awaiting_review: number; reviewed_teachbacks: number;
  published_courses: number; total_courses: number; boundary: string; measurement_note: string;
};
export const getOutcomes = () => api<LearningOutcomes>("/api/v1/learning/outcomes", {cache: "no-store"});
export const getPractice = (id: number) => api<PracticeTask>(`/api/v1/learning/sessions/${id}/practice`, {cache: "no-store"});
export const submitPractice = (id: number, response_text: string, idempotency_key: string, expected_attempt_no: number) =>
  api<PracticeTask>(`/api/v1/learning/sessions/${id}/practice`, {method: "POST", body: JSON.stringify({response_text, idempotency_key, expected_attempt_no})});
export const getPracticeQueue = () => api<PracticeTask[]>("/api/v1/admin/practice");
export const getPilotSummary = () => api<PilotSummary>("/api/v1/admin/pilot-summary");
export const reviewPractice = (id: number, decision: "reviewed" | "needs_revision", feedback: string, criteria: Record<string, boolean>) =>
  api<PracticeTask>(`/api/v1/admin/practice/${id}/review`, {method: "POST", body: JSON.stringify({decision, feedback, ...criteria})});
