/**
 * لوحة صفحات الطالب المعتمدة (Rikaz Student Experience): زمردي عميق، نعناعي، وكهرماني دافئ،
 * على خلفية فاتحة هادئة. بقية الأدوار تبقى على لوحة المنصة في tokens.ts.
 */
export const S = {
  primary: "#0F5145",
  primaryPressed: "#0B4036",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255,255,255,0.78)",
  onPrimarySubtle: "rgba(255,255,255,0.14)",
  secondary: "#25A18E",
  mint: "#E8F5F1",
  mintStrong: "#CDEFE6",
  amber: "#F59E0B",
  amberWash: "#FEF3C7",
  amberText: "#B45309",
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  well: "#F1F5F9",
  ink: "#0F172A",
  text2: "#475569",
  muted: "#94A3B8",
  tabOff: "#64748B",
  border: "#E2E8F0",
  hairline: "#F1F5F9",
  danger: "#E11D48",
  dangerWash: "#FFF1F2",
  dangerBorder: "#FFE4E6",
  blueWash: "#E0ECFF",
  blue: "#2563EB",
} as const;

export const SHADOW = {
  l1: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  l2: { shadowColor: "#0F5145", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 6 },
  l3: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 10 },
} as const;

/** زوايا التصميم: بطاقات كبيرة 24، بطاقات تفاعلية 16، شارات دائرية. */
export const R = { card: 24, tile: 16, chip: 999 } as const;
