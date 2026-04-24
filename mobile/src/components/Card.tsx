import { StyleSheet, View, type ViewProps } from "react-native";

import { palette, radii, shadow, spacing } from "@/theme";

type Props = ViewProps & {
  tone?: "surface" | "sunken" | "ink" | "sage" | "lavender" | "peach" | "coral" | "mint";
  padded?: boolean;
  elevated?: boolean;
};

const toneBg: Record<NonNullable<Props["tone"]>, string> = {
  surface: palette.surface,
  sunken: palette.surfaceAlt,
  ink: palette.ink,
  sage: palette.sageSoft,
  lavender: palette.lavenderSoft,
  peach: palette.peachSoft,
  coral: palette.coralSoft,
  mint: palette.mint,
};

export function Card({ style, tone = "surface", padded = true, elevated = true, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: toneBg[tone] },
        padded && styles.padded,
        elevated && tone === "surface" && shadow.card,
        tone === "ink" && styles.ink,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.l,
  },
  padded: {
    padding: spacing.l,
  },
  ink: {
    // no shadow for ink cards, they're statement blocks
  },
});
