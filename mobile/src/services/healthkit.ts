/**
 * Apple HealthKit integration for Immortal.
 *
 * Safe to import in Expo Go, web, and Android — the native module is only
 * `require()`d when the platform supports it AND the binary is linked.
 *
 * Pulls HRV, resting HR, steps, sleep, and workouts via Kingstinct v14
 * anchored queries; persists per-type anchors so subsequent syncs are
 * incremental. POSTs normalized samples to the Immortal backend, which
 * dedups on (user, timestamp, type, source).
 *
 * Unit contract: every quantity sample is requested with an explicit unit so
 * the backend never has to guess what the wearable wrote.
 *  - HRV:   ms
 *  - RHR:   count/min  (= bpm)
 *  - Steps: count
 *
 * Sleep contract: HKCategoryValueSleepAnalysis values
 *   0=inBed 1=asleepUnspecified 2=awake 3=core 4=deep 5=REM
 * Apple Watch emits both staged samples (3/4/5) and an unspecified asleep
 * sample (1) covering the same period — summing both double-counts. Per
 * source, prefer staged where present and fall back to unspecified; then
 * union all asleep intervals across sources to compute total sleep per night.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "@/api/client";

import {
  clearDenied,
  getAnchor,
  getLastSync,
  markDenied,
  setAnchor,
  setLastSync,
  wasRecentlyDenied,
} from "./healthkit-storage";

export type HealthKitSupport =
  | { kind: "ready" }
  | { kind: "platform"; message: string }
  | { kind: "expo-go"; message: string }
  | { kind: "missing-native"; message: string }
  | { kind: "denied"; message: string };

export type MetricPayload = {
  timestamp: string;
  metric_type: "hrv" | "sleep_hours" | "resting_hr" | "steps" | "workout_minutes";
  value: number;
  source: string;
};

export type SyncResult = {
  ingested: number;
  skipped: number;
  byType: Record<MetricPayload["metric_type"], number>;
  syncedAt: Date;
};

type HKModule = typeof import("@kingstinct/react-native-healthkit");

const HRV = "HKQuantityTypeIdentifierHeartRateVariabilitySDNN" as const;
const RHR = "HKQuantityTypeIdentifierRestingHeartRate" as const;
const STEPS = "HKQuantityTypeIdentifierStepCount" as const;
const HR = "HKQuantityTypeIdentifierHeartRate" as const;
const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis" as const;
const WORKOUT = "HKWorkoutTypeIdentifier" as const;

const READ_TYPES = [HRV, RHR, STEPS, HR, SLEEP, WORKOUT] as const;

// First-time backfill window. Subsequent syncs are anchor-driven so this only
// matters once.
const BACKFILL_DAYS = 60;

let cached: HKModule | null = null;

function tryLoad(): { module: HKModule | null; support: HealthKitSupport } {
  if (Platform.OS !== "ios") {
    return {
      module: null,
      support: { kind: "platform", message: "HealthKit is iOS-only." },
    };
  }
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
  const base = tryLoad().support;
  if (base.kind !== "ready") return base;
  if (wasRecentlyDenied()) {
    return {
      kind: "denied",
      message:
        "HealthKit access was declined. Open the iOS Settings app → Privacy & Security → Health → Immortal and enable the categories you want shared.",
    };
  }
  return base;
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

export async function requestPermissions(): Promise<boolean> {
  const { module } = tryLoad();
  if (!module) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = await module.requestAuthorization({ toRead: READ_TYPES as unknown as any[] });
    if (ok) clearDenied();
    else markDenied();
    return ok;
  } catch {
    markDenied();
    return false;
  }
}

/**
 * Configure background delivery so iOS wakes the app when new HealthKit
 * samples arrive. The Kingstinct config plugin (`background: true`, set in
 * app.json) wires the AppDelegate observer; this just registers the types we
 * care about and the cadence.
 */
export async function enableBackgroundDelivery(): Promise<void> {
  const { module } = tryLoad();
  if (!module) return;
  try {
    // `Immediate` is fine for low-rate vitals like HRV/RHR/sleep. iOS coalesces
    // anyway; this isn't a polling rate.
    const updateFreq = "Immediate" as unknown as Parameters<HKModule["enableBackgroundDelivery"]>[1];
    await module.configureBackgroundTypes(
      [HRV, RHR, STEPS, SLEEP, WORKOUT],
      updateFreq,
    );
  } catch {
    // Background delivery is a nice-to-have; foreground sync still works.
  }
}

// ---- helpers --------------------------------------------------------------

function toIso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

/** Local-day key (yyyy-mm-dd) so a 2 am wake-up is bucketed to the day the
 * user calls "today", not yesterday-UTC. */
