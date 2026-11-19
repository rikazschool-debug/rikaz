import React from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Bell, GraduationCap, Search, UserRound, X, type LucideIcon } from "lucide-react-native";
import { AppText } from "../ui";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { useFontSet } from "../../theme/fontSet";
import { R, S, SHADOW } from "../../theme/student";
import { FONT_SCALE, SPACING, TOUCH } from "../../theme/tokens";

/** حاوية تمرير صفحات الطالب الرئيسية (الشريط العلوي يعالج المنطقة الآمنة). */
export const SScreen: React.FC<{ children: React.ReactNode; topInset?: boolean; refresh?: React.ReactElement }> = ({ children, topInset, refresh }) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled" refreshControl={refresh as never}
      contentContainerStyle={[s.content, { paddingTop: (topInset ? insets.top : 0) + SPACING.lg, paddingBottom: SPACING.xxxl + SPACING.lg }]}>
      <StatusBar style="dark" />
      {children}
    </ScrollView>
  );
};

/** الشريط العلوي الثابت لتبويبات الطالب: اسم القسم يمينًا، والإشعارات والحساب يسارًا. */
export const STopBar: React.FC<{ title: string; onBell: () => void; onAccount: () => void; accountActive?: boolean }> = ({ title, onBell, onAccount, accountActive }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.topbar, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={s.topStart}>
        <View style={s.capWell}><GraduationCap size={20} color={S.primary} /></View>
        <AppText variant="headline" weight="bold" color={S.ink} numberOfLines={1} accessibilityRole="header">{title}</AppText>
      </View>
      <View style={s.topEnd}>
        <Pressable onPress={onBell} accessibilityRole="button" accessibilityLabel="الإشعارات" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [s.bell, pressed && s.pressed]}>
          <Bell size={22} color={S.ink} />
        </Pressable>
        <Pressable onPress={onAccount} accessibilityRole="button" accessibilityLabel="حسابي" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [s.me, accountActive && s.meOn, pressed && { opacity: 0.85 }]}>
          <UserRound size={20} color={S.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
};

/** عنوان الصفحة: سطر تعريفي بنقطة/خط كهرماني ثم عنوان كبير، وزر دائري اختياري. */
export const SHeader: React.FC<{ eyebrow?: string; title?: string; action?: React.ReactNode }> = ({ eyebrow, title, action }) => (
  <View style={s.header}>
    <View style={s.flex}>
      {eyebrow ? (
        <View style={s.eyebrow}>
          <View style={s.eyebrowMark} />
          <AppText variant="caption" color={S.text2}>{eyebrow}</AppText>
        </View>
      ) : null}
      {title ? <AppText weight="bold" color={S.ink} style={s.title} accessibilityRole="header">{title}</AppText> : null}
    </View>
    {action}
  </View>
);

export const SCircleButton: React.FC<{ icon: LucideIcon; label: string; onPress: () => void; size?: number }> = ({ icon: Icon, label, onPress, size = 52 }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={TOUCH.hitSlop}
    style={({ pressed }) => [s.circle, { width: size, height: size, borderRadius: size / 2 }, pressed && s.pressed]}>
    <Icon size={22} color={S.primary} />
  </Pressable>
);

/** عنوان قسم: شريط زمردي صغير + عنوان، ومحتوى اختياري في الطرف الآخر. */
export const SSection: React.FC<{ title: string; icon?: LucideIcon; end?: React.ReactNode }> = ({ title, icon: Icon, end }) => (
  <View style={s.section}>
    <View style={s.sectionStart}>
      {Icon ? <Icon size={20} color={S.primary} /> : <View style={s.sectionBar} />}
      <AppText variant="headline" weight="bold" color={S.ink} accessibilityRole="header">{title}</AppText>
    </View>
    {end}
  </View>
);

type Tone = "mint" | "amber" | "muted" | "danger" | "primary" | "blue";
const TONE: Record<Tone, { bg: string; fg: string }> = {
  mint: { bg: S.mint, fg: S.primary },
  amber: { bg: S.amberWash, fg: S.amberText },
  muted: { bg: S.well, fg: S.text2 },
  danger: { bg: S.dangerWash, fg: S.danger },
  primary: { bg: S.primary, fg: S.onPrimary },
  blue: { bg: S.blueWash, fg: S.blue },
};
export const SBadge: React.FC<{ label: string; tone?: Tone; icon?: LucideIcon }> = ({ label, tone = "mint", icon: Icon }) => {
  const t = TONE[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      {Icon ? <Icon size={12} color={t.fg} /> : null}
      <AppText variant="micro" weight="semibold" color={t.fg} numberOfLines={1}>{label}</AppText>
    </View>
  );
};

/** بئر أيقونة بلون هادئ. */
export const SWell: React.FC<{ icon: LucideIcon; tone?: Tone; size?: number; round?: boolean }> = ({ icon: Icon, tone = "mint", size = 48, round }) => {
  const t = TONE[tone === "primary" ? "mint" : tone];
  return (
    <View style={[s.well, { width: size, height: size, borderRadius: round ? size / 2 : size * 0.3, backgroundColor: t.bg }]}>
      <Icon size={Math.round(size * 0.46)} color={t.fg} />
    </View>
  );
};

