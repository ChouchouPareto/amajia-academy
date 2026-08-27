import type { LearningSession, QuestionRequest, QuizResult, User } from "@/lib/types";

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    request_id?: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/backend";
const TEST_USER_KEY = "4060_test_user";

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
      payload.error?.message ?? "这一步没有完成，请稍后再试。",
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
