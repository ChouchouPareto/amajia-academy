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
