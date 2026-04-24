import type { Theme } from "@react-navigation/native";

export const palette = {
  bg: "#F7EFE6",
  bgAlt: "#FBF5EC",
  surface: "#FFFFFF",
  surfaceAlt: "#F2EADF",
  surfaceSunken: "#EFE5D6",
  border: "#EBDFCF",
  borderSoft: "#F2E8DA",
  text: "#14181F",
  textMuted: "#6E6A62",
  textSoft: "#9A948A",
  accent: "#F5A25D",
  accentSoft: "#FCD9B6",
  accentDeep: "#E0873F",
  ink: "#0F131A",
  inkSoft: "#1C212B",
  sage: "#B9CFB8",
  sageSoft: "#DCE8D7",
  lavender: "#C8BEE6",
  lavenderSoft: "#E4DEF3",
  coral: "#F2BDAA",
  coralSoft: "#F9DDD1",
  peach: "#F7C89E",
  peachSoft: "#FBE3CC",
  mint: "#CFE4D6",
  sky: "#C6D8EE",
  warn: "#E09B3C",
  danger: "#D96B6B",
  success: "#7BB38B",
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  s: 10,
  m: 16,
  l: 24,
  xl: 32,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#2A1D0C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: "#2A1D0C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
};

export const navTheme: Theme = {
  dark: false,
  colors: {
    primary: palette.accent,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    border: palette.borderSoft,
    notification: palette.accentDeep,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

export function scoreColor(score: number): string {
  if (score >= 75) return palette.success;
  if (score >= 50) return palette.accent;
  return palette.danger;
}

export function scoreTint(score: number): string {
  if (score >= 75) return palette.sageSoft;
  if (score >= 50) return palette.peachSoft;
  return palette.coralSoft;
}
