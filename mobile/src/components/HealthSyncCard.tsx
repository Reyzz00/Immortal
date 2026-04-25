import { Linking, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useHealthKit } from "@/hooks/useHealthKit";
import { palette, spacing } from "@/theme";

function formatRelative(d: Date | null): string | null {
  if (!d) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

export function HealthSyncCard() {
  const { support, deviceReady, sync, lastSync } = useHealthKit();
  const ready = support.kind === "ready" && deviceReady === true;
  const denied = support.kind === "denied";

  const subtitle = ready
    ? lastSync
      ? `Last synced ${formatRelative(lastSync)}`
      : "Connected. Sync to backfill the last 60 days."
    : support.kind === "ready"
      ? "Initializing…"
      : support.message;

  let status: string;
  if (sync.isPending) {
    status = "Syncing HealthKit…";
  } else if (sync.error) {
    status = (sync.error as Error).message;
  } else if (sync.data) {
    const { ingested, skipped, byType } = sync.data;
    if (ingested === 0 && skipped === 0) {
      status = "All caught up — nothing new since last sync.";
    } else {
      const breakdown = (
        [
          ["HRV", byType.hrv],
          ["RHR", byType.resting_hr],
          ["Sleep", byType.sleep_hours],
          ["Steps", byType.steps],
          ["Workouts", byType.workout_minutes],
        ] as const
      )
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k} ${n}`)
        .join(" · ");
      const tail = skipped > 0 ? ` (${skipped} already on file)` : "";
      status = `Ingested ${ingested}${tail}${breakdown ? ` — ${breakdown}` : ""}.`;
    }
  } else {
    status = subtitle;
  }

  const dotColor = ready ? palette.success : denied ? palette.danger : palette.warn;
  const headline = ready
    ? "Connected"
    : denied
      ? "Permission needed"
      : support.kind === "ready"
        ? "Warming up"
        : "Setup required";

  return (
    <Card tone="mint" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}></Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>APPLE HEALTH</Text>
          <Text style={styles.title}>{headline}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>

      <Text style={styles.body}>{status}</Text>

      {ready ? (
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button
              title={sync.isPending ? "Syncing…" : "Sync now"}
              onPress={() => sync.mutate()}
              variant="primary"
              disabled={sync.isPending}
            />
          </View>
        </View>
      ) : denied ? (
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button
              title="Open Settings"
              onPress={() => Linking.openURL("app-settings:")}
              variant="primary"
            />
          </View>
          <View style={{ width: spacing.s }} />
          <View style={{ flex: 1 }}>
            <Button
              title="Try again"
              onPress={() => sync.mutate()}
              variant="secondary"
              disabled={sync.isPending}
            />
          </View>
        </View>
      ) : support.kind === "expo-go" ? (
        <View style={styles.stepsWrap}>
          <Step n={1} text="Run `npx eas build --platform ios --profile development`." />
          <Step n={2} text="Install the dev client on your phone via the QR EAS gives you." />
          <Step n={3} text="Reopen this app from the dev client — this card will turn green." />
        </View>
      ) : null}
    </Card>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.m },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
  },
  icon: { fontSize: 20 },
  kicker: {
    color: palette.accentDeep,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  title: { color: palette.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  actionsRow: { flexDirection: "row" },
  stepsWrap: { gap: spacing.s, marginTop: spacing.xs },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.s },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: "800", color: palette.text },
  stepText: { flex: 1, color: palette.textMuted, fontSize: 13, lineHeight: 18 },
});
