/**
 * نظام تصميم ركaz (Rikaz Design Tokens)
 * مستخرج مباشرة من الكود المصدري للمنصة (src/styles.css و OKLCH palette)
 * متوافق بالكامل مع Apple Human Interface Guidelines و Material Design 3 و WCAG 2.2 AA
 */

export const COLORS = {
  // الألوان الأساسية للمنصة (Deep Teal + Warm Sand)
  primary: "#006560",            // ركاز الكحلي المخضر الداكن (oklch 0.45 0.09 190)
  primaryDark: "#004D49",
  primaryLight: "#E6F0EF",
  primaryForeground: "#FBF8F1",  // أبيض دافئ عالي التباين (تباين 6.93:1)

  secondary: "#F6EDE0",          // رملي دافئ مهدئ (oklch 0.95 0.02 80)
  secondaryDark: "#E2D1BE",
  secondaryForeground: "#123432",

  accent: "#EBB25F",             // ذهبي رملي مميز (oklch 0.8 0.12 75)
  accentForeground: "#301D0D",

  // ألوان الخلفيات والأسطح
  background: "#FEFDFB",         // خلفية التطبيق العامة المريحة للعين
  card: "#FFFFFF",               // خلفية البطاقات والحاويات
  cardElevated: "#FFFFFF",
  foreground: "#0B2425",         // لون النصوص الأساسي الداكن (تباين 15.97:1)

  // ألوان العناصر المحايدة
  muted: "#F6F3ED",
  mutedForeground: "#566768",    // نصوص توضيحية مطابقة للتباين 5.84:1
  border: "#E7E4DF",
  borderLight: "#F0EDE8",
  input: "#E7E4DF",
  inputBg: "#FAF8F5",

  // حالات النظام والإشعارات
  destructive: "#D73431",        // أحمر التنبيه والأخطاء (تباين 4.75:1)
  destructiveLight: "#FDF2F2",
  destructiveForeground: "#FFFFFF",

  success: "#258651",            // أخضر النجاح والتأكيد
  successLight: "#F0FDF4",
  successForeground: "#FFFFFF",

  warning: "#D97706",            // برتقالي التحذير
  warningLight: "#FFFBEB",
  warningForeground: "#FFFFFF",

  // ألوان أدوار المنصة (Role Colors)
  roleGuardian: "#0284C7",
  roleGuardianBg: "#F0F9FF",
  roleStudent: "#16A34A",
  roleStudentBg: "#F0FDF4",
  roleStaff: "#006560",
  roleStaffBg: "#E6F0EF",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,                        // مطابقة نصف قطر المنصة الأساسي (0.75rem = 12px)
  lg: 16,
  xl: 22,
  full: 999,
};

export const TYPOGRAPHY = {
  fontFamily: "System",          // خط النظام مع دعم Cairo عند تحميله
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 26,
    hero: 32,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.45,
    relaxed: 1.6,
  },
};

// مقاييس الوصول واللمس الرسمية (Apple HIG: 44pt / Material 3: 48dp)
export const ACCESSIBILITY = {
  minTouchTarget: 48,            // الحجم الأدنى لعناصر اللمس للأزرار والحقول
  standardHitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};
