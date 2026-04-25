# Apple HealthKit Integration

How Immortal pulls data from Apple Health, what guarantees the pipeline gives,
and how to debug it when it goes sideways.

## Architecture

```
 Apple Health  →  Kingstinct v14 (Nitro)  →  services/healthkit.ts
                                                       │
                                            anchored queries + dedup
                                                       │
                                                       ▼
                                              POST /health/sync
                                                       │
                                          dedup on (user, ts, type, source)
                                                       │
                                                       ▼
                                          baselines + state recompute
```

**Mobile.** `mobile/src/services/healthkit.ts` is the only file that talks to
HealthKit. Nothing else imports from `@kingstinct/react-native-healthkit`. The
service is also safe to import on web/Android/Expo Go — the native module is
loaded behind a `require()` guard.

**Backend.** `backend/app/api/health.py` is the only ingest endpoint. It is
idempotent — re-sending the same sample is a no-op.

## One-time setup

HealthKit cannot run inside Expo Go. You need a development client:

```bash
cd mobile
npx eas build --platform ios --profile development
# Install the resulting build on the device via the QR code EAS prints,
# then `npx expo start --dev-client` and open from the dev client app.
```

The Info.plist usage strings, the `HKHealthStore` entitlement, and the
background-delivery AppDelegate hook are all wired through the
`@kingstinct/react-native-healthkit` config plugin in `app.json`. Do not edit
the generated iOS project — re-run `expo prebuild` if you need to inspect it.

## Permission flow

1. First sync calls `requestAuthorization` for HRV, RHR, steps, sleep, heart
   rate, and workouts. iOS shows the permission sheet once per category.
2. If the user declines, `markDenied()` flips a flag in
   `Paths.document/immortal-healthkit-state.json`. The `HealthSyncCard` then
   surfaces a "denied" state with an "Open Settings" deep link
   (`app-settings:`).
3. Apple deliberately reports the same `requestAuthorization` result whether
   permission was granted or never asked — so we treat a `false` return as
   declined and let the user retry.

There is no programmatic way to inspect granted READ permissions per type on
iOS. We trust the user and just attempt the queries; missing permissions
return empty arrays, not errors.

## Sync semantics

### Anchored, incremental

The first sync after install backfills `BACKFILL_DAYS = 60`. Every subsequent
sync passes the persisted anchor and gets back only what's new (or edited, or
deleted) since the previous run. Anchors are stored per HK type at
`Paths.document/immortal-healthkit-state.json`:

```json
{
  "anchors": {
    "anchor:hrv": "<opaque>",
    "anchor:rhr": "<opaque>",
    "anchor:steps": "<opaque>",
    "anchor:sleep": "<opaque>",
    "anchor:workouts": "<opaque>"
  },
  "lastSyncAt": "2026-04-24T15:32:11.142Z",
  "lastDeniedAt": null
}
```

If the file is missing or unreadable we treat it as empty state — worst case
that means one extra full backfill. We never crash on storage errors.

### Auto-sync triggers

| Trigger                          | Where                         |
| -------------------------------- | ----------------------------- |
| Manual "Sync now" tap            | `HealthSyncCard`              |
| App mount, after auth            | `useHealthKit` initial effect |
| App foreground (`AppState`)      | `useHealthKit` AppState hook  |
| Background delivery (iOS-driven) | `enableBackgroundDelivery`    |

Auto-syncs are debounced by `AUTO_SYNC_COOLDOWN_MS = 5 min` so rapid
task-switching doesn't hammer HealthKit or the backend.

### Background delivery

`configureBackgroundTypes([HRV, RHR, STEPS, SLEEP, WORKOUT], "Immediate")` is
called once we have authorization. iOS coalesces wake-ups; "Immediate" is the
*requested* cadence, not the actual one. The system can and will throttle.
Background syncs follow the same dedup path as foreground syncs.

## Unit contract

| Metric | HK identifier                        | Unit we request | Backend column |
| ------ | ------------------------------------ | --------------- | -------------- |
| HRV    | `…HeartRateVariabilitySDNN`          | `ms`            | `hrv`          |
| RHR    | `…RestingHeartRate`                  | `count/min`     | `resting_hr`   |
| Steps  | `…StepCount`                         | `count`         | `steps`        |
| Sleep  | `HKCategoryTypeIdentifierSleepAnalysis` | (n/a)        | `sleep_hours`  |
| Workout| `HKWorkoutTypeIdentifier`            | (duration in s) | `workout_minutes` |

