export type LearningMode = "basic" | "coach";

export type LearningModePreference = {
  user_id: number;
  preferred_mode: LearningMode;
  allowed_modes: LearningMode[];
  access_label: string;
};

export function learningHome(mode: LearningMode): "/basic" | "/coach" {
  return mode === "coach" ? "/coach" : "/basic";
}
