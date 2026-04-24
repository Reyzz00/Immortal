import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTrend } from "@/api/queries";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { LineChart } from "@/components/LineChart";
import { useUIStore } from "@/state/store";
import { palette, radii, spacing } from "@/theme";

const METRICS: { key: string; label: string; unit: string; color: string; tint: string }[] = [
  { key: "hrv", label: "HRV", unit: "ms", color: palette.accent, tint: palette.peachSoft },
  { key: "sleep_hours", label: "Sleep", unit: "h", color: palette.lavender, tint: palette.lavenderSoft },
  { key: "resting_hr", label: "Resting HR", unit: "bpm", color: palette.success, tint: palette.sageSoft },
  { key: "readiness", label: "Readiness", unit: "", color: palette.accentDeep, tint: palette.peachSoft },
  { key: "load_score", label: "Load", unit: "", color: palette.danger, tint: palette.coralSoft },
];

export function TrendsScreen() {
  const selected = useUIStore((s) => s.selectedTrend);
  const setSelected = useUIStore((s) => s.setSelectedTrend);
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.l * 2 - spacing.l * 2;

  const active = METRICS.find((m) => m.key === selected) ?? METRICS[0];
  const { data, isLoading } = useTrend(active.key, 30);

  const latest = data?.points[data.points.length - 1];
  const delta =
    data && data.points.length >= 2
      ? data.points[data.points.length - 1].value - data.points[0].value
      : 0;
  const pctDelta =
    data && data.points.length >= 2 && data.points[0].value
      ? (delta / data.points[0].value) * 100
      : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>30 DAYS · BASELINE-RELATIVE</Text>
          <Text style={styles.title}>Trends</Text>
          <Text style={styles.sub}>
            Dashed line shows your rolling baseline.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {METRICS.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              active={m.key === active.key}
              onPress={() => setSelected(m.key)}
            />
          ))}
        </ScrollView>

        <Card>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricLabel}>{active.label.toUpperCase()}</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricLatest}>
                  {latest != null ? latest.value.toFixed(1) : "—"}
                </Text>
                {active.unit ? <Text style={styles.metricUnit}>{active.unit}</Text> : null}
              </View>
            </View>
            <View
              style={[
                styles.deltaPill,
                { backgroundColor: delta >= 0 ? palette.sageSoft : palette.coralSoft },
              ]}
            >
              <Text
                style={[
                  styles.deltaText,
                  { color: delta >= 0 ? palette.success : palette.danger },
                ]}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(pctDelta).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <LineChart
              points={data?.points ?? []}
              baseline={data?.baseline ?? null}
              width={chartWidth}
              height={220}
              stroke={active.color}
              fillId={`fill-${active.key}`}
            />
          </View>

          <View style={styles.footRow}>
            {data?.baseline != null ? (
              <View style={styles.baselineTag}>
                <View style={[styles.baselineDash, { borderColor: palette.textSoft }]} />
                <Text style={styles.baselineText}>
                  Baseline {data.baseline.toFixed(1)}
                  {active.unit ? ` ${active.unit}` : ""}
                </Text>
              </View>
            ) : null}
            {isLoading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : null}
          </View>
        </Card>

        <Card tone="sunken">
          <Text style={styles.tipKicker}>WHY IT MATTERS</Text>
          <Text style={styles.tipBody}>{DESCRIPTIONS[active.key]}</Text>
        </Card>

        {data && data.points.length >= 7 ? (
          <View style={styles.statRow}>
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Min"
              value={Math.min(...data.points.map((p) => p.value)).toFixed(1)}
            />
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Avg"
              value={(
                data.points.reduce((s, p) => s + p.value, 0) / data.points.length
              ).toFixed(1)}
            />
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Max"
              value={Math.max(...data.points.map((p) => p.value)).toFixed(1)}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({
  tone,
  accent,
  label,
  value,
}: {
  tone: string;
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.miniStat, { backgroundColor: tone }]}>
      <Text style={[styles.miniStatLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

const DESCRIPTIONS: Record<string, string> = {
  hrv: "Heart rate variability reflects nervous system balance. Higher = more recovered.",
  sleep_hours: "Total time asleep. Consistency matters as much as quantity.",
  resting_hr: "Morning resting heart rate trends down with fitness and recovery.",
  readiness: "Composite score combining recovery, sleep, and stress — your daily green/yellow/red.",
  load_score: "Relative training load vs. your baseline. Extremes in either direction cost readiness.",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { padding: spacing.l, gap: spacing.m, paddingBottom: spacing.xxl * 2 },
  header: { marginTop: spacing.s },
  kicker: {
    color: palette.accentDeep,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "800",
    marginTop: spacing.s,
    letterSpacing: -0.5,
  },
  sub: { color: palette.textMuted, fontSize: 14, marginTop: spacing.xs },
  chipRow: { gap: spacing.s, paddingVertical: spacing.s, paddingRight: spacing.l },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.m,
  },
  metricLabel: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  metricValueRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  metricLatest: { color: palette.text, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  metricUnit: { color: palette.textMuted, fontSize: 16, fontWeight: "700" },
  deltaPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  deltaText: { fontSize: 12, fontWeight: "800" },
  chartWrap: { marginHorizontal: -spacing.s },
  footRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.s,
  },
  baselineTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  baselineDash: {
    width: 18,
    borderTopWidth: 2,
    borderStyle: "dashed",
  },
  baselineText: { color: palette.textMuted, fontSize: 12, fontWeight: "600" },
  loadingText: { color: palette.textMuted, fontSize: 12 },
  tipKicker: {
    color: palette.accentDeep,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  tipBody: { color: palette.text, fontSize: 14, lineHeight: 21 },
  statRow: { flexDirection: "row", gap: spacing.s },
  miniStat: {
    flex: 1,
    padding: spacing.m,
    borderRadius: radii.m,
    alignItems: "center",
    gap: 4,
  },
  miniStatLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  miniStatValue: { color: palette.text, fontSize: 18, fontWeight: "800" },
});