function localDayKey(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Day-summary metrics need a stable timestamp. Noon UTC of the bucket day
 * keeps them inside the same UTC day for users within ~12 h of UTC; backend
 * uses .date() on the timestamp. */
function dayNoonUtc(dayKey: string): string {
  return `${dayKey}T12:00:00.000Z`;
}

function mergeIntervals(ints: Array<[number, number]>): Array<[number, number]> {
  if (ints.length === 0) return [];
  const sorted = ints.slice().sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const top = out[out.length - 1];
    if (sorted[i][0] <= top[1]) top[1] = Math.max(top[1], sorted[i][1]);
    else out.push([sorted[i][0], sorted[i][1]]);
  }
  return out;
}

type AnchorResp<T> = {
  samples: readonly T[];
  newAnchor?: string;
};

async function pullQuantity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mod: any,
  identifier: string,
  anchorKey: string,
  unit?: string,
): Promise<readonly QuantitySample[]> {
  const previousAnchor = getAnchor(anchorKey);
  const opts: Record<string, unknown> = { limit: 0 };
  if (unit) opts.unit = unit;
  if (previousAnchor) {
    opts.anchor = previousAnchor;
  } else {
    opts.filter = {
      date: { startDate: new Date(Date.now() - BACKFILL_DAYS * 86_400_000) },
    };
  }
  try {
    const res = (await mod.queryQuantitySamplesWithAnchor(identifier, opts)) as AnchorResp<QuantitySample>;
    if (res.newAnchor) setAnchor(anchorKey, res.newAnchor);
    return res.samples ?? [];
  } catch {
    return [];
  }
}

async function pullCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mod: any,
  identifier: string,
  anchorKey: string,
): Promise<readonly CategorySample[]> {
  const previousAnchor = getAnchor(anchorKey);
  const opts: Record<string, unknown> = { limit: 0 };
  if (previousAnchor) {
    opts.anchor = previousAnchor;
  } else {
    opts.filter = {
      date: { startDate: new Date(Date.now() - BACKFILL_DAYS * 86_400_000) },
    };
  }
  try {
    const res = (await mod.queryCategorySamplesWithAnchor(identifier, opts)) as AnchorResp<CategorySample>;
    if (res.newAnchor) setAnchor(anchorKey, res.newAnchor);
    return res.samples ?? [];
  } catch {
    return [];
  }
}

async function pullWorkouts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mod: any,
  anchorKey: string,
): Promise<readonly WorkoutSample[]> {
  const previousAnchor = getAnchor(anchorKey);
  const opts: Record<string, unknown> = { limit: 0 };
  if (previousAnchor) {
    opts.anchor = previousAnchor;
  } else {
    opts.filter = {
      date: { startDate: new Date(Date.now() - BACKFILL_DAYS * 86_400_000) },
    };
  }
  try {
    const res = (await mod.queryWorkoutSamplesWithAnchor(opts)) as AnchorResp<WorkoutSample>;
    if (res.newAnchor) setAnchor(anchorKey, res.newAnchor);
    return res.samples ?? [];
  } catch {
    return [];
  }
}

type QuantitySample = {
  startDate: Date | string;
  endDate: Date | string;
  quantity: number;
};

type CategorySample = {
  startDate: Date | string;
  endDate: Date | string;
  value: number;
  // Source bundle id may live in a few places depending on Kingstinct version.
  sourceRevision?: { source?: { bundleIdentifier?: string } };
};

type WorkoutSample = {
  startDate: Date | string;
  endDate: Date | string;
  duration?: number; // seconds
};

// Sleep enum values that count as "asleep".
const ASLEEP_STAGED = new Set([3, 4, 5]); // core, deep, REM
const ASLEEP_UNSPEC = 1;

function aggregateSleep(samples: readonly CategorySample[]): Map<string, number> {
  // Group by source so we can decide staged-vs-unspecified per source.
  const bySource = new Map<string, CategorySample[]>();
  for (const s of samples) {
    const src = s.sourceRevision?.source?.bundleIdentifier ?? "unknown";
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(s);
  }

  const intervalsByDay = new Map<string, Array<[number, number]>>();

  for (const [, srcSamples] of bySource) {
    const stagedByDay = new Map<string, CategorySample[]>();
    const unspecByDay = new Map<string, CategorySample[]>();

    for (const s of srcSamples) {
      const v = Number(s.value);
      if (!ASLEEP_STAGED.has(v) && v !== ASLEEP_UNSPEC) continue;
      const dayKey = localDayKey(s.endDate);
      const target = ASLEEP_STAGED.has(v) ? stagedByDay : unspecByDay;
      if (!target.has(dayKey)) target.set(dayKey, []);
      target.get(dayKey)!.push(s);
    }

    const days = new Set<string>([...stagedByDay.keys(), ...unspecByDay.keys()]);
    for (const dayKey of days) {
      // Staged wins per source per night; only fall back to unspec if no
      // staged samples exist for that night from this source.
      const chosen = stagedByDay.get(dayKey) ?? unspecByDay.get(dayKey) ?? [];
      const intervals: Array<[number, number]> = chosen.map((s) => [
        new Date(s.startDate).getTime(),
        new Date(s.endDate).getTime(),
      ]);
      const arr = intervalsByDay.get(dayKey);
      if (arr) arr.push(...intervals);
      else intervalsByDay.set(dayKey, intervals);
    }
  }

  const totals = new Map<string, number>();
  for (const [dayKey, ints] of intervalsByDay) {
    const merged = mergeIntervals(ints);
    let totalMs = 0;
    for (const [a, b] of merged) totalMs += b - a;
    totals.set(dayKey, totalMs / 3_600_000);
  }
  return totals;
}

