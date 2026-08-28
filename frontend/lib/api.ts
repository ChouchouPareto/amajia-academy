import type { AdminCourseVersion, AiCapability, AssessmentAttempt, AssessmentResult, CourseCard, DeleteAccountResult, Invitation, IssuedInvitation, KnowledgeSearchResult, LearningOverview, LearningReport, LearningSession, MediaAsset, QuestionRequest, QuizResult, User } from "@/lib/types";

type ErrorPayload = {
  detail?: string;
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    request_id?: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/backend";
export const CURRENT_PRIVACY_VERSION = "2026-08-28-v1";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = "UNKNOWN_ERROR",
    public readonly retryable = true,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new AppError("现在连接不上学习服务，请确认本地服务已启动。", "NETWORK_ERROR", true);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    throw new AppError(
      payload.error?.message ?? payload.detail ?? "这一步没有完成，请稍后再试。",
      payload.error?.code,
      payload.error?.retryable,
      payload.error?.request_id,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<User> {
  return api<User>("/api/v1/auth/me");
}

export function loginWithInvite(invitationCode: string, displayName: string) {
  return api<User>("/api/v1/auth/invite-login", {
    method: "POST",
    body: JSON.stringify({ invitation_code: invitationCode, display_name: displayName, consent_accepted: true, consent_version: CURRENT_PRIVACY_VERSION }),
  });
}

export function logout() {
  return api<void>("/api/v1/auth/logout", { method: "POST" });
}

export function deleteCurrentAccount(confirmation: string) {
  return api<DeleteAccountResult>("/api/v1/auth/me", { method: "DELETE", body: JSON.stringify({ confirmation }) });
}

export function getInvitations() {
  return api<Invitation[]>("/api/v1/admin/invitations");
}

export function createInvitation(label: string, expiresDays: number) {
  return api<IssuedInvitation>("/api/v1/admin/invitations", {
    method: "POST",
    body: JSON.stringify({ label, expires_days: expiresDays }),
  });
}

export async function createQuestion(text: string, idempotencyKey: string, conversationId?: number): Promise<QuestionRequest> {
  const user = await getCurrentUser();
  return api<QuestionRequest>("/api/v1/questions", {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, text, idempotency_key: idempotencyKey, conversation_id: conversationId }),
  });
}

export function getQuestion(id: number) { return api<QuestionRequest>(`/api/v1/questions/${id}`); }
export function getAiCapability() { return api<AiCapability>("/api/v1/ai/capability"); }
export function searchKnowledge(query: string) { return api<KnowledgeSearchResult>(`/api/v1/knowledge/search?q=${encodeURIComponent(query)}`); }
export function answerQuestion(id: number) { return api<QuestionRequest>(`/api/v1/questions/${id}/answer`, { method: "POST" }); }
export function confirmQuestion(id: number) { return api<LearningSession>(`/api/v1/questions/${id}/confirm`, { method: "POST" }); }
export function getLearningSession(id: number) { return api<LearningSession>(`/api/v1/learning/sessions/${id}`); }
export function getLearningMedia(id: number) { return api<MediaAsset[]>(`/api/v1/learning/sessions/${id}/media`); }
export function saveLearningProgress(id: number, currentStep: number) {
  return api<LearningSession>(`/api/v1/learning/sessions/${id}/progress`, { method: "POST", body: JSON.stringify({ current_step: currentStep }) });
}
export function submitQuiz(id: number, answer: string) {
  return api<QuizResult>(`/api/v1/learning/sessions/${id}/quiz`, { method: "POST", body: JSON.stringify({ answer }) });
}
export async function getLearningRecords() {
  const user = await getCurrentUser();
  return api<LearningSession[]>(`/api/v1/learning/users/${user.id}/records`);
}

export async function getHousekeepingCourses() {
  const user = await getCurrentUser();
  return api<CourseCard[]>(`/api/v1/housekeeping/courses?user_id=${user.id}`);
}

export async function startHousekeepingCourse(courseId: string) {
  const user = await getCurrentUser();
  return api<LearningSession>(`/api/v1/housekeeping/courses/${courseId}/start`, {
    method: "POST",
    body: JSON.stringify({ user_id: user.id }),
  });
}

export async function getLearningOverview() {
  const user = await getCurrentUser();
  return api<LearningOverview>(`/api/v1/learning/overview?user_id=${user.id}`);
}

export async function startAssessment(kind: "pre" | "post", idempotencyKey: string) {
  const user = await getCurrentUser();
  return api<AssessmentAttempt>(`/api/v1/assessments/${kind}/start`, {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, idempotency_key: idempotencyKey }),
  });
}

export function saveAssessmentAnswer(attemptId: number, questionId: string, selectedAnswer: string) {
  return api<AssessmentAttempt>(`/api/v1/assessments/attempts/${attemptId}/answers/${questionId}`, {
    method: "PUT",
    body: JSON.stringify({ selected_answer: selectedAnswer }),
  });
}

export function submitAssessment(attemptId: number) {
  return api<AssessmentResult>(`/api/v1/assessments/attempts/${attemptId}/submit`, { method: "POST" });
}

export async function getLearningReport() {
  const user = await getCurrentUser();
  return api<LearningReport>(`/api/v1/learning/report?user_id=${user.id}`);
}

export function getAdminCourseVersions() {
  return api<AdminCourseVersion[]>("/api/v1/admin/course-versions");
}

export function updateAdminCourseVersion(version: AdminCourseVersion, sourceRefs: Array<{ name: string; url: string }>, actor: string) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${version.id}`, {
    method: "PUT",
    body: JSON.stringify({
      objectives: version.objectives,
      source_refs: sourceRefs,
      title: version.title,
      summary: version.summary,
      risk_level: version.risk_level,
      disclaimer: version.disclaimer,
      conclusion: version.conclusion,
      steps: version.steps,
      quiz: version.quiz,
      actor,
      idempotency_key: `update-${version.id}-${crypto.randomUUID()}`,
    }),
  });
}

export function runAdminCourseAction(
  versionId: number,
  action: "submit-review" | "publish" | "suspend" | "rollback",
  actor: string,
  comment: string,
) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${versionId}/${action}`, {
    method: "POST",
    body: JSON.stringify({ actor, comment, idempotency_key: `${action}-${versionId}-${crypto.randomUUID()}` }),
  });
}

export function reviewAdminCourseVersion(
  versionId: number,
  reviewType: "professional" | "safety" | "editorial",
  reviewer: string,
  decision: "approved" | "rejected",
  comment: string,
) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${versionId}/approve`, {
    method: "POST",
    body: JSON.stringify({ actor: reviewer, reviewer, review_type: reviewType, decision, comment, idempotency_key: `review-${versionId}-${reviewType}-${crypto.randomUUID()}` }),
  });
}
