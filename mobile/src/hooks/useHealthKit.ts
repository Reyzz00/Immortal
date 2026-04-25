import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { qk } from "@/api/queries";
import {
  enableBackgroundDelivery,
  getSupport,
  isAvailable,
  lastSyncedAt,
  syncRecent,
  type HealthKitSupport,
  type SyncResult,
} from "@/services/healthkit";

const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

export function useHealthKit() {
  const [support, setSupport] = useState<HealthKitSupport>(() => getSupport());
  const [deviceReady, setDeviceReady] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(() => lastSyncedAt());

  useEffect(() => {
    if (support.kind !== "ready") {
      setDeviceReady(false);
      return;
    }
    isAvailable().then(setDeviceReady);
  }, [support.kind]);

  // Try to register background delivery once we're ready. Idempotent — safe
  // to call repeatedly.
  useEffect(() => {
    if (support.kind === "ready" && deviceReady) {
      void enableBackgroundDelivery();
    }
  }, [support.kind, deviceReady]);

  const qc = useQueryClient();

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: qk.state });
    qc.invalidateQueries({ queryKey: qk.recs });
    qc.invalidateQueries({ queryKey: qk.insights });
    qc.invalidateQueries({ queryKey: qk.experiments });
    for (const m of ["hrv", "sleep_hours", "resting_hr", "readiness", "load_score"]) {
      qc.invalidateQueries({ queryKey: qk.trend(m, 30) });
    }
  }, [qc]);

  const sync = useMutation<SyncResult, Error, void>({
    mutationFn: () => syncRecent(),
    onSuccess: (res) => {
      setLastSync(res.syncedAt);
      // If the user previously declined and now grants access mid-session, our
      // support flag may still say "denied". Refresh it on every successful
      // sync so the UI catches up.
      setSupport(getSupport());
      invalidateAll();
    },
    onError: () => {
      // Permission declines flip the storage flag; pull the new support state.
      setSupport(getSupport());
    },
  });

  // Auto-sync: on mount and on app foreground, with a cooldown to avoid
  // hammering HealthKit when the user task-switches rapidly.
  const syncRef = useRef(sync);
  syncRef.current = sync;

  const maybeAutoSync = useCallback(() => {
    if (support.kind !== "ready" || !deviceReady) return;
    if (syncRef.current.isPending) return;
    const last = lastSyncedAt();
    if (last && Date.now() - last.getTime() < AUTO_SYNC_COOLDOWN_MS) return;
    syncRef.current.mutate();
  }, [support.kind, deviceReady]);

  // Initial sync on mount once ready.
  useEffect(() => {
    if (support.kind === "ready" && deviceReady) {
      maybeAutoSync();
    }
  }, [support.kind, deviceReady, maybeAutoSync]);

  // Re-sync on foreground.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === "active") maybeAutoSync();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [maybeAutoSync]);

  return { support, deviceReady, sync, lastSync };
}