**Why we pin units explicitly.** Without an explicit unit, the library
returns the user's iOS preferred unit, which can differ between locales
(e.g., kg vs lb for body mass). Pinning ms/count/count-per-min means a
sample value is the same across users.

## Sleep aggregation rules

`HKCategoryValueSleepAnalysis` values:

```
0 inBed              ← we ignore (not asleep)
1 asleepUnspecified  ← fallback per source
2 awake              ← we ignore
3 asleepCore         ← preferred
4 asleepDeep         ← preferred
5 asleepREM          ← preferred
```

Apple Watch (and most paired apps) emit **both** an asleep-unspecified sample
and the staged samples covering the same period. Summing all of them
double-counts a typical 8-hour night to 16 hours.

Our rule, applied per source bundle ID, per local-date night:

1. **Staged wins.** If any of `core/deep/REM` exist for that source on that
   night, use only those.
2. **Otherwise** fall back to `asleepUnspecified`.
3. Across sources, **union** the chosen intervals to compute total sleep —
   this de-overlaps if e.g. an iPhone-tracked sample partially overlaps an
   Apple-Watch-tracked one.

Night attribution uses the local-date of the sample's `endDate` (so a 2 am
wake-up belongs to the day the user calls "today"). Final timestamp emitted
to the backend is `T08:00:00.000Z` of that day for stable bucketing.

## Backend dedup contract

```
UNIQUE INDEX (user_id, timestamp, metric_type, source)
```

`POST /health/sync` queries the existing rows in the time window of the
incoming batch and skips inserts whose key tuple is already present. The
response shape is:

```json
{ "status": "ok", "ingested": <n_new>, "skipped": <n_dup>, "synced_at": "…" }
```

Baselines and daily-state recomputation only run when `ingested > 0` — a
heartbeat sync that brings back nothing is genuinely free.

**For existing development databases** the unique index will not be
auto-added by `Base.metadata.create_all` (SQLAlchemy only creates tables that
don't exist). To pick it up: `rm longevity.db && python -m scripts.seed`. The
application-level dedup in the handler is the load-bearing safety net; the
DB-level uniqueness is defense-in-depth for fresh installs and future
deployments.

## Daylight-savings / timezone caveat

Day-summary metrics (steps, sleep, workouts) are bucketed by the device's
**local** date but stamped with a UTC noon (or 8 am for sleep) timestamp.
This works for users within ~12 h of UTC. For users in extreme offsets
(e.g., Pacific/Auckland, UTC+13 with DST) a sleep on the boundary day may
land in the adjacent UTC date, which can shift it one row in the trends
view. Acceptable for now; revisit when we have international users.

## Debugging recipe

| Symptom                                 | Likely cause                                                    | Fix                                                              |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| Card stuck on "Setup required"          | Running in Expo Go                                              | Build a dev client (see top of doc)                              |
| Card on "Permission needed"             | User declined, or specific category not granted in iOS Settings | Tap "Open Settings" in card, enable Immortal under Privacy → Health |
| Sync says "0 ingested" forever          | Anchor file thinks we're up-to-date but DB is empty             | Wipe `Paths.document/immortal-healthkit-state.json`, then sync   |
| Sleep showing 14+ hours                 | Sleep dedup regression — staged + unspecified being summed      | Check that `aggregateSleep` is grouping by `sourceRevision`      |
| HRV values look ~1000× too small/big   | Unit mismatch — library returned seconds                        | Verify `unit: "ms"` is being passed in `pullQuantity` for HRV    |
| Backend exploding to millions of rows   | Dedup not running                                               | Check `/health/sync` handler — should be the new version with `existing` set check |

## Known limitations / future work

- **Deleted samples** from `queryQuantitySamplesWithAnchor.deletedSamples` are
  not currently propagated to the backend. If a user retroactively deletes a
  sleep entry in Apple Health, our DB still has it. Add a delete-by-key path
  on `/health/sync` when this matters.
- **Source filtering.** Currently we accept samples from every connected
  source. A user with both an Apple Watch and a Whoop will mix data. When
  the V2 multi-source story lands, add source allowlist UI.
- **Health metadata** (e.g., HRV measurement context: morning vs ad hoc) is
  not extracted. The clinical guidelines (`docs/EVIDENCE.md` §1.1) say HRV
  measurement consistency matters; we should at least surface non-morning
  HRV in check-ins so users know which readings to trust.
- **Per-category authorization status.** Apple's API doesn't expose per-type
  read auth, so we can't tell the user "you've granted HRV but not Sleep."
  Workaround: probe each type with a small query and treat empty results as
  potentially-denied. Not worth the noise yet.
