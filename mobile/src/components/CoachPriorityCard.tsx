import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { palette, spacing } from "@/theme";
import type { CoachPriorityRec } from "@/types";

type Props = {
  rec: CoachPriorityRec;
  onAccept?: () => void;
  onIgnore?: () => void;
};

export function CoachPriorityCard({ rec, onAccept, onIgnore }: Props) {
  return (
    <Card tone="ink" style={styles.card}>
      <Text style={styles.kicker}>
        PRIORITY · {rec.domain.toUpperCase().replace(/_/g, " ")}
      </Text>
      <Text style={styles.headline}>{rec.headline}</Text>
      <Text style={styles.action}>{rec.action}</Text>
      <Text style={styles.why}>{rec.why}</Text>

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
    letterSpacing: -0.4,
    marginTop: spacing.xs,
  },
  action: {
    color: "#D8CFBF",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  why: {
    color: "#8A8F97",
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.s,
  },
  actions: { flexDirection: "row", marginTop: spacing.m },
});
