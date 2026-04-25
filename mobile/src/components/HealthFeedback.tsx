import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { palette, radii, spacing } from "@/theme";

type Insight = {
  tone: "good" | "watch" | "info";
  metric: string;
  headline: string;
  body: string;
};

const INSIGHTS: Insight[] = [
  {
    tone: "good",
    metric: "HRV",
    headline: "HRV trending +6ms above baseline",
    body: "Three nights of 7+ hour sleep have lifted parasympathetic recovery. Hold the bedtime — you're compounding gains.",
  },
  {
    tone: "watch",
    metric: "Resting HR",
    headline: "Resting HR up 3 bpm vs your 14-day mean",
    body: "Likely tied to yesterday's late-evening run. Either back off intensity tomorrow or shift workouts before 6pm.",
  },
  {
    tone: "good",
    metric: "Sleep",
    headline: "Deep sleep at 21% — strong cycle",
    body: "Cool room and pre-bed wind-down are showing in deep sleep ratio. Restorative stages above 18% predict next-day HRV.",
  },
  {
    tone: "info",
    metric: "Activity",
    headline: "Stand goal on pace · 9 of 12 hours",
    body: "Three more hours to close the ring. A 5-minute walk before lunch and after dinner usually does it.",
  },
];

export function HealthFeedback() {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.aiBadge}>
          <Text style={styles.aiGlyph}>✦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>WHAT YOUR DATA MEANS</Text>
          <Text style={styles.title}>Coach feedback</Text>
        </View>
      </View>

      <View style={styles.list}>
        {INSIGHTS.map((it, i) => (
          <Card key={i} style={styles.item}>
            <View style={styles.itemTop}>
              <View
                style={[
                  styles.metricPill,
                  it.tone === "good" && { backgroundColor: palette.sageSoft },
                  it.tone === "watch" && { backgroundColor: palette.coralSoft },
                  it.tone === "info" && { backgroundColor: palette.lavenderSoft },
                ]}
              >
                <View
                  style={[
                    styles.metricDot,
                    {
                      backgroundColor:
                        it.tone === "good"
                          ? palette.success
                          : it.tone === "watch"
                            ? palette.danger
                            : palette.lavender,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.metricText,
                    {
                      color:
                        it.tone === "good"
                          ? palette.success
                          : it.tone === "watch"
                            ? palette.danger
                            : palette.lavender,
                    },
                  ]}
                >
                  {it.metric}
                </Text>
              </View>
            </View>
            <Text style={styles.headline}>{it.headline}</Text>
            <Text style={styles.body}>{it.body}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.m },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    paddingHorizontal: spacing.xs,
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  aiGlyph: { color: palette.accent, fontSize: 16, fontWeight: "900" },
  kicker: {
    color: palette.accentDeep,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  list: { gap: spacing.s },
  item: { gap: 6 },
  itemTop: { flexDirection: "row", alignItems: "center" },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  metricDot: { width: 6, height: 6, borderRadius: 3 },
  metricText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  headline: { color: palette.text, fontSize: 15, fontWeight: "800", marginTop: 2 },
  body: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
});
