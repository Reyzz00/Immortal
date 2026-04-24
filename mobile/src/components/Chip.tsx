import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing } from "@/theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: "neutral" | "accent";
};

export function Chip({ label, active, onPress, tone = "accent" }: Props) {
  const Wrapper = onPress ? Pressable : View;
  const isAccent = tone === "accent";
  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.chip,
        active && isAccent && styles.activeAccent,
        active && !isAccent && styles.activeInk,
        !active && styles.idle,
      ]}
    >
      <Text
        style={[
          styles.text,
          active && isAccent && styles.textAccentActive,
          active && !isAccent && styles.textInkActive,
        ]}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: radii.pill,
  },
  idle: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  activeAccent: {
    backgroundColor: palette.accent,
  },
  activeInk: {
    backgroundColor: palette.ink,
  },
  text: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  textAccentActive: { color: palette.ink },
  textInkActive: { color: palette.bgAlt },
});
