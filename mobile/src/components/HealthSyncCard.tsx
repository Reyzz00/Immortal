import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useHealthKit } from "@/hooks/useHealthKit";
import { palette, radii, spacing } from "@/theme";

export function HealthSyncCard() {
  const { support, deviceReady, sync } = useHealthKit();
  const ready = support.kind === "ready" && deviceReady === true;
  const status = sync.isPending
    ? "Syncing last 30 days…"
    : sync.data
      ? `Synced ${sync.data.ingested} metrics.`
      : sync.error
        ? (sync.error as Error).message
        : ready
          ? "Connected. Pull HRV, sleep, steps, resting HR and workouts on demand."
          : support.kind === "ready"
            ? "HealthKit is loading…"
            : support.message;

  return (
    <Card tone="mint" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}></Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>APPLE HEALTH</Text>
          <Text style={styles.title}>
            {ready ? "Connected" : support.kind === "ready" ? "Warming up" : "Setup required"}
          </Text>
        </View>
        <View style={[styles.dot, { backgroundColor: ready ? palette.success : palette.warn }]} />
      </View>
      <Text style={styles.body}>{status}</Text>
      {ready ? (
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button
              title={sync.isPending ? "Syncing…" : "Sync now"}
              onPress={() => sync.mutate(30)}
              variant="primary"
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
