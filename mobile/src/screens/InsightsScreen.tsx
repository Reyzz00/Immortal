import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useInsights } from "@/api/queries";
import { Card } from "@/components/Card";
import { palette, radii, spacing } from "@/theme";
import type { Insight } from "@/types";

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

export function InsightsScreen() {
  const { data, isFetching, refetch } = useInsights();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>FOR YOU</Text>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.sub}>
              Patterns, anomalies and wins surfaced from your recent data.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <Text style={{ color: palette.textMuted }}>Nothing unusual detected yet.</Text>
          </Card>
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={palette.accent}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <View style={styles.rowTop}>
              <View style={[styles.glyphWrap, { backgroundColor: KIND_TINT[item.kind] }]}>
                <Text style={[styles.glyph, { color: KIND_ACCENT[item.kind] }]}>
                  {KIND_GLYPH[item.kind]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kind, { color: KIND_ACCENT[item.kind] }]}>
                  {KIND_LABEL[item.kind]}
                </Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
              </View>
              <View style={styles.confidenceWrap}>
                <Text style={styles.confidence}>{Math.round(item.confidence * 100)}%</Text>
                <Text style={styles.confidenceLabel}>conf.</Text>
              </View>
            </View>
            <Text style={styles.itemBody}>{item.body}</Text>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  list: { padding: spacing.l, paddingBottom: spacing.xxl * 2 },
  header: { marginBottom: spacing.l },
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
  },
  sub: { color: palette.textMuted, fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  item: { gap: spacing.m },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  glyphWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { fontSize: 20, fontWeight: "900" },
  kind: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  itemTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
    lineHeight: 20,
  },
  confidenceWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radii.m,
    backgroundColor: palette.surfaceAlt,
  },
  confidence: { color: palette.text, fontSize: 14, fontWeight: "800" },
  confidenceLabel: { color: palette.textSoft, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  itemBody: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
});
