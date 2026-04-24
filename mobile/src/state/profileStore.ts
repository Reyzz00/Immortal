import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Sex = "female" | "male" | "other";

export type ActivityLevel = "sedentary" | "light" | "active" | "very_active";

export type SleepBucket = "<6" | "6-7" | "7-8" | "8+";

export type CaffeineBucket = "none" | "1-2" | "3-4" | "5+";

export type AlcoholBucket = "none" | "rarely" | "weekly" | "daily";

export type Goal =
  | "improve_sleep"
  | "reduce_stress"
  | "endurance"
  | "lose_weight"
  | "build_muscle"
  | "more_energy"
  | "recover_better"
  | "live_longer";

export type Condition =
  | "none"
  | "diabetes"
  | "hypertension"
  | "heart"
  | "sleep_apnea"
  | "pregnant"
  | "other";

export type Units = "metric" | "imperial";

export type DataSourceId = "apple_health" | "fitbit" | "oura" | "garmin" | "whoop" | "manual";

export type Profile = {
  firstName?: string;
  birthYear?: number;
  sex?: Sex;
  units?: Units;
  heightCm?: number;
  weightKg?: number;
  goals?: Goal[];
  activityLevel?: ActivityLevel;
  averageSleep?: SleepBucket;
  caffeine?: CaffeineBucket;
  alcohol?: AlcoholBucket;
  conditions?: Condition[];
  medications?: string;
};

export type ConnectedSource = {
  id: DataSourceId;
  connected: boolean;
  connectedAt?: string;
};

type State = {
  onboarded: boolean;
  profile: Profile;
  sources: Record<DataSourceId, ConnectedSource>;
};

type Actions = {
  setProfile: (patch: Partial<Profile>) => void;
  finishOnboarding: () => void;
  resetOnboarding: () => void;
  setSourceConnected: (id: DataSourceId, connected: boolean) => void;
};

const defaultSources: Record<DataSourceId, ConnectedSource> = {
  apple_health: { id: "apple_health", connected: false },
  fitbit: { id: "fitbit", connected: false },
  oura: { id: "oura", connected: false },
  garmin: { id: "garmin", connected: false },
  whoop: { id: "whoop", connected: false },
  manual: { id: "manual", connected: false },
};

/**
 * Profile + source-connection state persisted to device via AsyncStorage.
 *
 * There's no user account — onboarding writes directly to disk and the app
 * reads from disk on every launch. Nothing leaves the device for this slice;
 * HealthKit samples are still ingested by the backend as a separate pipeline.
 */
export const useProfileStore = create<State & Actions>()(
  persist(
    (set) => ({
      onboarded: false,
      profile: { units: "metric" },
      sources: defaultSources,

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      finishOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () =>
        set({ onboarded: false, profile: { units: "metric" }, sources: defaultSources }),
      setSourceConnected: (id, connected) =>
        set((s) => ({
          sources: {
            ...s.sources,
            [id]: {
              id,
              connected,
              connectedAt: connected ? new Date().toISOString() : undefined,
            },
          },
        })),
    }),
    {
      name: "immortal.profile.v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist the hydration flag — actions are pure, state carries everything.
      partialize: (s) => ({ onboarded: s.onboarded, profile: s.profile, sources: s.sources }),
    },
  ),
);

export const GOAL_LABELS: Record<Goal, { label: string; emoji: string }> = {
  improve_sleep: { label: "Improve sleep", emoji: "☾" },
  reduce_stress: { label: "Reduce stress", emoji: "❀" },
  endurance: { label: "Build endurance", emoji: "⚡" },
  lose_weight: { label: "Lose weight", emoji: "◐" },
  build_muscle: { label: "Build muscle", emoji: "▲" },
  more_energy: { label: "More energy", emoji: "✦" },
  recover_better: { label: "Recover better", emoji: "♡" },
  live_longer: { label: "Live longer", emoji: "✺" },
};

export const SOURCE_LABELS: Record<DataSourceId, { label: string; glyph: string; tone: string }> = {
  apple_health: { label: "Apple Health", glyph: "", tone: "mint" },
  fitbit: { label: "Fitbit", glyph: "◇", tone: "lavender" },
  oura: { label: "Oura Ring", glyph: "○", tone: "peach" },
  garmin: { label: "Garmin", glyph: "△", tone: "sage" },
  whoop: { label: "Whoop", glyph: "◐", tone: "coral" },
  manual: { label: "Manual entry", glyph: "✎", tone: "sunken" },
};
