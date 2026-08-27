export type User = {
  id: number;
  display_name: string;
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
  status: "waiting_confirmation" | "confirmed" | "blocked" | "no_match";
  lesson_id: string | null;
  risk_level: string;
  message: string | null;
  next_action: string | null;
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
