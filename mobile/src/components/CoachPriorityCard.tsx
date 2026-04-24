import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { palette, radii, spacing } from "@/theme";
import type { CoachPriorityRec } from "@/types";

type Props = {
  rec: CoachPriorityRec;
  onAccept?: () => void;
  onIgnore?: () => void;
};

export function CoachPriorityCard({ rec, onAccept, onIgnore }: Props) {
  return (
    <Card tone="ink" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✦</Text>
        </View>
        <Text style={styles.kicker}>
          PRIORITY · {rec.domain.toUpperCase().replace(/_/g, " ")}
        </Text>
      </View>
      <Text style={styles.headline}>{rec.headline}</Text>
      <Text style={styles.action}>{rec.action}</Text>
      <View style={styles.divider} />
      <Text style={styles.sectionKicker}>WHY</Text>
      <Text style={styles.body}>{rec.why}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>EXPECTED</Text>
          <Text style={styles.metaPillText}>{rec.expected_impact}</Text>
        </View>
      </View>
      <Text style={styles.evidence}>📚 {rec.evidence}</Text>
      {(onAccept || onIgnore) ? (
        <View style={styles.actions}>
          {onAccept ? (
            <View style={{ flex: 1 }}>
              <Button title="Accept" variant="accent" onPress={onAccept} />
            </View>
          ) : null}
          {onAccept && onIgnore ? <View style={{ width: spacing.s }} /> : null}
          {onIgnore ? (
            <View style={{ flex: 1 }}>
              <Button title="Not today" variant="secondary" onPress={onIgnore} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.ink,
    padding: spacing.xl,
    gap: spacing.s,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  kicker: {
    color: palette.accent,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  headline: {
    color: palette.bgAlt,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  action: {
    color: "#E6DFCF",
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: spacing.s,
  },
  sectionKicker: {
    color: "#9AA0A8",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  body: {
    color: "#C6BFB0",
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: { flexDirection: "row", gap: spacing.s, flexWrap: "wrap" },
  metaPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radii.m,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 2,
    flexShrink: 1,
  },
  metaPillLabel: {
    color: "#8A8F97",
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  metaPillText: { color: palette.bgAlt, fontSize: 12, fontWeight: "700" },
  evidence: {
    color: "#8A8F97",
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16,
  },
  actions: { flexDirection: "row", marginTop: spacing.s },
});
