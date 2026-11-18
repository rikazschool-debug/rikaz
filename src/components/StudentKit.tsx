import React from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronLeft, ChevronRight, ExternalLink, type LucideIcon } from "lucide-react-native";
import { AppText } from "./ui";
import { RikazLogo } from "./RikazLogo";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { pressScale } from "../lib/motion";
import { CONFIG } from "../config";
import { SECTIONS, type SectionKey } from "../lib/sections";
import { COLORS, RADIUS, SHADOWS, SPACING, TOUCH } from "../theme/tokens";

/** يفتح قسم الطالب في منصة ركاز حتى تُبنى صفحته داخل التطبيق. */
export function openSection(key: SectionKey) {
  void Linking.openURL(`${CONFIG.platformUrl}${SECTIONS[key].path}`);
}

export const WEB_HINT = "يفتح في منصة ركاز، وقد يُطلب منك الدخول هناك";

/** عنوان الشاشة: سطر تعريفي ذهبي + عنوان كبير + زر اختياري. */
export const ScreenTitle: React.FC<{ eyebrow?: string; title: string; action?: React.ReactNode }> = ({ eyebrow, title, action }) => (
  <View style={styles.titleRow}>
    <View style={styles.flex}>
      {eyebrow ? (
        <View style={styles.eyebrow}>
          <AppText variant="micro" weight="bold" color={COLORS.primary}>{eyebrow}</AppText>
          <View style={styles.eyebrowLine} />
        </View>
      ) : null}
      <AppText weight="extrabold" style={styles.title} accessibilityRole="header">{title}</AppText>
    </View>
    {action}
  </View>
);

export const IconButton: React.FC<{ icon: LucideIcon; label: string; onPress: () => void; dot?: boolean }> = ({ icon: Icon, label, onPress, dot }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={TOUCH.hitSlop} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
    <Icon size={20} color={COLORS.foreground} />
    {dot ? <View style={styles.dot} /> : null}
  </Pressable>
);

/** تبويبات مقسّمة داخل الشاشة. */
export function SegmentTabs<T extends string>({ items, value, onChange, label }: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel={label}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <AppText variant="label" weight={on ? "extrabold" : "semibold"} color={on ? COLORS.primary : COLORS.mutedForeground} align="center" numberOfLines={1}>
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const IconTileBox: React.FC<{ icon: LucideIcon; size?: number; tone?: "primary" | "accent" }> = ({ icon: Icon, size = 44, tone = "primary" }) => (
  <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }, tone === "accent" && { backgroundColor: COLORS.warningTint }]}>
    <Icon size={size * 0.5} color={tone === "accent" ? "#B7791F" : COLORS.primary} />
  </View>
);

/** بطاقة مهمة سريعة (ثلاث في الصف). */
export const QuickTile: React.FC<{ icon: LucideIcon; label: string; hint?: string; onPress: () => void; web?: boolean }> = ({ icon, label, hint, onPress, web }) => {
  const reduced = useReducedMotion();
  return (
    <Pressable onPress={onPress} accessibilityRole={web ? "link" : "button"} accessibilityLabel={label} accessibilityHint={web ? WEB_HINT : undefined} style={({ pressed }) => [styles.quick, pressed && styles.pressedTile, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
      <IconTileBox icon={icon} />
      <AppText variant="label" weight="bold" align="center" numberOfLines={2}>{label}</AppText>
      {hint ? <AppText variant="micro" color={COLORS.mutedForeground} align="center" numberOfLines={1}>{hint}</AppText> : null}
    </Pressable>
  );
};

/** صف قائمة بأيقونة وسهم. */
export const ListRow: React.FC<{ icon: LucideIcon; title: string; subtitle?: string; onPress?: () => void; web?: boolean; first?: boolean }> = ({ icon, title, subtitle, onPress, web, first }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={web ? "link" : "button"}
    accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}
    accessibilityHint={web ? WEB_HINT : undefined}
    style={({ pressed }) => [styles.row, !first && styles.rowBorder, pressed && styles.pressed]}
  >
    <IconTileBox icon={icon} size={38} />
    <View style={styles.flex}>
      <AppText variant="bodyStrong" numberOfLines={2}>{title}</AppText>
      {subtitle ? <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={2}>{subtitle}</AppText> : null}
    </View>
    {onPress ? (web ? <ExternalLink size={16} color={COLORS.mutedForeground} /> : <ChevronLeft size={18} color={COLORS.mutedForeground} />) : null}
  </Pressable>
);

export const Panel: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => <View style={[styles.panel, style]}>{children}</View>;

export const SectionTitle: React.FC<{ title: string; caption?: string }> = ({ title, caption }) => (
  <View style={styles.sectionTitle}>
    <AppText variant="headline" weight="extrabold" accessibilityRole="header">{title}</AppText>
    {caption ? <AppText variant="micro" color={COLORS.mutedForeground}>{caption}</AppText> : null}
  </View>
);

/** بطاقة منصة ركاز على الويب. */
export const WebCard: React.FC<{ title: string; subtitle: string; onPress: () => void }> = ({ title, subtitle, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={title} accessibilityHint={WEB_HINT} style={({ pressed }) => [styles.web, pressed && { opacity: 0.9 }]}>
    <RikazLogo size={34} color={COLORS.primaryForeground} />
    <View style={styles.flex}>
      <AppText variant="bodyStrong" color={COLORS.primaryForeground}>{title}</AppText>
      <AppText variant="micro" color={COLORS.onPrimaryMuted}>{subtitle}</AppText>
    </View>
    <ExternalLink size={18} color={COLORS.primaryForeground} />
  </Pressable>
);

export const studentStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8F6" },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.lg, width: "100%", maxWidth: 600, alignSelf: "center" },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  eyebrowLine: { width: 16, height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
  title: { fontSize: 24, lineHeight: 38 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, end: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.accent, borderWidth: 2, borderColor: COLORS.card },
  pressed: { backgroundColor: COLORS.muted },
  pressedTile: { backgroundColor: COLORS.primaryTint, borderColor: COLORS.primary },
  tabs: { flexDirection: "row", backgroundColor: COLORS.muted, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xs },
  tabOn: { backgroundColor: COLORS.card, ...SHADOWS.card },
  tile: { backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  quick: { flexBasis: "30%", flexGrow: 1, minHeight: 112, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: "center", justifyContent: "center", gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md, minHeight: TOUCH.min },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  panel: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: SPACING.lg },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.xs },
  web: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: COLORS.primary, borderRadius: 18, padding: SPACING.lg, ...SHADOWS.raised },
});

