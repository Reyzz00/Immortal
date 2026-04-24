import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useExperiments, useStartExperiment } from "@/api/queries";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { palette, radii, shadow, spacing } from "@/theme";
import type { Experiment } from "@/types";

const SUGGESTIONS: {
  name: string;
  hypothesis: string;
  outcome_metric: string;
  duration_days: number;
  tone: "sage" | "lavender" | "peach";
}[] = [
  {
    name: "No caffeine after 2pm",
    hypothesis: "Cutting afternoon caffeine will raise average HRV by ≥5%.",
    outcome_metric: "hrv",
    duration_days: 7,
    tone: "peach",
  },
  {
    name: "11pm lights-out",
    hypothesis: "A fixed 11pm bedtime will stabilize sleep duration.",
    outcome_metric: "sleep_hours",
    duration_days: 14,
    tone: "lavender",
  },
  {
    name: "Morning zone-2 block",
    hypothesis: "3x/week morning zone-2 will reduce resting HR.",
    outcome_metric: "resting_hr",
    duration_days: 21,
    tone: "sage",
  },
];

export function ExperimentsScreen() {
  const { data } = useExperiments();
  const start = useStartExperiment();
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    hypothesis: "",
    outcome_metric: "hrv",
    duration_days: 7,
  });

  async function handleStart() {
    if (!draft.name.trim() || !draft.hypothesis.trim()) return;
    await start.mutateAsync(draft);
    setShowNew(false);
    setDraft({ name: "", hypothesis: "", outcome_metric: "hrv", duration_days: 7 });
  }

  const experiments = data ?? [];
  const activeCount = experiments.filter((e) => e.status === "active").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.availablePill}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>
              {activeCount} Active · Tracking
            </Text>
          </View>
          <Text style={styles.title}>Experiments</Text>
          <Text style={styles.sub}>
            Ship one hypothesis at a time. Before/after measured automatically.
          </Text>
        </View>

        <Button
          title="+ New experiment"
          onPress={() => setShowNew(true)}
          variant="accent"
          size="lg"
        />

        <Text style={styles.sectionHead}>ACTIVE & PAST</Text>
        {experiments.length === 0 ? (
          <Card>
            <Text style={{ color: palette.textMuted }}>No experiments yet.</Text>
          </Card>
        ) : (
          experiments.map((e) => <ExperimentCard key={e.id} exp={e} />)
        )}

        <Text style={styles.sectionHead}>SUGGESTED</Text>
        {SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.name} suggestion={s} onStart={() => start.mutate(s)} />
        ))}
      </ScrollView>

      <Modal visible={showNew} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New experiment</Text>
            <TextInput
              placeholder="Name (e.g. 10-minute cold shower)"
              placeholderTextColor={palette.textSoft}
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              style={styles.input}
            />
            <TextInput
              placeholder="Hypothesis — what will it change, and by how much?"
              placeholderTextColor={palette.textSoft}
              value={draft.hypothesis}
              onChangeText={(hypothesis) => setDraft({ ...draft, hypothesis })}
              multiline
              style={[styles.input, { minHeight: 90 }]}
            />
            <Text style={styles.inputLabel}>Outcome metric</Text>
            <View style={styles.metricChoices}>
              {["hrv", "sleep_hours", "resting_hr"].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setDraft({ ...draft, outcome_metric: m })}
                  style={[
                    styles.metricChip,
                    draft.outcome_metric === m && styles.metricChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.metricChipText,
                      draft.outcome_metric === m && styles.metricChipTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.s, marginTop: spacing.l }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="secondary" onPress={() => setShowNew(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Start" onPress={handleStart} variant="accent" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ExperimentCard({ exp }: { exp: Experiment }) {
  const statusStyle = {
    active: { bg: palette.peachSoft, fg: palette.accentDeep, dot: palette.accent },
    completed: { bg: palette.sageSoft, fg: palette.success, dot: palette.success },
    cancelled: { bg: palette.surfaceAlt, fg: palette.textMuted, dot: palette.textSoft },
  }[exp.status];

  const effect = exp.effect_size;
  const effectPos = effect != null && effect >= 0;

  return (
    <Card style={styles.expCard}>
      <View style={styles.expHeader}>
        <Text style={styles.expName}>{exp.name}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
          <Text style={[styles.statusText, { color: statusStyle.fg }]}>
            {exp.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.expHypothesis}>{exp.hypothesis}</Text>
      <View style={styles.expGrid}>
        <Stat label="Metric" value={exp.outcome_metric} />
        <Stat
          label="Baseline"
          value={exp.baseline_value != null ? exp.baseline_value.toFixed(1) : "—"}
        />
        <Stat
          label="Result"
          value={exp.result_value != null ? exp.result_value.toFixed(1) : "in progress"}
        />
        <Stat
          label="Effect"
          value={
            effect != null
              ? `${effectPos ? "+" : ""}${(effect * 100).toFixed(1)}%`
              : "—"
          }
          highlight={effect != null ? (effectPos ? "pos" : "neg") : undefined}
        />
      </View>
      <View style={styles.expDatesRow}>
        <Text style={styles.expDates}>
          {exp.start_date} → {exp.end_date}
        </Text>
      </View>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "pos" | "neg";
}) {
  const color =
    highlight === "pos" ? palette.success : highlight === "neg" ? palette.danger : palette.text;
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function SuggestionCard({
  suggestion,
  onStart,
}: {
  suggestion: (typeof SUGGESTIONS)[number];
  onStart: () => void;
}) {
  const toneMap = {
    sage: palette.sageSoft,
    lavender: palette.lavenderSoft,
    peach: palette.peachSoft,
  };
  return (
    <View style={[styles.suggestion, { backgroundColor: toneMap[suggestion.tone] }]}>
      <Text style={styles.sugTitle}>{suggestion.name}</Text>
      <Text style={styles.sugBody}>{suggestion.hypothesis}</Text>
      <View style={styles.sugFooter}>
        <View style={styles.sugMetaRow}>
          <View style={styles.sugMetaPill}>
            <Text style={styles.sugMetaText}>{suggestion.duration_days}d</Text>
          </View>
          <View style={styles.sugMetaPill}>
            <Text style={styles.sugMetaText}>{suggestion.outcome_metric}</Text>
          </View>
        </View>
        <Pressable onPress={onStart} style={styles.sugStart}>
          <Text style={styles.sugStartText}>Start →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { padding: spacing.l, gap: spacing.m, paddingBottom: spacing.xxl * 2 },
  header: { marginTop: spacing.s, marginBottom: spacing.s },
  availablePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: spacing.m,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.accent,
  },
  availableText: { color: palette.bgAlt, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: palette.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: palette.textMuted, fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  sectionHead: {
    color: palette.textSoft,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginTop: spacing.m,
    marginBottom: -spacing.xs,
  },
  expCard: { gap: spacing.s },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expName: { color: palette.text, fontSize: 18, fontWeight: "800", flex: 1 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  expHypothesis: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  expGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.xs,
  },
  statCell: { flexBasis: "50%", marginTop: spacing.xs, marginBottom: spacing.xs },
  statLabel: { color: palette.textSoft, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  statValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  expDatesRow: { marginTop: spacing.xs },
  expDates: { color: palette.textSoft, fontSize: 11, fontWeight: "600" },

  suggestion: {
    borderRadius: radii.l,
    padding: spacing.l,
    gap: 6,
  },
  sugTitle: { color: palette.text, fontSize: 17, fontWeight: "800" },
  sugBody: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  sugFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.s,
  },
  sugMetaRow: { flexDirection: "row", gap: 6 },
  sugMetaPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  sugMetaText: { color: palette.text, fontSize: 11, fontWeight: "700" },
  sugStart: {
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.l,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  sugStartText: { color: palette.bgAlt, fontSize: 13, fontWeight: "700" },

  modalBg: { flex: 1, backgroundColor: "rgba(15, 19, 26, 0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: palette.bgAlt,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingTop: spacing.m,
    gap: spacing.s,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.border,
    marginBottom: spacing.m,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    padding: spacing.m,
    color: palette.text,
    fontSize: 14,
    ...shadow.card,
  },
  inputLabel: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: spacing.s,
  },
  metricChoices: { flexDirection: "row", gap: spacing.s, flexWrap: "wrap" },
  metricChip: {
    paddingHorizontal: spacing.l,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  metricChipActive: {
    borderColor: palette.accent,
    backgroundColor: palette.peachSoft,
  },
  metricChipText: { color: palette.textMuted, fontWeight: "700", fontSize: 13 },
  metricChipTextActive: { color: palette.accentDeep },
});
