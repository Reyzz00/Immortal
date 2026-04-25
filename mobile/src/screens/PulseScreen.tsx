import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useInsights, useTrend } from "@/api/queries";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { HealthFeedback } from "@/components/HealthFeedback";
import { LineChart } from "@/components/LineChart";
import { useUIStore } from "@/state/store";
import { layout, palette, radii, spacing } from "@/theme";
import type { Insight } from "@/types";

const METRICS: { key: string; label: string; unit: string; color: string; tint: string }[] = [
  { key: "hrv", label: "HRV", unit: "ms", color: palette.accent, tint: palette.peachSoft },
  { key: "sleep_hours", label: "Sleep", unit: "h", color: palette.lavender, tint: palette.lavenderSoft },
  { key: "resting_hr", label: "Resting HR", unit: "bpm", color: palette.success, tint: palette.sageSoft },
  { key: "readiness", label: "Readiness", unit: "", color: palette.accentDeep, tint: palette.peachSoft },
  { key: "load_score", label: "Load", unit: "", color: palette.danger, tint: palette.coralSoft },
];

const DESCRIPTIONS: Record<string, string> = {
  hrv: "Heart rate variability reflects nervous system balance. Higher = more recovered.",
  sleep_hours: "Total time asleep. Consistency matters as much as quantity.",
  resting_hr: "Morning resting heart rate trends down with fitness and recovery.",
  readiness: "Composite score combining recovery, sleep, and stress.",
  load_score: "Training load vs. baseline. Extremes in either direction cost readiness.",
};

const KIND_TINT: Record<Insight["kind"], string> = {
  trend: palette.lavenderSoft,
  anomaly: palette.coralSoft,
  correlation: palette.peachSoft,
  win: palette.sageSoft,
};
const KIND_ACCENT: Record<Insight["kind"], string> = {
  trend: palette.lavender,
  anomaly: palette.danger,
  correlation: palette.accent,
  win: palette.success,
};
const KIND_LABEL: Record<Insight["kind"], string> = {
  trend: "TREND",
  anomaly: "ANOMALY",
  correlation: "CORRELATION",
  win: "WIN",
};
const KIND_GLYPH: Record<Insight["kind"], string> = {
  trend: "∿",
  anomaly: "!",
  correlation: "⇌",
  win: "★",
};

export function PulseScreen() {
  const selected = useUIStore((s) => s.selectedTrend);
  const setSelected = useUIStore((s) => s.setSelectedTrend);
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.l * 2 - spacing.l * 2;

  const active = METRICS.find((m) => m.key === selected) ?? METRICS[0];
  const { data: trend, isLoading } = useTrend(active.key, 30);
  const { data: insights } = useInsights();

  const latest = trend?.points[trend.points.length - 1];
  const delta =
    trend && trend.points.length >= 2
      ? trend.points[trend.points.length - 1].value - trend.points[0].value
      : 0;
  const pctDelta =
    trend && trend.points.length >= 2 && trend.points[0].value
      ? (delta / trend.points[0].value) * 100
      : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>YOUR PULSE · 30 DAYS</Text>
          <Text style={styles.title}>Trends &{"\n"}insights</Text>
          <Text style={styles.sub}>
            How your biometrics are moving — and what your data is telling us.
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
          <View style={styles.trendHeader}>
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
              points={trend?.points ?? []}
              baseline={trend?.baseline ?? null}
              width={chartWidth}
              height={220}
              stroke={active.color}
              fillId={`fill-${active.key}`}
            />
          </View>

          <View style={styles.footRow}>
            {trend?.baseline != null ? (
              <View style={styles.baselineTag}>
                <View style={[styles.baselineDash, { borderColor: palette.textSoft }]} />
                <Text style={styles.baselineText}>
                  Baseline {trend.baseline.toFixed(1)}
                  {active.unit ? ` ${active.unit}` : ""}
                </Text>
              </View>
            ) : null}
            {isLoading ? <Text style={styles.loadingText}>Loading…</Text> : null}
          </View>
        </Card>

        {trend && trend.points.length >= 7 ? (
          <View style={styles.statRow}>
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Min"
              value={Math.min(...trend.points.map((p) => p.value)).toFixed(1)}
            />
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Avg"
              value={(
                trend.points.reduce((s, p) => s + p.value, 0) / trend.points.length
              ).toFixed(1)}
            />
            <MiniStat
              tone={active.tint}
              accent={active.color}
              label="Max"
              value={Math.max(...trend.points.map((p) => p.value)).toFixed(1)}
            />
          </View>
        ) : null}

        <Card tone="sunken">
          <Text style={styles.tipKicker}>WHY IT MATTERS</Text>
          <Text style={styles.tipBody}>{DESCRIPTIONS[active.key]}</Text>
        </Card>

        <HealthFeedback />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>WHAT WE'RE SEEING</Text>
          <View style={styles.dividerLine} />
        </View>

        {!insights || insights.length === 0 ? (
          <Card tone="sunken">
            <Text style={{ color: palette.textMuted }}>Nothing unusual detected yet.</Text>
          </Card>
        ) : (
          <View style={styles.insightList}>
            {insights.map((item) => (
              <Card key={item.id} style={styles.insightItem}>
                <View style={styles.insightTop}>
                  <View
                    style={[
                      styles.insightGlyphWrap,
                      { backgroundColor: KIND_TINT[item.kind] },
                    ]}
                  >
                    <Text
                      style={[styles.insightGlyph, { color: KIND_ACCENT[item.kind] }]}
                    >
                      {KIND_GLYPH[item.kind]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightKind, { color: KIND_ACCENT[item.kind] }]}>
                      {KIND_LABEL[item.kind]}
                    </Text>
                    <Text style={styles.insightTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.confidenceWrap}>
                    <Text style={styles.confidence}>
                      {Math.round(item.confidence * 100)}%
                    </Text>
                    <Text style={styles.confidenceLabel}>conf.</Text>
                  </View>
                </View>
                <Text style={styles.insightBody}>{item.body}</Text>
              </Card>
            ))}
          </View>
        )}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { padding: spacing.l, gap: spacing.m, paddingBottom: layout.tabBarBottomSpace },
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
    lineHeight: 38,
  },
  sub: { color: palette.textMuted, fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  chipRow: { gap: spacing.s, paddingVertical: spacing.s, paddingRight: spacing.l },
  trendHeader: {
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
  tipKicker: {
    color: palette.accentDeep,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  tipBody: { color: palette.text, fontSize: 14, lineHeight: 21 },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    marginTop: spacing.l,
    marginBottom: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.border },
  dividerText: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },

  insightList: { gap: spacing.s },
  insightItem: { gap: spacing.s },
  insightTop: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  insightGlyphWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  insightGlyph: { fontSize: 18, fontWeight: "900" },
  insightKind: { fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  insightTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
    lineHeight: 19,
  },
  confidenceWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: radii.m,
    backgroundColor: palette.surfaceAlt,
  },
  confidence: { color: palette.text, fontSize: 13, fontWeight: "800" },
  confidenceLabel: { color: palette.textSoft, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  insightBody: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
});
