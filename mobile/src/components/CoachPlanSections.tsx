import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { palette, radii, spacing } from "@/theme";
import type { CoachPlan, CoachRec } from "@/types";

const PRIORITY_TONE: Record<CoachRec["priority"], { bg: string; fg: string }> = {
  critical: { bg: palette.coralSoft, fg: palette.danger },
  high: { bg: palette.peachSoft, fg: palette.accentDeep },
  medium: { bg: palette.lavenderSoft, fg: palette.lavender },
  low: { bg: palette.sageSoft, fg: palette.success },
};

export function CoachPlanSections({ plan }: { plan: CoachPlan }) {
  return (
    <>
      {plan.recommendations.length > 0 ? (
        <Section title="SUPPORTING RECOMMENDATIONS">
          {plan.recommendations.map((r, i) => (
            <SupportingRecCard key={`${r.domain}-${i}`} rec={r} />
          ))}
        </Section>
      ) : null}

      {plan.positives.length > 0 ? (
        <Card tone="sage" style={styles.block}>
          <Text style={styles.blockKicker}>WINS</Text>
          {plan.positives.map((p, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={styles.bulletGlyph}>✓</Text>
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {plan.tomorrow_preview ? (
        <Card tone="peach" style={styles.block}>
          <Text style={styles.blockKicker}>TOMORROW</Text>
          <Text style={styles.previewText}>{plan.tomorrow_preview}</Text>
        </Card>
      ) : null}

      <Text style={styles.disclaimer}>{plan.disclaimer}</Text>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>{title}</Text>
      {children}
    </View>
  );
}

function SupportingRecCard({ rec }: { rec: CoachRec }) {
  const tone = PRIORITY_TONE[rec.priority];
  return (
    <Card style={styles.recCard}>
      <View style={styles.recRow}>
        <View style={[styles.priorityPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.priorityText, { color: tone.fg }]}>
            {rec.priority.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.recHeadline} numberOfLines={2}>
          {rec.headline}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.s },
  sectionHead: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginTop: spacing.s,
  },
  block: { gap: spacing.s },
  blockKicker: {
    color: palette.textMuted,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: spacing.s },
  bulletGlyph: {
    color: palette.success,
    fontSize: 16,
    fontWeight: "900",
    marginTop: -2,
  },
  bulletGlyphBox: {
    color: palette.lavender,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  previewText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  gapText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  disclaimer: {
    color: palette.textSoft,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    marginTop: spacing.m,
    paddingHorizontal: spacing.m,
  },

  recCard: { gap: spacing.xs },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
    flexWrap: "wrap",
  },
  priorityPill: {
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  priorityText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  recDomain: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  timeWindow: {
    marginLeft: "auto",
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "700",
  },
  recHeadline: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
    lineHeight: 21,
  },
  recAction: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  recDivider: {
    height: 1,
    backgroundColor: palette.borderSoft,
    marginVertical: spacing.s,
  },
  recImpact: {
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "700",
  },
});