// ---- main sync ------------------------------------------------------------

export async function syncRecent(): Promise<SyncResult> {
  const { module } = tryLoad();
  const support = getSupport();
  if (!module || support.kind !== "ready") {
    throw new Error(
      support.kind === "ready" ? "HealthKit unavailable." : support.message,
    );
  }

  const granted = await requestPermissions();
  if (!granted) {
    throw new Error(
      "HealthKit permissions were declined. Open Settings → Health → Immortal to grant access.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = module as any;

  const [hrv, rhr, steps, sleep, workouts] = await Promise.all([
    pullQuantity(mod, HRV, "anchor:hrv", "ms"),
    pullQuantity(mod, RHR, "anchor:rhr", "count/min"),
    pullQuantity(mod, STEPS, "anchor:steps", "count"),
    pullCategory(mod, SLEEP, "anchor:sleep"),
    pullWorkouts(mod, "anchor:workouts"),
  ]);

  const metrics: MetricPayload[] = [];
  const counts = {
    hrv: 0,
    sleep_hours: 0,
    resting_hr: 0,
    steps: 0,
    workout_minutes: 0,
  };

  for (const s of hrv) {
    const v = Number(s.quantity);
    if (!Number.isFinite(v) || v <= 0) continue;
    metrics.push({
      timestamp: toIso(s.endDate ?? s.startDate),
      metric_type: "hrv",
      value: v,
      source: "apple_health",
    });
    counts.hrv += 1;
  }

  for (const s of rhr) {
    const v = Number(s.quantity);
    if (!Number.isFinite(v) || v <= 0) continue;
    metrics.push({
      timestamp: toIso(s.endDate ?? s.startDate),
      metric_type: "resting_hr",
      value: v,
      source: "apple_health",
    });
    counts.resting_hr += 1;
  }

  // Steps: aggregate per local day; emit one summary per day.
  const stepsByDay = new Map<string, number>();
  for (const s of steps) {
    const v = Number(s.quantity);
    if (!Number.isFinite(v) || v < 0) continue;
    const k = localDayKey(s.endDate ?? s.startDate);
    stepsByDay.set(k, (stepsByDay.get(k) ?? 0) + v);
  }
  for (const [day, v] of stepsByDay) {
    metrics.push({
      timestamp: dayNoonUtc(day),
      metric_type: "steps",
      value: Math.round(v),
      source: "apple_health",
    });
    counts.steps += 1;
  }

  // Sleep: union of asleep intervals per night, staged preferred per source.
  const sleepByDay = aggregateSleep(sleep);
  for (const [day, hours] of sleepByDay) {
    if (hours <= 0) continue;
    metrics.push({
      timestamp: `${day}T08:00:00.000Z`,
      metric_type: "sleep_hours",
      value: Number(hours.toFixed(2)),
      source: "apple_health",
    });
    counts.sleep_hours += 1;
  }

  // Workouts: sum minutes per local day.
  const workoutByDay = new Map<string, number>();
  for (const w of workouts) {
    const mins =
      typeof w.duration === "number"
        ? w.duration / 60
        : (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) /
          60_000;
    if (!Number.isFinite(mins) || mins <= 0) continue;
    const k = localDayKey(w.startDate);
    workoutByDay.set(k, (workoutByDay.get(k) ?? 0) + mins);
  }
  for (const [day, v] of workoutByDay) {
    metrics.push({
      timestamp: dayNoonUtc(day),
      metric_type: "workout_minutes",
      value: Number(v.toFixed(1)),
      source: "apple_health",
    });
    counts.workout_minutes += 1;
  }

  let ingested = 0;
  let skipped = 0;
  if (metrics.length > 0) {
    const res = await api<{
      status: string;
      ingested: number;
      skipped: number;
    }>("/health/sync", {
      method: "POST",
      body: JSON.stringify({ user_id: 1, metrics }),
    });
    ingested = res.ingested ?? 0;
    skipped = res.skipped ?? 0;
  }

  const now = new Date();
  setLastSync(now);

  return {
    ingested,
    skipped,
    byType: counts,
    syncedAt: now,
  };
}

export function lastSyncedAt(): Date | null {
  return getLastSync();
}
