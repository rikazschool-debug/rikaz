import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, GraduationCap, School, Users, type LucideIcon } from "lucide-react-native";
import { AppText } from "./ui";
import { LOGIN_COLORS, RADIUS, SPACING, TOUCH } from "../theme/tokens";

export type AccountEntry = "student" | "guardian" | "staff";

const OPTIONS: { key: AccountEntry; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "staff", label: "الكادر", hint: "رمز واتساب", icon: School },
  { key: "guardian", label: "ولي أمر", hint: "رمز واتساب", icon: Users },
  { key: "student", label: "طالب", hint: "رقم الهوية", icon: GraduationCap },
];

export const ENTRY_CONTENT: Record<AccountEntry, { title: string; description: string }> = {
  student: { title: "الدخول إلى حساب الطالب", description: "أدخل رقم الهوية أو الإقامة ورقم الطالب في C‑Smart" },
  guardian: { title: "الدخول إلى حساب ولي الأمر", description: "نرسل رمز تحقق عبر واتساب إلى الجوال المسجل لدى المدرسة" },
  staff: { title: "الدخول إلى حساب الكادر التعليمي", description: "نرسل رمز تحقق عبر واتساب إلى الجوال المسجل لدى المدرسة" },
};

export const ENTRY_ICON: Record<AccountEntry, LucideIcon> = { student: GraduationCap, guardian: Users, staff: School };

/** بطاقات اختيار نوع الحساب: اختيار البطاقة لا يمنح صلاحية، فالأدوار تأتي من عضويات الخادم. */
export function AccountEntrySelector({ value, onChange }: { value: AccountEntry; onChange: (value: AccountEntry) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="نوع الحساب">
      {OPTIONS.map((o) => {
        const on = o.key === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label}، ${o.hint}`}
            style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && !on && styles.cardPressed]}
          >
            {on ? (
              <View style={styles.check}>
                <Check size={12} color={LOGIN_COLORS.onPrimary} strokeWidth={3} />
              </View>
            ) : null}
            <View style={[styles.icon, on && styles.iconOn]}>
              <Icon size={22} color={on ? LOGIN_COLORS.onPrimary : LOGIN_COLORS.primary} strokeWidth={2} />
            </View>
            <AppText variant="label" align="center" color={on ? LOGIN_COLORS.primary : LOGIN_COLORS.foreground}>
              {o.label}
            </AppText>
            <AppText variant="micro" align="center" color={LOGIN_COLORS.mutedForeground}>
              {o.hint}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACING.sm },
  card: {
    flex: 1,
    minHeight: TOUCH.min * 2,
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: LOGIN_COLORS.border,
    backgroundColor: LOGIN_COLORS.surface,
  },
  cardOn: { borderColor: LOGIN_COLORS.primary, backgroundColor: LOGIN_COLORS.primaryTint },
  cardPressed: { backgroundColor: LOGIN_COLORS.surfaceLow },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: LOGIN_COLORS.primaryTint },
  iconOn: { backgroundColor: LOGIN_COLORS.primary },
  check: { position: "absolute", top: SPACING.sm, left: SPACING.sm, width: 20, height: 20, borderRadius: 10, backgroundColor: LOGIN_COLORS.primary, alignItems: "center", justifyContent: "center" },
});