export const SCard: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string; link?: boolean; hint?: string }> = ({ children, style, onPress, label, link, hint }) => {
  const reduced = useReducedMotion();
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole={link ? "link" : "button"} accessibilityLabel={label} accessibilityHint={hint}
      style={({ pressed }) => [s.card, style, pressed && s.cardPressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
      {children}
    </Pressable>
  );
};

/** تبويبات كبسولية داخل حاوية رمادية فاتحة. */
export function SPillTabs<T extends string>({ items, value, onChange, label }: { items: { key: T; label: string; dot?: boolean }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={s.pills} accessibilityRole="tablist" accessibilityLabel={label}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.pill, on && s.pillOn]}>
            {on && it.dot ? <View style={s.pillDot} /> : null}
            <AppText variant="label" weight={on ? "bold" : "medium"} color={on ? S.primary : S.tabOff} align="center" numberOfLines={1}>{it.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** شرائح أفقية: المختارة زمردية، وعدّاد كهرماني اختياري. */
export function SChips<T extends string>({ items, value, onChange, label }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel={label}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.chip, on && s.chipOn]}>
            {it.count ? (
              <View style={s.chipCount}><AppText variant="micro" weight="bold" color={S.ink}>{String(it.count)}</AppText></View>
            ) : null}
            <AppText variant="label" weight={on ? "bold" : "medium"} color={on ? S.onPrimary : S.ink} numberOfLines={1}>{it.label}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** شريط بحث دائري؛ الأيقونة يمينًا وزر المسح يسارًا. */
export const SSearch: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; label: string }> = ({ value, onChange, placeholder, label }) => {
  const F = useFontSet();
  return (
    <View style={s.search}>
      <Search size={20} color={S.text2} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={S.muted} accessibilityLabel={label}
        maxFontSizeMultiplier={FONT_SCALE.control} returnKeyType="search" style={[s.searchInput, { fontFamily: F.regular }]} />
      {value ? (
        <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel="مسح البحث" hitSlop={TOUCH.hitSlop}>
          <X size={18} color={S.muted} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const sStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  flex: { flex: 1 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: S.canvas },
  content: { paddingHorizontal: SPACING.lg, gap: SPACING.xl, width: "100%", maxWidth: 600, alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: S.surface, borderBottomWidth: 1, borderBottomColor: S.hairline, ...SHADOW.l1 },
  topStart: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexShrink: 1 },
  topEnd: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  capWell: { width: 40, height: 40, borderRadius: 20, backgroundColor: S.mint, alignItems: "center", justifyContent: "center" },
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  me: { width: 42, height: 42, borderRadius: 21, backgroundColor: S.primary, alignItems: "center", justifyContent: "center" },
  meOn: { borderWidth: 3, borderColor: S.mintStrong },
  pressed: { backgroundColor: S.well },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  eyebrowMark: { width: 18, height: 4, borderRadius: 2, backgroundColor: S.amber },
  title: { fontSize: 30, lineHeight: 44 },
  circle: { backgroundColor: S.surface, borderWidth: 1, borderColor: S.border, alignItems: "center", justifyContent: "center", ...SHADOW.l1 },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md },
  sectionStart: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexShrink: 1 },
  sectionBar: { width: 6, height: 22, borderRadius: 3, backgroundColor: S.primary },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: R.chip, paddingHorizontal: SPACING.sm + 2, paddingVertical: 2, alignSelf: "flex-start" },
  well: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: S.surface, borderRadius: R.tile + 4, borderWidth: 1, borderColor: S.hairline, padding: SPACING.lg, ...SHADOW.l1 },
  cardPressed: { backgroundColor: S.mint, borderColor: S.mintStrong },
  pills: { flexDirection: "row", backgroundColor: S.well, borderRadius: R.chip, padding: 4, gap: 4 },
  pill: { flex: 1, minHeight: 48, borderRadius: R.chip, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: SPACING.xs },
  pillOn: { backgroundColor: S.surface, ...SHADOW.l1 },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: S.primary },
  chips: { gap: SPACING.sm, paddingVertical: 2 },
  chip: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: SPACING.sm, borderWidth: 1, borderColor: S.border, backgroundColor: S.surface, borderRadius: R.chip, paddingHorizontal: SPACING.lg },
  chipOn: { backgroundColor: S.primary, borderColor: S.primary },
  chipCount: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: S.amber, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 56, borderRadius: R.chip, borderWidth: 1, borderColor: S.border, backgroundColor: S.surface, paddingHorizontal: SPACING.lg, ...SHADOW.l1 },
  searchInput: { flex: 1, fontSize: 15, color: S.ink, textAlign: "right", writingDirection: "rtl", paddingVertical: SPACING.sm },
});
