import { Pressable, StyleSheet, Text } from "react-native";

import { palette, radii, shadow, spacing } from "@/theme";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "md" | "lg";
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", size = "md", disabled }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        size === "lg" && styles.lg,
        variant === "primary" && styles.primary,
        variant === "accent" && styles.accent,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant !== "ghost" && shadow.card,
        disabled && styles.disabled,
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.text,
          size === "lg" && styles.lgText,
          variant === "primary" && styles.primaryText,
          variant === "accent" && styles.accentText,
          variant === "secondary" && styles.secondaryText,
          variant === "ghost" && styles.ghostText,
          disabled && { color: palette.textSoft },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.l,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  lg: {
    minHeight: 52,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
  },
  primary: { backgroundColor: palette.ink },
  accent: { backgroundColor: palette.accent },
  secondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  text: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2, textAlign: "center" },
  lgText: { fontSize: 15 },
  primaryText: { color: palette.bgAlt },
  accentText: { color: palette.ink },
  secondaryText: { color: palette.text },
  ghostText: { color: palette.accentDeep },
});
