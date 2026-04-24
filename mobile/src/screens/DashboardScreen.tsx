import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCoachPlan,
  useCoachStatus,
  useRecommendationAction,
  useRecommendations,
  useUserState,
} from "@/api/queries";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CoachPlanSections } from "@/components/CoachPlanSections";
import { CoachPriorityCard } from "@/components/CoachPriorityCard";
import { HealthSyncCard } from "@/components/HealthSyncCard";
import { ScoreRing } from "@/components/ScoreRing";
import { palette, radii, spacing } from "@/theme";

const readinessLabel = (score: number) => {
  if (score >= 75) return "Primed";
  if (score >= 55) return "Balanced";
  if (score >= 35) return "Compromised";
  return "Depleted";
};

const readinessCopy = (score: number) => {
  if (score >= 75) return "You're charged up. Push a little today.";
  if (score >= 55) return "Steady day. Match effort to recovery.";
  if (score >= 35) return "Banked stress. Ease off and restore.";
  return "Deep fatigue signal. Prioritize rest.";
};

export function DashboardScreen() {
  const { data: state, isLoading, error } = useUserState();
  const { data: recs } = useRecommendations();
  const action = useRecommendationAction();
  const { data: coachStatus } = useCoachStatus();
  const coachEnabled = coachStatus?.configured ?? false;
  const coach = useCoachPlan(coachEnabled);

  if (isLoading) {
    return <Loading text="Crunching today's state…" />;
  }
  if (error || !state) {
    return <Loading text={`No data yet — seed the backend.\n${(error as Error)?.message ?? ""}`} />;
  }

  const top = recs?.[0];
  const plan = coach.data;

  const sleep = state.sleep_hours_latest;
  const hrv = state.hrv_latest;
  const rhr = state.resting_hr_latest;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.kicker}>TODAY · {state.date}</Text>
          <Text style={styles.pageTitle}>Today's plan</Text>
          <Text style={styles.overviewSub}>{readinessCopy(state.composite_readiness)}</Text>
        </View>

        {plan ? (
          <CoachPriorityCard rec={plan.priority_recommendation} />
        ) : coach.isFetching ? (
          <Card tone="ink" style={styles.recCard}>
            <Text style={styles.recKicker}>EVIDENCE-BASED COACH</Text>
            <Text style={styles.recMsg}>Generating today's plan…</Text>
            <Text style={styles.recReason}>
              Claude is cross-referencing your data against 30+ peer-reviewed studies.
            </Text>
          </Card>
        ) : top ? (
          <Card tone="ink" style={styles.recCard}>
            <View style={styles.recHeader}>
              <View style={styles.recIconWrap}>
                <Text style={styles.recIcon}>✦</Text>
              </View>
              <Text style={styles.recKicker}>TODAY'S RECOMMENDATION</Text>
            </View>
            <Text style={styles.recMsg}>{top.message}</Text>
            <Text style={styles.recReason}>{top.reasoning}</Text>
            <View style={styles.recMetaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {Math.round(top.confidence * 100)}% confidence
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{top.expected_impact} impact</Text>
              </View>
            </View>
            <View style={styles.recActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Accept"
                  onPress={() => action.mutate({ id: top.id, action: "accept" })}
                  variant="accent"
                />
              </View>
              <View style={{ width: spacing.s }} />
              <View style={{ flex: 1 }}>
                <Button
                  title="Ignore"
                  onPress={() => action.mutate({ id: top.id, action: "ignore" })}
                  variant="secondary"
                />
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={styles.ringCard}>
          <View style={styles.ringHeader}>
            <View>
              <Text style={styles.kicker}>READINESS · TODAY</Text>
              <Text style={styles.readinessLabel}>
                {readinessLabel(state.composite_readiness)}
              </Text>
            </View>
            <StatusPill
              label={readinessLabel(state.composite_readiness)}
              tone={state.composite_readiness >= 55 ? "ok" : "warn"}
            />
          </View>
          <View style={styles.ringWrap}>
            <ScoreRing value={state.composite_readiness} label="COMPOSITE" size={200} />
          </View>
          <View style={styles.miniRow}>
            <MiniStat
              tone="sage"
              label="Sleep"
              value={sleep != null ? `${sleep.toFixed(1)}h` : "—"}
            />
            <MiniStat
              tone="peach"
              label="HRV"
              value={hrv != null ? `${Math.round(hrv)}ms` : "—"}
            />
            <MiniStat
              tone="lavender"
              label="Rest HR"
              value={rhr != null ? `${Math.round(rhr)}` : "—"}
            />
          </View>
        </Card>

        <View style={styles.gridRow}>
          <StatTile
            tone="sage"
            title="Sleep"
            value={sleep != null ? `${sleep.toFixed(1)}` : "—"}
            unit="hours"
            score={state.sleep_score}
            icon="☾"
          />
          <StatTile
            tone="peach"
            title="HRV"
            value={hrv != null ? `${Math.round(hrv)}` : "—"}
            unit="ms"
            icon="♡"
          />
        </View>
        <View style={styles.gridRow}>
          <StatTile
            tone="lavender"
            title="Resting HR"
            value={rhr != null ? `${Math.round(rhr)}` : "—"}
            unit="bpm"
            icon="❋"
          />
          <StatTile
            tone="coral"
            title="Stress"
            value={`${Math.round(state.stress_score)}`}
            unit="score"
            score={100 - state.stress_score}
            icon="≋"
          />
        </View>

        {plan ? <CoachPlanSections plan={plan} /> : null}

        <HealthSyncCard />

        {state.anomalies.length ? (
          <Card tone="coral" style={styles.anomalyCard}>
            <Text style={styles.anomalyTitle}>⚠  Anomalies detected</Text>
            {state.anomalies.map((a) => (
              <Text key={a} style={styles.anomaly}>
                · {a.replace(/_/g, " ")}
              </Text>
            ))}
          </Card>
        ) : null}

        <Text style={styles.footer}>Longevity OS · build {state.date}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" }) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "ok" ? { backgroundColor: palette.sageSoft } : { backgroundColor: palette.coralSoft },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          { backgroundColor: tone === "ok" ? palette.success : palette.danger },
        ]}
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function MiniStat({
  tone,
  label,
  value,
}: {
  tone: "sage" | "peach" | "lavender";
  label: string;
  value: string;
}) {
  const bg =
    tone === "sage" ? palette.sageSoft : tone === "peach" ? palette.peachSoft : palette.lavenderSoft;
  return (
    <View style={[styles.mini, { backgroundColor: bg }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function StatTile({
  tone,
  title,
  value,
  unit,
  score,
  icon,
}: {
  tone: "sage" | "peach" | "lavender" | "coral";
  title: string;
  value: string;
  unit: string;
  score?: number;
  icon: string;
}) {
  const bg = {
    sage: palette.sageSoft,
    peach: palette.peachSoft,
    lavender: palette.lavenderSoft,
    coral: palette.coralSoft,
  }[tone];
  const iconBg = {
    sage: palette.sage,
    peach: palette.peach,
    lavender: palette.lavender,
    coral: palette.coral,
  }[tone];
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
          <Text style={styles.tileIconGlyph}>{icon}</Text>
        </View>
        {score != null ? (
          <Text style={styles.tileScore}>{Math.round(score)}</Text>
        ) : null}
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={{ color: palette.textMuted, textAlign: "center" }}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  container: { padding: spacing.l, gap: spacing.m, paddingBottom: spacing.xxl * 2 },

  pageHeader: {
    marginTop: spacing.s,
    marginBottom: spacing.s,
    gap: 4,
  },
  pageTitle: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  overviewSub: {
    color: palette.textMuted,
    fontSize: 14,
    marginTop: -spacing.xs,
    marginBottom: spacing.s,
  },

  ringCard: {
    gap: spacing.m,
  },
  ringHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kicker: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  readinessLabel: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: "700", color: palette.text },
  ringWrap: { alignItems: "center", paddingVertical: spacing.s },
  miniRow: { flexDirection: "row", gap: spacing.s },
  mini: {
    flex: 1,
    borderRadius: radii.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    alignItems: "center",
    gap: 2,
  },
  miniLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "600" },
  miniValue: { color: palette.text, fontSize: 16, fontWeight: "800" },

  recCard: {
    backgroundColor: palette.ink,
    padding: spacing.xl,
    gap: spacing.s,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
  },
  recIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  recIcon: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  recKicker: {
    color: palette.accent,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  recMsg: {
    color: palette.bgAlt,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  recReason: {
    color: "#B8B0A2",
    fontSize: 14,
    lineHeight: 20,
  },
  recMetaRow: {
    flexDirection: "row",
    gap: spacing.s,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  metaPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  metaPillText: { color: palette.bgAlt, fontSize: 11, fontWeight: "700" },
  recActions: {
    flexDirection: "row",
    marginTop: spacing.m,
  },

  gridRow: {
    flexDirection: "row",
    gap: spacing.m,
  },
  tile: {
    flex: 1,
    borderRadius: radii.l,
    padding: spacing.l,
    gap: spacing.s,
    minHeight: 130,
    justifyContent: "space-between",
  },
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconGlyph: { color: palette.ink, fontSize: 16, fontWeight: "900" },
  tileScore: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.55,
  },
  tileTitle: { color: palette.textMuted, fontSize: 13, fontWeight: "600" },
  tileValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  tileValue: { color: palette.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  tileUnit: { color: palette.textMuted, fontSize: 12, fontWeight: "600" },

  anomalyCard: { gap: 4 },
  anomalyTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
  anomaly: { color: palette.text, fontSize: 13, opacity: 0.85 },

  footer: {
    color: palette.textSoft,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.m,
  },
});
