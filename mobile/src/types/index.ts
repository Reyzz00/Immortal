export type UserState = {
  date: string;
  sleep_score: number;
  stress_score: number;
  energy_score: number;
  recovery_score: number;
  load_score: number;
  composite_readiness: number;
  hrv_latest: number | null;
  sleep_hours_latest: number | null;
  resting_hr_latest: number | null;
  anomalies: string[];
};

export type Recommendation = {
  id: number;
  timestamp: string;
  type: string;
  message: string;
  reasoning: string;
  expected_impact: string;
  confidence: number;
  status: "pending" | "accepted" | "ignored";
  context_json: Record<string, unknown>;
};

export type CheckInQuestion = {
  key: string;
  prompt: string;
  kind: "scale" | "boolean" | "choice";
  choices?: string[] | null;
  reason: string;
};

export type CheckInPrompt = {
  generated_at: string;
  questions: CheckInQuestion[];
};

export type Experiment = {
  id: number;
  name: string;
  hypothesis: string;
  outcome_metric: string;
  start_date: string;
  end_date: string;
  baseline_value: number | null;
  result_value: number | null;
  effect_size: number | null;
  status: "active" | "completed" | "cancelled";
};

export type Insight = {
  id: string;
  title: string;
  body: string;
  kind: "trend" | "anomaly" | "correlation" | "win";
  confidence: number;
};

export type TrendPoint = { date: string; value: number };

export type TrendSeries = {
  metric_type: string;
  baseline: number | null;
  points: TrendPoint[];
};
