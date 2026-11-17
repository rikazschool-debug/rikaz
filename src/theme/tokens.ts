/**
 * نظام تصميم ركاز للجوال.
 * الألوان منقولة من src/styles.css في منصة ركاز (قيم oklch محوّلة إلى sRGB)،
 * والخط Cairo هو خط المنصة نفسه. المقاسات تتبع شبكة 4 نقاط،
 * وأهداف اللمس 48 نقطة على الأقل (Material: 48dp، Apple: 44pt).
 */

export const COLORS = {
  primary: "#006560", // --primary oklch(0.45 0.09 190)
  primaryPressed: "#004F4C",
  primaryTint: "#E3F1EF",
  primaryForeground: "#FBF8F1", // --primary-foreground

  secondary: "#F6EDE0", // --secondary
  secondaryForeground: "#123432",

  accent: "#EBB25F", // --accent oklch(0.8 0.12 75)
  accentForeground: "#301D0D",

  background: "#FEFDFB", // --background
  card: "#FFFFFF",
  foreground: "#0B2425", // --foreground
  muted: "#F6F3ED", // --muted
  mutedForeground: "#566768", // --muted-foreground
  border: "#E7E4DF", // --border
  inputBg: "#FBFAF7",

  destructive: "#D73431", // --destructive
  destructiveTint: "#FCEDEC",
  success: "#258651", // --success
  successTint: "#E8F5EE",
  warning: "#F2AF48", // --warning
  warningForeground: "#43260A",
  warningTint: "#FDF4E4",

  overlay: "rgba(11, 36, 37, 0.45)",
  onPrimaryMuted: "rgba(251, 248, 241, 0.78)",
  onPrimarySubtle: "rgba(251, 248, 241, 0.14)",
};

/** شبكة 4 نقاط */
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

/** --radius في المنصة 0.75rem = 12 */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

/** خط Cairo بأوزان منفصلة، لأن أندرويد لا يختار الوزن من fontWeight للخطوط المخصصة */
export const FONTS = {
  regular: "Cairo_400Regular",
  medium: "Cairo_500Medium",
  semibold: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  extrabold: "Cairo_800ExtraBold",
} as const;

/** ألوان شاشة الدخول المأخوذة من مرجع التصميم المرفق؛ بقية التطبيق تحتفظ بنظامها الحالي. */
export const LOGIN_COLORS = {
  background: "#FAF8FF",
  surface: "#FFFFFF",
  surfaceLow: "#F2F3FF",
  surfaceContainer: "#EAEDFF",
  primary: "#00236F",
  primaryPressed: "#00164E",
  primaryContainer: "#1E3A8A",
  primaryTint: "#DCE1FF",
  secondary: "#006398",
  foreground: "#131B2E",
  mutedForeground: "#444651",
  border: "#C5C5D3",
  inputBackground: "#F2F3FF",
  destructive: "#BA1A1A",
  onPrimary: "#FFFFFF",
} as const;

export type FontWeightName = keyof typeof FONTS;

/** سلّم الخطوط: الحجم وارتفاع السطر (Cairo يحتاج ارتفاع سطر واسعًا للحروف العربية) */
export const TYPE = {
  display: { fontSize: 28, lineHeight: 42, weight: "extrabold" as FontWeightName },
  title: { fontSize: 22, lineHeight: 34, weight: "bold" as FontWeightName },
  headline: { fontSize: 18, lineHeight: 28, weight: "bold" as FontWeightName },
  body: { fontSize: 16, lineHeight: 26, weight: "regular" as FontWeightName },
  bodyStrong: { fontSize: 16, lineHeight: 26, weight: "semibold" as FontWeightName },
  label: { fontSize: 14, lineHeight: 22, weight: "semibold" as FontWeightName },
  caption: { fontSize: 13, lineHeight: 20, weight: "regular" as FontWeightName },
  micro: { fontSize: 12, lineHeight: 18, weight: "medium" as FontWeightName },
};

export type TypeVariant = keyof typeof TYPE;

/** أقصى تكبير للنص حتى لا تنكسر العناوين والأزرار مع إعدادات الخط الكبير */
export const FONT_SCALE = { body: 1.6, heading: 1.35, control: 1.3 };

export const TOUCH = {
  min: 48,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

export const SHADOWS = {
  card: {
    shadowColor: "#0B2425",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0B2425",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
};
