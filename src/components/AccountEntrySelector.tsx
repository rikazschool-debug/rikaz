import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ClipboardList, GraduationCap, UserRound, type LucideIcon } from "lucide-react-native";
import { AppText } from "./ui";
import { LOGIN_COLORS, RADIUS, SPACING, TOUCH } from "../theme/tokens";

export type AccountEntry = "student" | "guardian" | "staff";

const OPTIONS: { key: AccountEntry; label: string; icon: LucideIcon }[] = [
  { key: "staff", label: "الكادر التعليمي", icon: ClipboardList },
  { key: "guardian", label: "ولي الأمر", icon: UserRound },
  { key: "student", label: "الطالب", icon: GraduationCap },
];

export const ENTRY_CONTENT: Record<AccountEntry, { eyebrow: string; title: string; description: string }> = {
  student: { eyebrow: "حساب الطالب", title: "تسجيل دخول الطالب", description: "أدخل بياناتك المسجلة في المدرسة للمتابعة." },
  guardian: { eyebrow: "حساب ولي الأمر", title: "دخول ولي الأمر", description: "تابع رحلة أبنائك التعليمية من مكان واحد." },
  staff: { eyebrow: "حساب الكادر التعليمي", title: "دخول الكادر التعليمي", description: "أهلاً بك، سجّل دخولك إلى حسابك في المدرسة." },
};

export const ENTRY_ICON: Record<AccountEntry, LucideIcon> = { student: GraduationCap, guardian: UserRound, staff: ClipboardList };

/** تبويبات نوع الحساب (أيقونة + اسم، والمحدد بخط سفلي): الاختيار لا يمنح صلاحية، فالأدوار تأتي من عضويات الخادم. */
export function AccountEntrySelector({ value, onChange }: { value: AccountEntry; onChange: (value: AccountEntry) => void }) {
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="نوع الحساب">
      {OPTIONS.map((o) => {
        const on = o.key === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            hitSlop={TOUCH.hitSlop}
            style={({ pressed }) => [styles.tab, pressed && !on && styles.tabPressed]}
          >
            <Icon size={20} color={on ? LOGIN_COLORS.primary : LOGIN_COLORS.mutedForeground} strokeWidth={on ? 2.2 : 1.8} />
            <AppText variant="label" weight={on ? "bold" : "medium"} align="center" color={on ? LOGIN_COLORS.primary : LOGIN_COLORS.mutedForeground} numberOfLines={1}>
              {o.label}
            </AppText>
            <View style={[styles.underline, on && styles.underlineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LOGIN_COLORS.border },
  tab: { flex: 1, minHeight: TOUCH.min + SPACING.lg, alignItems: "center", justifyContent: "flex-end", gap: SPACING.xs, paddingTop: SPACING.sm },
  tabPressed: { backgroundColor: LOGIN_COLORS.surfaceLow, borderTopLeftRadius: RADIUS.sm, borderTopRightRadius: RADIUS.sm },
  underline: { alignSelf: "stretch", height: 3, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: "transparent", marginBottom: -1 },
  underlineOn: { backgroundColor: LOGIN_COLORS.primary },
});
