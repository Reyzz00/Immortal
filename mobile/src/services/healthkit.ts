/**
 * Apple HealthKit integration.
 *
 * Safe to import in Expo Go, web, and Android — the native module is only
 * `require()`d when the platform supports it AND the binary is linked.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "@/api/client";

export type HealthKitSupport =
  | { kind: "ready" }
  | { kind: "platform"; message: string }
  | { kind: "expo-go"; message: string }
  | { kind: "missing-native"; message: string };

export type MetricPayload = {
  timestamp: string;
  metric_type: "hrv" | "sleep_hours" | "resting_hr" | "steps" | "workout_minutes";
  value: number;
  source: string;
};

type HKModule = typeof import("@kingstinct/react-native-healthkit");

let cached: HKModule | null = null;

function tryLoad(): { module: HKModule | null; support: HealthKitSupport } {
  if (Platform.OS !== "ios") {
    return {
      module: null,
      support: { kind: "platform", message: "HealthKit is iOS-only." },
    };
  }
  // Expo Go doesn't include the Nitro native module binding.
  if (Constants.appOwnership === "expo") {
    return {
      module: null,
      support: {
        kind: "expo-go",
        message:
          "Expo Go can't link HealthKit. Build a development client with EAS to enable it.",
      },
    };
  }
  if (cached) return { module: cached, support: { kind: "ready" } };
  try {
    // Indirect require keeps Metro from hard-linking the dependency in Expo Go.
    const mod = require("@kingstinct/react-native-healthkit") as HKModule;
    cached = mod;
    return { module: mod, support: { kind: "ready" } };
  } catch (err) {
    return {
      module: null,
      support: {
        kind: "missing-native",
        message: `HealthKit native module not found (${(err as Error).message}). Rebuild the dev client.`,
      },
    };
  }
}

export function getSupport(): HealthKitSupport {
  return tryLoad().support;
}

export async function isAvailable(): Promise<boolean> {
  const { module } = tryLoad();
  if (!module) return false;
  try {
    return await module.isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

const READ_TYPES = [
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierHeartRate",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKWorkoutTypeIdentifier",
] as const;

export async function requestPermissions(): Promise<boolean> {
  const { module } = tryLoad();
  if (!module) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return module.requestAuthorization({ toRead: READ_TYPES as unknown as any[] });
}

type SampleLike = {
  startDate: Date | string;
  endDate: Date | string;
  quantity?: number;
  value?: number | string;
};

function toIso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

function dayKey(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
}

/** Pull recent HealthKit data and POST it to the Longevity OS backend. */
export async function syncRecent(days = 30): Promise<{ ingested: number }> {
  const { module } = tryLoad();
  if (!module) throw new Error(getSupport().kind);

  await requestPermissions();

  const to = new Date();
  const from = new Date(Date.now() - days * 86400_000);
  const filter = { date: { startDate: from, endDate: to } } as const;
  const qOpts = { filter, limit: 0, ascending: true } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = module as any;

  const [hrv, rhr, steps, sleep, workouts] = await Promise.all([
    mod.queryQuantitySamples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", qOpts).catch(() => []),
    mod.queryQuantitySamples("HKQuantityTypeIdentifierRestingHeartRate", qOpts).catch(() => []),
    mod.queryQuantitySamples("HKQuantityTypeIdentifierStepCount", qOpts).catch(() => []),
    mod.queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", qOpts).catch(() => []),
    mod.queryWorkoutSamples({ filter, limit: 0, ascending: true }).catch(() => []),
  ]);

  const metrics: MetricPayload[] = [];

  for (const s of hrv as SampleLike[]) {
    metrics.push({
      timestamp: toIso(s.endDate ?? s.startDate),
      metric_type: "hrv",
      value: Number(s.quantity ?? s.value ?? 0),
      source: "apple_health",
    });
  }

  for (const s of rhr as SampleLike[]) {
    metrics.push({
      timestamp: toIso(s.endDate ?? s.startDate),
      metric_type: "resting_hr",
      value: Number(s.quantity ?? s.value ?? 0),
      source: "apple_health",
    });
  }

  // Steps: aggregate per day, attribute to noon UTC of that day.
  const stepsByDay = new Map<string, number>();
  for (const s of steps as SampleLike[]) {
    const key = dayKey(s.endDate ?? s.startDate);
    stepsByDay.set(key, (stepsByDay.get(key) ?? 0) + Number(s.quantity ?? s.value ?? 0));
  }
  for (const [day, v] of stepsByDay) {
    metrics.push({ timestamp: `${day}T12:00:00.000Z`, metric_type: "steps", value: v, source: "apple_health" });
  }

  // Sleep category samples: Apple enum — 0=inBed, 1=asleep(unspec), 3=core, 4=deep, 5=REM, 2=awake.
  // Sum all non-inBed, non-awake durations and attribute to wake-up day.
  const ASLEEP_VALUES = new Set([1, 3, 4, 5]);
  const sleepByDay = new Map<string, number>();
  for (const s of sleep as (SampleLike & { value?: number })[]) {
    const v = Number(s.value);
    if (!ASLEEP_VALUES.has(v)) continue;
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    const hours = Math.max(0, (end - start) / 3_600_000);
    const key = dayKey(s.endDate);
    sleepByDay.set(key, (sleepByDay.get(key) ?? 0) + hours);
  }
  for (const [day, hours] of sleepByDay) {
    metrics.push({
      timestamp: `${day}T08:00:00.000Z`,
      metric_type: "sleep_hours",
      value: Number(hours.toFixed(2)),
      source: "apple_health",
    });
  }

  // Workouts: sum minutes per day.
  type WorkoutLike = { startDate: Date | string; endDate: Date | string; duration?: number };
  const workoutByDay = new Map<string, number>();
  for (const w of workouts as WorkoutLike[]) {
    const mins =
      typeof w.duration === "number"
        ? w.duration / 60
        : (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60_000;
    const key = dayKey(w.startDate);
    workoutByDay.set(key, (workoutByDay.get(key) ?? 0) + Math.max(0, mins));
  }
  for (const [day, v] of workoutByDay) {
    metrics.push({
      timestamp: `${day}T12:00:00.000Z`,
      metric_type: "workout_minutes",
      value: Number(v.toFixed(1)),
      source: "apple_health",
    });
  }

  const res = await api<{ status: string; ingested: number }>("/health/sync", {
    method: "POST",
    body: JSON.stringify({ user_id: 1, metrics }),
  });

  return { ingested: res.ingested };
}
