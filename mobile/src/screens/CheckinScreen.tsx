import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCheckInPrompt, useSubmitCheckIn } from "@/api/queries";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { layout, palette, radii, shadow, spacing } from "@/theme";
import type { CheckInQuestion } from "@/types";

type Answer = boolean | number | string | null;

export function CheckinScreen() {
  const navigation = useNavigation();
  const { data, isLoading, refetch } = useCheckInPrompt();
  const submit = useSubmitCheckIn();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const questions = data?.questions ?? [];
  const total = questions.length;
  const current = questions[index];
  const answeredCount = questions.filter(
    (q) => answers[q.key] !== undefined && answers[q.key] !== null,
  ).length;

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => answers[q.key] !== undefined && answers[q.key] !== null),
    [answers, questions],
  );

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => navigation.navigate("Today" as never), 1400);
    return () => clearTimeout(t);
  }, [submitted, navigation]);

  function setAnswer(key: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (index < total - 1) setIndex(index + 1);
  }

  function back() {
    if (index > 0) setIndex(index - 1);
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
          <Text style={styles.doneBody}>Taking you to today's plan…</Text>
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
              setIndex(0);
              setSubmitted(false);
              refetch();
            }}
            variant="ghost"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={{ color: palette.textMuted }}>No questions for today.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = total ? (index + 1) / total : 0;
  const isLast = index === total - 1;
  const currentAnswered =
    answers[current.key] !== undefined && answers[current.key] !== null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={back} disabled={index === 0} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backGlyph, index === 0 && { opacity: 0.3 }]}>←</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 5)}%` }]} />
        </View>
        <Text style={styles.stepCount}>
          {index + 1}/{total}
        </Text>
      </View>

      <View style={styles.headerWrap}>
        <Text style={styles.kicker}>DAILY CHECK-IN</Text>
        <Text style={styles.headerTitle}>How are you{"\n"}feeling today?</Text>
      </View>

      <View style={styles.cardArea}>
        <Card key={current.key} style={styles.questionCard} elevated>
          <View style={styles.qHeader}>
            <View style={styles.qIndex}>
              <Text style={styles.qIndexText}>Q{index + 1}</Text>
            </View>
            {current.reason !== "baseline" ? (
              <View style={styles.reasonPill}>
                <View style={styles.reasonDot} />
                <Text style={styles.reasonText}>
                  {current.reason.replace(/_/g, " ")}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.prompt}>{current.prompt}</Text>

          <View style={styles.answerWrap}>
            <QuestionInput
              q={current}
              value={answers[current.key] ?? null}
              onChange={(v) => setAnswer(current.key, v)}
            />
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerCount}>
          {answeredCount} of {total} answered
        </Text>
        {isLast ? (
          <Button
            title={submit.isPending ? "Submitting…" : "Submit check-in"}
            onPress={handleSubmit}
            disabled={!allAnswered || submit.isPending}
            size="lg"
          />
        ) : (
          <Button
            title="Next question"
            onPress={next}
            disabled={!currentAnswered}
            size="lg"
          />
        )}
      </View>
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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    gap: spacing.m,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  backGlyph: { fontSize: 17, fontWeight: "800", color: palette.text },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.accent,
    borderRadius: 4,
  },
  stepCount: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 36,
    textAlign: "right",
  },

  headerWrap: { paddingHorizontal: spacing.l, marginTop: spacing.s, marginBottom: spacing.l },
  kicker: {
    color: palette.accentDeep,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.s,
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  cardArea: {
    flex: 1,
    paddingHorizontal: spacing.l,
    justifyContent: "center",
  },
  questionCard: {
    padding: spacing.xl,
    gap: spacing.l,
    minHeight: 320,
  },
  qHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qIndex: {
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
  },
  qIndexText: { color: palette.accent, fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  reasonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.peachSoft,
  },
  reasonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent },
  reasonText: { color: palette.accentDeep, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  prompt: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  answerWrap: { marginTop: "auto" },

  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.s,
  },
  scaleEnd: { color: palette.textSoft, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  scale: { flexDirection: "row", justifyContent: "space-between" },
  scaleBtn: {
    width: 26,
    height: 44,
    borderRadius: 13,
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
  boolBtnActive: { backgroundColor: palette.ink },
  boolText: { color: palette.textMuted, fontWeight: "800", fontSize: 16 },
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

  footer: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: layout.tabBarBottomSpace,
    gap: spacing.s,
  },
  footerCount: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },

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
