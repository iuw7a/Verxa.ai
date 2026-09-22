/**
 * Verxa AI mobile design tokens — mirrors the web design system
 * (globals.css) so both products feel like one ecosystem.
 */
export const colors = {
  bg: "#08090c",
  bgElevated: "#101217",
  sidebar: "#0a0b0f",
  card: "#12141a",
  cardHi: "rgba(255,255,255,0.045)",
  text: "#f4f5f7",
  textMuted: "#9298a5",
  textFaint: "#616875",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  accent: "#8ea4ff",
  accentStrong: "#b8c5ff",
  accentSoft: "rgba(142,164,255,0.12)",
  onAccent: "#0a0c12",
  danger: "#f07178",
  ok: "#7dcea0",
  userBubble: "#191b23",
  glow: "rgba(118,138,255,0.28)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const font = {
  regular: 400,
  medium: "500" as const,
  semibold: "600" as const,
};
