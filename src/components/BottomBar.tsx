import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { pressScale } from "../lib/motion";
import { useFontSet } from "../theme/fontSet";
import { COLORS, FONT_SCALE, SPACING } from "../theme/tokens";

export interface BottomItem<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  /** زر الرئيسية البارز في المنتصف */
  center?: boolean;
}

/** الشريط السفلي المعتمد: أبيض، والرئيسية زر بارز في المنتصف. الترتيب يبدأ من اليمين. */
/** ألوان اختيارية للشريط (صفحات الطالب تستخدم لوحة تصميمها)؛ pill = خلفية خفيفة خلف أيقونة العنصر النشط. */
export type BarPalette = { active: string; inactive: string; pill?: string; surface?: string; border?: string };

export function BottomBar<K extends string>({ items, value, onChange, palette }: { items: BottomItem<K>[]; value: K; onChange: (k: K) => void; palette?: BarPalette }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const F = useFontSet();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }, palette?.surface ? { backgroundColor: palette.surface } : null, palette?.border ? { borderTopColor: palette.border } : null]} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === value;
        const Icon = it.icon;
        const color = on ? palette?.active ?? COLORS.primary : palette?.inactive ?? COLORS.mutedForeground;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
            style={({ pressed }) => [styles.item, { transform: [{ scale: pressScale(pressed, reduced) }] }]}
          >
            {it.center ? (
              <View style={[styles.center, on ? styles.centerOn : styles.centerOff]}>
                <Icon size={24} color={on ? COLORS.primaryForeground : COLORS.primary} strokeWidth={2.2} />
              </View>
            ) : (
              <View style={[styles.iconWrap, on && palette?.pill ? { backgroundColor: palette.pill } : null]}>
                <Icon size={22} color={color} strokeWidth={on ? 2.3 : 1.8} />
              </View>
            )}
            <Text maxFontSizeMultiplier={FONT_SCALE.control} numberOfLines={1} style={[styles.label, { color, fontFamily: on ? F.extrabold : F.semibold }]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    shadowColor: COLORS.foreground,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 3, minHeight: 52, justifyContent: "flex-end" },
  center: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: COLORS.card, marginTop: -30 },
  centerOn: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  centerOff: { backgroundColor: COLORS.card, borderColor: COLORS.border, shadowColor: COLORS.foreground, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
  iconWrap: { minWidth: 52, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11.5, lineHeight: 17 },
});
