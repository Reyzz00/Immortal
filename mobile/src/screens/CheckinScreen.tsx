import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCheckInPrompt, useSubmitCheckIn } from "@/api/queries";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { palette, radii, shadow, spacing } from "@/theme";
import type { CheckInQuestion } from "@/types";

type Answer = boolean | number | string | null;

export function CheckinScreen() {
  const navigation = useNavigation();
  const { data, isLoading, refetch } = useCheckInPrompt();
  const submit = useSubmitCheckIn();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      navigation.navigate("Today" as never);
    }, 1400);
    return () => clearTimeout(t);
  }, [submitted, navigation]);

  const questions = data?.questions ?? [];
  const complete = useMemo(
    () => questions.every((q) => answers[q.key] !== undefined && answers[q.key] !== null),
    [answers, questions]
  );
  const answeredCount = questions.filter(
    (q) => answers[q.key] !== undefined && answers[q.key] !== null
  ).length;

  function setAnswer(key: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    await submit.mutateAsync({ answers, questions_asked: questions });
    setSubmitted(true);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={{ color: palette.textMuted }}>Preparing your questions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <View style={styles.doneBadge}>
            <Text style={styles.doneEmoji}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Logged.</Text>
          <Text style={styles.doneBody}>
            Taking you to today's plan…
          </Text>
          <View style={{ height: spacing.xl }} />
          <Button
            title="Go to today"
            onPress={() => navigation.navigate("Today" as never)}
            variant="accent"
          />
          <View style={{ height: spacing.s }} />
          <Button
            title="Ask me again"
            onPress={() => {
              setAnswers({});
              setSubmitted(false);
              refetch();
            }}
            variant="ghost"
          />
        </View>
      </SafeAreaView>
    );
  }

  const progress = questions.length ? answeredCount / questions.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>DAILY CHECK-IN</Text>
          <Text style={styles.title}>
            How are you{"\n"}feeling today?
          </Text>
          <Text style={styles.sub}>
            Questions adapt to your data — anomalies get follow-ups.
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {answeredCount} of {questions.length} answered
        </Text>

        {questions.map((q, idx) => (
          <Card key={q.key} style={styles.q}>
            <View style={styles.qHeader}>
              <View style={styles.qIndex}>
                <Text style={styles.qIndexText}>{idx + 1}</Text>
              </View>
              {q.reason !== "baseline" ? (
                <View style={styles.reasonPill}>
                  <Text style={styles.reasonText}>{q.reason.replace(/_/g, " ")}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.prompt}>{q.prompt}</Text>
            <View style={styles.answerWrap}>
              <QuestionInput
                q={q}
                value={answers[q.key] ?? null}
                onChange={(v) => setAnswer(q.key, v)}
              />
            </View>
          </Card>
        ))}

        <View style={styles.submitWrap}>
          <Button
            title={submit.isPending ? "Submitting…" : "Submit check-in"}
            onPress={handleSubmit}
            disabled={!complete || submit.isPending}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: CheckInQuestion;
  value: Answer;
  onChange: (v: Answer) => void;
}) {
  if (q.kind === "scale") {
    const scale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return (
      <View>
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleEnd}>Low</Text>
          <Text style={styles.scaleEnd}>High</Text>
        </View>
        <View style={styles.scale}>
          {scale.map((n) => (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.scaleBtn, value === n && styles.scaleBtnActive]}
            >
              <Text style={[styles.scaleText, value === n && styles.scaleTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  if (q.kind === "boolean") {
    return (
      <View style={styles.boolRow}>
        {[
          { v: true, label: "Yes" },
          { v: false, label: "No" },
        ].map(({ v, label }) => (
          <Pressable
            key={label}
            onPress={() => onChange(v)}
            style={[styles.boolBtn, value === v && styles.boolBtnActive]}
          >
            <Text style={[styles.boolText, value === v && styles.boolTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.choiceWrap}>
      {(q.choices ?? []).map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          style={[styles.choice, value === c && styles.choiceActive]}
        >
          <Text style={[styles.choiceText, value === c && styles.choiceTextActive]}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  container: { padding: spacing.l, gap: spacing.m, paddingBottom: spacing.xxl * 2 },

  header: { marginTop: spacing.s, marginBottom: spacing.m },
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
    lineHeight: 40,
  },
  sub: { color: palette.textMuted, fontSize: 14, marginTop: spacing.s, lineHeight: 20 },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.accent,
    borderRadius: 3,
  },
  progressText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  q: { gap: spacing.m },
  qHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  qIndexText: { color: palette.text, fontSize: 12, fontWeight: "800" },
  reasonPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.peachSoft,
  },
  reasonText: { color: palette.accentDeep, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  prompt: { color: palette.text, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  answerWrap: { marginTop: spacing.xs },

  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.s,
  },
  scaleEnd: { color: palette.textSoft, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  scale: { flexDirection: "row", justifyContent: "space-between" },
  scaleBtn: {
    width: 28,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleBtnActive: {
    backgroundColor: palette.accent,
    ...shadow.card,
  },
  scaleText: { color: palette.textMuted, fontWeight: "800", fontSize: 13 },
  scaleTextActive: { color: palette.ink },

  boolRow: { flexDirection: "row", gap: spacing.s },
  boolBtn: {
    flex: 1,
    paddingVertical: spacing.l,
    borderRadius: radii.l,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
  },
  boolBtnActive: {
    backgroundColor: palette.ink,
  },
  boolText: { color: palette.textMuted, fontWeight: "800", fontSize: 15 },
  boolTextActive: { color: palette.bgAlt },

  choiceWrap: { gap: spacing.s },
  choice: {
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
    backgroundColor: palette.surfaceAlt,
  },
  choiceActive: {
    backgroundColor: palette.peachSoft,
    borderWidth: 1.5,
    borderColor: palette.accent,
  },
  choiceText: { color: palette.text, fontWeight: "600", fontSize: 14 },
  choiceTextActive: { color: palette.accentDeep, fontWeight: "700" },

  submitWrap: { marginTop: spacing.m },

  doneBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.floating,
  },
  doneEmoji: { color: palette.ink, fontSize: 44, fontWeight: "900" },
  doneTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.l,
    letterSpacing: -0.5,
  },
  doneBody: {
    color: palette.textMuted,
    textAlign: "center",
    marginTop: spacing.s,
    fontSize: 14,
    lineHeight: 20,
  },
});
