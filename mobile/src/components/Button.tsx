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
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  lg: {
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
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
  text: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  lgText: { fontSize: 16 },
  primaryText: { color: palette.bgAlt },
  accentText: { color: palette.ink },
  secondaryText: { color: palette.text },
  ghostText: { color: palette.accentDeep },
});
