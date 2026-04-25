/**
 * Persistent state for HealthKit incremental sync.
 *
 * Stores per-type anchors and the last-sync timestamp on disk so that on the
 * next launch we ask HealthKit "what's new since this anchor?" rather than
 * re-pulling 60 days. File-backed with an in-memory cache; sync read/write,
 * resilient to a missing-/-corrupt file (treated as empty state).
 */
import { File, Paths } from "expo-file-system";

const FILE_NAME = "immortal-healthkit-state.json";

export type HealthKitState = {
  anchors: Record<string, string>;
  lastSyncAt: string | null;
  lastDeniedAt: string | null;
};

const empty = (): HealthKitState => ({
  anchors: {},
  lastSyncAt: null,
  lastDeniedAt: null,
});

let cache: HealthKitState | null = null;

function fileHandle() {
  try {
    return new File(Paths.document, FILE_NAME);
  } catch {
    return null;
  }
}

function load(): HealthKitState {
  if (cache) return cache;
  const f = fileHandle();
  if (!f || !f.exists) {
    cache = empty();
    return cache;
  }
  try {
    const text = f.textSync();
    const parsed = JSON.parse(text) as Partial<HealthKitState>;
    cache = {
      anchors: parsed.anchors ?? {},
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastDeniedAt: parsed.lastDeniedAt ?? null,
    };
    return cache;
  } catch {
    cache = empty();
    return cache;
  }
}

function save(state: HealthKitState): void {
  cache = state;
  const f = fileHandle();
  if (!f) return;
  try {
    if (!f.exists) f.create({ overwrite: true, intermediates: true });
    f.write(JSON.stringify(state));
  } catch {
    // Best-effort: if disk write fails we still have the in-memory cache for
    // this session.
  }
}

export function getAnchor(key: string): string | undefined {
  return load().anchors[key];
}

export function setAnchor(key: string, anchor: string): void {
  const s = load();
  save({ ...s, anchors: { ...s.anchors, [key]: anchor } });
}

export function getLastSync(): Date | null {
  const v = load().lastSyncAt;
  return v ? new Date(v) : null;
}

export function setLastSync(when: Date = new Date()): void {
  save({ ...load(), lastSyncAt: when.toISOString() });
}

export function markDenied(): void {
  save({ ...load(), lastDeniedAt: new Date().toISOString() });
}

export function clearDenied(): void {
  save({ ...load(), lastDeniedAt: null });
}

export function wasRecentlyDenied(): boolean {
  return load().lastDeniedAt != null;
}

export function resetState(): void {
  cache = empty();
  const f = fileHandle();
  if (f && f.exists) {
    try {
      f.delete();
    } catch {
      /* noop */
    }
  }
}
