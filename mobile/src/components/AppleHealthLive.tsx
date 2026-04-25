/**
 * Removed at user request — was a fake "live" Apple Health visualization with
 * jittered numbers driven by a deterministic generator, not real HealthKit
 * data. Real HealthKit ingest happens via services/healthkit.ts and the values
 * surface through the existing readiness card and stat tiles.
 *
 * Kept as a null-render stub so any restored import in DashboardScreen
 * compiles without rendering anything.
 */
export function AppleHealthLive(): null {
  return null;
}
