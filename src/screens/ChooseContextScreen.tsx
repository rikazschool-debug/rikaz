import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Briefcase, Building2, Check, ChevronLeft, GraduationCap, Users, X } from "lucide-react-native";
import { AppText, Button, IconTile, LinkButton, Notice } from "../components/ui";
import { Brand } from "../components/Brand";
import { useAuth } from "../hooks/useAuth";
import { AppContext } from "../api/types";
import { ACCOUNT_KIND_LABEL, accountKind, contextLabel } from "../lib/contexts";
import { COLORS, RADIUS, SHADOWS, SPACING, TOUCH } from "../theme/tokens";

interface Group {
  key: string;
  schoolName: string;
  orgName: string;
  items: AppContext[];
}

/** اختيار المدرسة والصفة: يظهر بعد الدخول لمن لديه أكثر من دور، ومن الرئيسية للتبديل */
export const ChooseContextScreen: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const { contexts, active, chooseContext, contextsLoading, contextsError, reloadContexts, signOut } = useAuth();
  const [pending, setPending] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const c of contexts) {
      const k = c.schoolId ?? `org:${c.orgId ?? c.key}`;
      const g = map.get(k) ?? { key: k, schoolName: c.schoolName, orgName: c.orgName, items: [] };
      g.items.push(c);
      map.set(k, g);
    }
    return [...map.values()];
  }, [contexts]);

  async function pick(c: AppContext) {
    setPending(c.key);
    try {
      await chooseContext(c.key);
      onClose?.();
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        {onClose ? (
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="إغلاق" hitSlop={TOUCH.hitSlop} style={styles.close}>
            <X size={24} color={COLORS.foreground} />
          </Pressable>
        ) : (
          <Brand size={32} tagline={false} />
        )}
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxxl }]}>
        <AppText variant="title">{onClose ? "تبديل المدرسة أو الصفة" : "اختر المدرسة والصفة"}</AppText>
        <AppText variant="body" color={COLORS.mutedForeground} style={styles.lead}>
          {onClose
            ? "تُعرض بيانات الصفة التي تختارها فقط، ويُمسح ما يخص الصفة السابقة."
            : "لديك أكثر من صفة. اختر الصفة التي تريد الدخول بها، ويمكنك التبديل لاحقًا من الرئيسية."}
        </AppText>

        {contextsLoading && contexts.length === 0 ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxxl }} />
        ) : contextsError ? (
          <View style={styles.stack}>
            <Notice tone="error">تعذّر تحميل صفاتك. تأكد من الاتصال ثم أعد المحاولة.</Notice>
            <Button title="إعادة المحاولة" variant="secondary" onPress={() => void reloadContexts()} />
          </View>
        ) : contexts.length === 0 ? (
          <View style={styles.stack}>
            <Notice tone="warning" title="لا توجد صفة نشطة">
              لا يرتبط حسابك حاليًا بأي مدرسة أو دور نشط. تواصل مع إدارة المدرسة.
            </Notice>
            <Button title="تسجيل الخروج" variant="secondary" onPress={() => void signOut()} />
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Building2 size={18} color={COLORS.mutedForeground} />
                <View style={styles.flex}>
                  <AppText variant="label" numberOfLines={2}>
                    {g.schoolName || "المدرسة"}
                  </AppText>
                  {g.orgName ? (
                    <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>
                      {g.orgName}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View style={styles.list}>
                {g.items.map((c, i) => {
                  const kind = accountKind(c.role);
                  const on = active?.key === c.key;
                  const Icon = kind === "guardian" ? Users : kind === "student" ? GraduationCap : Briefcase;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => void pick(c)}
                      disabled={pending !== null}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on, busy: pending === c.key }}
                      accessibilityLabel={`${contextLabel(c)}، ${ACCOUNT_KIND_LABEL[kind]}، ${g.schoolName}`}
                      android_ripple={{ color: COLORS.primaryTint }}
                      style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { backgroundColor: COLORS.muted }]}
                    >
                      <IconTile icon={Icon} tone={on ? "primary" : "muted"} size={44} />
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong" numberOfLines={2}>
                          {contextLabel(c)}
                        </AppText>
                        <AppText variant="caption" color={COLORS.mutedForeground}>
                          {ACCOUNT_KIND_LABEL[kind]}
                        </AppText>
                      </View>
                      {pending === c.key ? (
                        <ActivityIndicator color={COLORS.primary} />
                      ) : on ? (
                        <View style={styles.check}>
                          <Check size={16} color={COLORS.primaryForeground} strokeWidth={3} />
                        </View>
                      ) : (
                        <ChevronLeft size={20} color={COLORS.mutedForeground} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
        {!onClose && contexts.length > 0 ? <LinkButton title="تسجيل الخروج" color={COLORS.mutedForeground} onPress={() => void signOut()} /> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  top: { minHeight: 56, paddingHorizontal: SPACING.lg, flexDirection: "row", alignItems: "center" },
  close: { width: TOUCH.min, height: TOUCH.min, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.full },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.lg },
  lead: { marginTop: -SPACING.sm },
  stack: { gap: SPACING.md },
  group: { gap: SPACING.sm },
  groupHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  list: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden", ...SHADOWS.card },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, minHeight: 72 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
});
