import React, { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from "lucide-react-native";
import { COLORS, FONTS, FontWeightName, RADIUS, SHADOWS, SPACING, TOUCH, TYPE, TypeVariant } from "../theme/tokens";

/* ------------------------------------------------------------------ النص */

type AppTextProps = TextProps & {
  variant?: TypeVariant;
  weight?: FontWeightName;
  color?: string;
  align?: TextStyle["textAlign"];
};

export const AppText: React.FC<AppTextProps> = ({ variant = "body", weight, color = COLORS.foreground, align, style, ...rest }) => {
  const t = TYPE[variant];
  return (
    <Text
      style={[{ fontFamily: FONTS[weight ?? t.weight], fontSize: t.fontSize, lineHeight: t.lineHeight, color, textAlign: align, writingDirection: "rtl" }, style]}
      {...rest}
    />
  );
};

/* ------------------------------------------------------------------ الأزرار */

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const BTN: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: COLORS.primary, pressed: COLORS.primaryPressed, fg: COLORS.primaryForeground },
  secondary: { bg: COLORS.card, pressed: COLORS.muted, fg: COLORS.primary, border: COLORS.border },
  ghost: { bg: "transparent", pressed: COLORS.primaryTint, fg: COLORS.primary },
  destructive: { bg: COLORS.destructiveTint, pressed: "#F8DCDA", fg: COLORS.destructive },
};

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = "primary", loading, disabled, icon: Icon, style, accessibilityHint }) => {
  const v = BTN[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      hitSlop={TOUCH.hitSlop}
      android_ripple={variant === "primary" ? { color: "rgba(255,255,255,0.18)" } : { color: COLORS.primaryTint }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border ?? "transparent", borderWidth: v.border ? 1 : 0 },
        off && styles.btnOff,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.btnInner}>
          {Icon ? <Icon size={20} color={v.fg} strokeWidth={2} /> : null}
          <Text style={[styles.btnText, { color: v.fg }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

/* ------------------------------------------------------------------ الحقول */

interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  error?: string | null;
  /** للأرقام والرموز والبريد: إدخال من اليسار لليمين */
  ltr?: boolean;
  large?: boolean;
}

export const TextField = forwardRef<TextInput, FieldProps>(({ label, hint, error, ltr, large, editable = true, onFocus, onBlur, ...rest }, ref) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? COLORS.destructive : focused ? COLORS.primary : COLORS.border;
  return (
    <View style={styles.field}>
      <AppText variant="label" color={COLORS.foreground}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        editable={editable}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor="#8A9697"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          large && styles.inputLarge,
          { borderColor, borderWidth: focused || error ? 1.5 : 1 },
          !editable && styles.inputDisabled,
          ltr ? styles.ltr : styles.rtl,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={COLORS.destructive} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={COLORS.mutedForeground}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});
TextField.displayName = "TextField";

/* ------------------------------------------------------------------ البطاقات والتنبيهات */

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; raised?: boolean }> = ({ children, style, raised }) => (
  <View style={[styles.card, raised ? SHADOWS.raised : SHADOWS.card, style]}>{children}</View>
);

type NoticeTone = "info" | "error" | "success" | "warning";
const TONE: Record<NoticeTone, { bg: string; fg: string; icon: LucideIcon }> = {
  info: { bg: COLORS.primaryTint, fg: COLORS.secondaryForeground, icon: Info },
  error: { bg: COLORS.destructiveTint, fg: "#9E1F1C", icon: AlertCircle },
  success: { bg: COLORS.successTint, fg: "#17603A", icon: CheckCircle2 },
  warning: { bg: COLORS.warningTint, fg: COLORS.warningForeground, icon: Info },
};

export const Notice: React.FC<{ tone?: NoticeTone; title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ tone = "info", title, children, style }) => {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <View
      style={[styles.notice, { backgroundColor: t.bg }, style]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
    >
      <Icon size={20} color={t.fg} style={styles.noticeIcon} />
      <View style={styles.flex}>
        {title ? (
          <AppText variant="label" color={t.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" color={t.fg}>
          {children}
        </AppText>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ مبدّل الفئات */

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.key === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={[styles.segmentItem, on && styles.segmentOn]}
          >
            <Icon size={22} color={on ? COLORS.primary : COLORS.mutedForeground} strokeWidth={on ? 2.2 : 1.8} />
            <Text
              style={[styles.segmentText, { color: on ? COLORS.primary : COLORS.mutedForeground, fontFamily: on ? FONTS.bold : FONTS.medium }]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ عناصر مساعدة */

export const IconTile: React.FC<{ icon: LucideIcon; tone?: "primary" | "accent" | "muted"; size?: number }> = ({ icon: Icon, tone = "primary", size = 48 }) => {
  const bg = tone === "primary" ? COLORS.primaryTint : tone === "accent" ? COLORS.secondary : COLORS.muted;
  const fg = tone === "primary" ? COLORS.primary : tone === "accent" ? "#8A5A12" : COLORS.mutedForeground;
  return (
    <View style={[styles.iconTile, { width: size, height: size, backgroundColor: bg }]}>
      <Icon size={Math.round(size * 0.5)} color={fg} strokeWidth={2} />
    </View>
  );
};

export const LinkButton: React.FC<{ title: string; onPress: () => void; disabled?: boolean; color?: string }> = ({ title, onPress, disabled, color = COLORS.primary }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
    <AppText variant="label" color={disabled ? COLORS.mutedForeground : color}>
      {title}
    </AppText>
  </Pressable>
);

export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => <View style={[styles.divider, style]} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  btn: {
    minHeight: TOUCH.min + 4,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  btnOff: { opacity: 0.5 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  btnText: { fontFamily: FONTS.bold, fontSize: 16, lineHeight: 24, textAlign: "center" },
  field: { gap: SPACING.xs + 2 },
  input: {
    minHeight: TOUCH.min + 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.medium,
    fontSize: 17,
    color: COLORS.foreground,
  },
  inputLarge: { minHeight: 60, fontSize: 26, letterSpacing: 0, fontFamily: FONTS.bold, textAlign: "center" },
  inputDisabled: { backgroundColor: COLORS.muted, color: COLORS.mutedForeground },
  ltr: { writingDirection: "ltr" },
  rtl: { writingDirection: "rtl" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  noticeIcon: { marginTop: 2 },
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs + 2,
    gap: SPACING.xs,
  },
  segmentItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    gap: 2,
  },
  segmentOn: { backgroundColor: COLORS.primaryTint, ...SHADOWS.card },
  segmentText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  iconTile: { borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  link: { minHeight: TOUCH.min, justifyContent: "center", paddingHorizontal: SPACING.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
});
