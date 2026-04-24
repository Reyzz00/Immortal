import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { qk } from "@/api/queries";
import { getSupport, isAvailable, syncRecent, type HealthKitSupport } from "@/services/healthkit";

export function useHealthKit() {
  const [support] = useState<HealthKitSupport>(() => getSupport());
  const [deviceReady, setDeviceReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (support.kind !== "ready") {
      setDeviceReady(false);
      return;
    }
    isAvailable().then(setDeviceReady);
  }, [support.kind]);

  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: (days?: number) => syncRecent(days ?? 30),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.state });
      qc.invalidateQueries({ queryKey: qk.recs });
      qc.invalidateQueries({ queryKey: qk.insights });
      qc.invalidateQueries({ queryKey: qk.experiments });
      for (const m of ["hrv", "sleep_hours", "resting_hr", "readiness", "load_score"]) {
        qc.invalidateQueries({ queryKey: qk.trend(m, 30) });
      }
    },
  });

  return { support, deviceReady, sync };
}
