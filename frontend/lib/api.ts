import type { AdminCourseVersion, AssessmentAttempt, AssessmentResult, CourseCard, LearningOverview, LearningReport, LearningSession, QuestionRequest, QuizResult, User } from "@/lib/types";

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
const TEST_USER_KEY = "amajia_v040_test_user";

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

  return (await response.json()) as T;
}

export async function getOrCreateTestUser(): Promise<User> {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(TEST_USER_KEY);
    if (saved) {
      try { return JSON.parse(saved) as User; } catch { window.localStorage.removeItem(TEST_USER_KEY); }
    }
  }
  const user = await api<User>("/api/v1/auth/test-login", { method: "POST" });
  if (typeof window !== "undefined") window.localStorage.setItem(TEST_USER_KEY, JSON.stringify(user));
  return user;
}

export async function createQuestion(text: string, idempotencyKey: string): Promise<QuestionRequest> {
  const user = await getOrCreateTestUser();
  return api<QuestionRequest>("/api/v1/questions", {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, text, idempotency_key: idempotencyKey }),
  });
}

export function getQuestion(id: number) { return api<QuestionRequest>(`/api/v1/questions/${id}`); }
export function confirmQuestion(id: number) { return api<LearningSession>(`/api/v1/questions/${id}/confirm`, { method: "POST" }); }
export function getLearningSession(id: number) { return api<LearningSession>(`/api/v1/learning/sessions/${id}`); }
export function saveLearningProgress(id: number, currentStep: number) {
  return api<LearningSession>(`/api/v1/learning/sessions/${id}/progress`, { method: "POST", body: JSON.stringify({ current_step: currentStep }) });
}
export function submitQuiz(id: number, answer: string) {
  return api<QuizResult>(`/api/v1/learning/sessions/${id}/quiz`, { method: "POST", body: JSON.stringify({ answer }) });
}
export async function getLearningRecords() {
  const user = await getOrCreateTestUser();
  return api<LearningSession[]>(`/api/v1/learning/users/${user.id}/records`);
}

export async function getHousekeepingCourses() {
  const user = await getOrCreateTestUser();
  return api<CourseCard[]>(`/api/v1/housekeeping/courses?user_id=${user.id}`);
}

export async function startHousekeepingCourse(courseId: string) {
  const user = await getOrCreateTestUser();
  return api<LearningSession>(`/api/v1/housekeeping/courses/${courseId}/start`, {
    method: "POST",
    body: JSON.stringify({ user_id: user.id }),
  });
}

export async function getLearningOverview() {
  const user = await getOrCreateTestUser();
  return api<LearningOverview>(`/api/v1/learning/overview?user_id=${user.id}`);
}

export async function startAssessment(kind: "pre" | "post", idempotencyKey: string) {
  const user = await getOrCreateTestUser();
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
  const user = await getOrCreateTestUser();
  return api<LearningReport>(`/api/v1/learning/report?user_id=${user.id}`);
}

function adminHeaders(adminKey: string) { return { "X-Admin-Key": adminKey }; }

export function getAdminCourseVersions(adminKey: string) {
  return api<AdminCourseVersion[]>("/api/v1/admin/course-versions", { headers: adminHeaders(adminKey) });
}

export function updateAdminCourseVersion(adminKey: string, version: AdminCourseVersion, sourceRefs: Array<{ name: string; url: string }>, actor: string) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${version.id}`, {
    method: "PUT",
    headers: adminHeaders(adminKey),
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
  adminKey: string,
  versionId: number,
  action: "submit-review" | "publish" | "suspend" | "rollback",
  actor: string,
  comment: string,
) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${versionId}/${action}`, {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ actor, comment, idempotency_key: `${action}-${versionId}-${crypto.randomUUID()}` }),
  });
}

export function reviewAdminCourseVersion(
  adminKey: string,
  versionId: number,
  reviewType: "professional" | "safety" | "editorial",
  reviewer: string,
  decision: "approved" | "rejected",
  comment: string,
) {
  return api<AdminCourseVersion>(`/api/v1/admin/course-versions/${versionId}/approve`, {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ actor: reviewer, reviewer, review_type: reviewType, decision, comment, idempotency_key: `review-${versionId}-${reviewType}-${crypto.randomUUID()}` }),
  });
}