/** حالات التحميل/الخطأ/الفراغ الموحدة لشاشات بيانات الطالب. */
export const DataState: React.FC<{ loading?: boolean; error?: boolean; missing?: boolean; empty?: boolean; emptyTitle?: string; emptyHint?: string; onRetry?: () => void; children?: React.ReactNode }> = ({ loading, error, missing, empty, emptyTitle, emptyHint, onRetry, children }) => {
  if (loading) {
    return (
      <Panel style={stateStyles.box}>
        <ActivityIndicator color={COLORS.primary} accessibilityLabel="جارٍ التحميل" />
        <AppText variant="caption" color={COLORS.mutedForeground} align="center">جارٍ تحميل بياناتك…</AppText>
      </Panel>
    );
  }
  if (error || missing || empty) {
    const title = error ? "تعذّر تحميل البيانات" : missing ? "لا يوجد ملف طالب مرتبط بحسابك في هذه المدرسة" : emptyTitle ?? "لا توجد بيانات بعد";
    const hint = error ? "تحقق من اتصالك بالإنترنت ثم أعد المحاولة." : missing ? "تواصل مع إدارة المدرسة لربط حسابك بملفك." : emptyHint;
    return (
      <Panel style={stateStyles.box}>
        <AppText variant="bodyStrong" align="center" accessibilityRole={error ? "alert" : undefined}>{title}</AppText>
        {hint ? <AppText variant="caption" color={COLORS.mutedForeground} align="center">{hint}</AppText> : null}
        {error && onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [stateStyles.retry, pressed && { opacity: 0.85 }]}>
            <AppText variant="label" weight="bold" color={COLORS.primaryForeground}>إعادة المحاولة</AppText>
          </Pressable>
        ) : null}
      </Panel>
    );
  }
  return <>{children}</>;
};

/** رأس شاشة فرعية مع زر رجوع. */
export const BackHeader: React.FC<{ title: string; eyebrow?: string; onBack: () => void }> = ({ title, eyebrow, onBack }) => (
  <ScreenTitle eyebrow={eyebrow} title={title} action={<IconButton icon={ChevronRight} label="رجوع" onPress={onBack} />} />
);

/** شارة حالة صغيرة. */
export const Pill: React.FC<{ label: string; tone?: "primary" | "accent" | "danger" | "muted" | "success" }> = ({ label, tone = "muted" }) => {
  const t = PILL[tone];
  return (
    <View style={[stateStyles.pill, { backgroundColor: t.bg }]}>
      <AppText variant="micro" weight="bold" color={t.fg} numberOfLines={1}>{label}</AppText>
    </View>
  );
};
const PILL = {
  primary: { bg: COLORS.primaryTint, fg: COLORS.primary },
  accent: { bg: COLORS.warningTint, fg: "#8a5a12" },
  danger: { bg: COLORS.destructiveTint, fg: COLORS.destructive },
  success: { bg: COLORS.successTint, fg: COLORS.success },
  muted: { bg: COLORS.muted, fg: COLORS.mutedForeground },
};

const stateStyles = StyleSheet.create({
  box: { paddingVertical: SPACING.xl, gap: SPACING.sm, alignItems: "center" },
  retry: { marginTop: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: SPACING.lg, minHeight: 44, justifyContent: "center" },
  pill: { borderRadius: 999, paddingHorizontal: SPACING.sm + 2, paddingVertical: 2, alignSelf: "flex-start" },
});
