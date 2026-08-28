export type User = {
  id: number;
  display_name: string;
  role: "learner" | "content_admin" | "super_admin";
  status: "active" | "disabled";
  consent_version: string | null;
  consented_at: string | null;
};

export type DeleteAccountResult = {
  deleted: boolean;
  receipt: string;
};

export type Invitation = {
  id: number;
  label: string;
  role: "learner";
  active: boolean;
  claimed_by_user_id: number | null;
  expires_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

export type IssuedInvitation = Invitation & {
  invitation_code: string;
};

export type QuizOption = {
  id: string;
  label: string;
};

export type Lesson = {
  id: string;
  title: string;
  domain: string;
  risk_level: string;
  disclaimer: string;
  conclusion: string;
  steps: Array<{ title: string; body: string }>;
  quiz: {
    question: string;
    options: QuizOption[];
    correct_answer: string;
  };
  content_status: string;
};

export type LearningSession = {
  id: number;
  user_id: number;
  lesson_id: string;
  course_version_id: number | null;
  lesson: Lesson;
  status: "learning" | "checking" | "completed";
  current_step: number;
  quiz_attempts: number;
  completed_at: string | null;
};

export type QuizResult = {
  correct: boolean;
  message: string;
  session: LearningSession;
};

export type QuestionRequest = {
  id: number;
  user_id: number;
  original_text: string;
  understood_text: string;
  status: "waiting_confirmation" | "answered" | "knowledge_unavailable" | "confirmed" | "blocked" | "no_match";
  lesson_id: string | null;
  risk_level: string;
  message: string | null;
  next_action: string | null;
  answer: string | null;
  answer_mode: "model" | "knowledge_fallback" | "unavailable" | null;
  knowledge_refs: Array<{ type: "course" | "source"; title?: string; name?: string; url?: string; version?: number }>;
  model_provider: string | null;
  model_name: string | null;
  prompt_version: string | null;
  latency_ms: number | null;
};

export type AiCapability = {
  mode: "review_required" | "model_ready" | "knowledge_only";
  model_configured: boolean;
  published_knowledge_count: number;
  label: string;
  message: string;
};

export type KnowledgeSearchResult = {
  query: string;
  retrieval_mode: "structured_lexical" | "hybrid_embedding";
  message: string;
  hits: Array<{
    course_id: string;
    course_version_id: number;
    version: number;
    title: string;
    section: string;
    content: string;
    disclaimer: string;
    score: number;
    source_refs: Array<{ name?: string; url?: string }>;
  }>;
};

export type CourseCard = {
  id: string;
  code: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  risk_level: string;
  content_status: string;
  progress_status: string;
  progress_percent: number;
  version: {
    id: number;
    version: number;
    objectives: string[];
    source_refs: Array<{ name?: string; url?: string }>;
    review_status: string;
    reviewer: string | null;
    reviewed_at: string | null;
  };
};

export type LearningOverview = {
  housekeeping_status: string;
  pre_assessment_status: string;
  completed_core_courses: number;
  total_core_courses: number;
  recommended_action: "start_pre_assessment" | "continue_course" | "start_post_assessment" | "view_report";
  recommended_course_id: string | null;
  post_assessment_status: string;
  report_status: string;
};

export type AssessmentQuestion = {
  id: string;
  knowledge_point: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  is_safety_critical: boolean;
};

export type AssessmentAttempt = {
  id: number;
  kind: "pre" | "post";
  status: "in_progress" | "submitted";
  assessment_version: string;
  answers: Record<string, string>;
  questions: AssessmentQuestion[];
  score: number | null;
};

export type AssessmentResult = {
  attempt_id: number;
  kind: "pre" | "post";
  status: "submitted";
  score: number;
  correct_count: number;
  question_count: number;
  knowledge_point_results: Record<string, boolean>;
  is_official: boolean;
};

export type LearningReport = {
  report_status: "complete" | "incomplete";
  pre_score: number | null;
  post_score: number | null;
  improvement_points: number | null;
  relative_improvement: number | null;
  mastered_knowledge_points: string[];
  review_knowledge_points: string[];
  completed_core_courses: number;
  calculation_version: string;
  missing: string[];
};

export type ContentReview = {
  id: number;
  review_type: "professional" | "safety" | "editorial";
  reviewer: string;
  decision: "approved" | "rejected";
  comment: string;
  created_at: string;
};

export type AdminCourseVersion = {
  id: number;
  course_id: string;
  code: string;
  version: number;
  title: string;
  summary: string;
  risk_level: string;
  disclaimer: string;
  conclusion: string;
  objectives: string[];
  source_refs: Array<{ name: string; url: string }>;
  steps: Array<{ title: string; body: string }>;
  quiz: Record<string, unknown>;
  review_status: "draft" | "in_review" | "approved" | "published" | "suspended" | "rejected";
  reviewer: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  suspended_at: string | null;
  reviews: ContentReview[];
};
