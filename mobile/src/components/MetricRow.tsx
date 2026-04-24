import { StyleSheet, Text, View } from "react-native";

import { palette, scoreColor, spacing } from "@/theme";

type Props = {
  label: string;
  value: string;
  score?: number;
};

export function MetricRow({ label, value, score }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, score != null && { color: scoreColor(score) }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  label: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  valueWrap: { flexDirection: "row", alignItems: "baseline" },
  value: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
  },
});
