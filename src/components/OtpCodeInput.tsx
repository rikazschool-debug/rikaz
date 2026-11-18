import React, { forwardRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "./ui";
import { LOGIN_COLORS, RADIUS, SPACING } from "../theme/tokens";

interface OtpCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
}

/** ست خانات مرئية مع حقل واحد للتعبئة التلقائية والنسخ واللصق. */
export const OtpCodeInput = forwardRef<TextInput, OtpCodeInputProps>(({ value, onChangeText }, ref) => {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, 5);

  return (
    <View style={styles.field}>
      <AppText variant="label" color={LOGIN_COLORS.foreground}>
        رمز التحقق
      </AppText>
      <View style={styles.track}>
        <View
          style={styles.cells}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: 6 }, (_, index) => {
            const digit = value[index];
            const active = index === activeIndex && (focused || value.length < 6);
            return (
              <View
                key={index}
                style={[
                  styles.cell,
                  digit ? styles.filledCell : null,
                  active ? styles.activeCell : null,
                ]}
              >
                {digit ? (
                  <AppText variant="headline" weight="bold" color={LOGIN_COLORS.primary}>
                    {digit}
                  </AppText>
                ) : active ? (
                  <View style={styles.activeDot} />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            );
          })}
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="رمز التحقق"
          accessibilityHint="أدخل رمز واتساب المكوّن من ستة أرقام"
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          caretHidden
          selectionColor="transparent"
          style={styles.inputOverlay}
        />
      </View>
    </View>
  );
});

OtpCodeInput.displayName = "OtpCodeInput";

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  track: { position: "relative", minHeight: 56 },
  cells: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    writingDirection: "ltr",
  },
  cell: {
    flex: 1,
    minWidth: 38,
    maxWidth: 48,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: LOGIN_COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: LOGIN_COLORS.surface,
  },
  filledCell: { backgroundColor: LOGIN_COLORS.surfaceLow },
  activeCell: {
    borderColor: LOGIN_COLORS.secondary,
    shadowColor: LOGIN_COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 1,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: LOGIN_COLORS.secondary },
  emptyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: LOGIN_COLORS.border },
  inputOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 56,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "transparent",
    fontSize: 1,
    opacity: 0.02,
    textAlign: "center",
    writingDirection: "ltr",
  },
});
