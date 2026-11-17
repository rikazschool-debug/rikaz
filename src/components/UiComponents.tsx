import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Platform,
} from "react-native";
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  ACCESSIBILITY,
  SHADOWS,
} from "../theme/tokens";

// Re-export colors for backwards compatibility
export { COLORS };

/* -------------------------------------------------------------------------- */
/*                                   BUTTON                                   */
/* -------------------------------------------------------------------------- */

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const isInteractive = !disabled && !loading;

  const minHeight =
    size === "sm" ? 40 : size === "lg" ? 54 : ACCESSIBILITY.minTouchTarget;

  return (
    <TouchableOpacity
      onPress={isInteractive ? onPress : undefined}
      activeOpacity={0.8}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      hitSlop={ACCESSIBILITY.standardHitSlop}
      style={[
        styles.buttonBase,
        { minHeight },
        styles[`btnVariant_${variant}`],
        size === "sm" && styles.btnSize_sm,
        size === "lg" && styles.btnSize_lg,
        fullWidth && styles.fullWidth,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "destructive"
              ? COLORS.primaryForeground
              : COLORS.primary
          }
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              styles[`btnText_${variant}`],
              size === "sm" && styles.btnTextSize_sm,
              size === "lg" && styles.btnTextSize_lg,
              disabled && styles.btnTextDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    INPUT                                   */
/* -------------------------------------------------------------------------- */

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  onClear?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  containerStyle,
  value,
  onClear,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          !!error && styles.inputContainerError,
        ]}
      >
        {icon && <View style={styles.inputIconContainer}>{icon}</View>}
        <TextInput
          style={[
            styles.textInput,
            // Numbers or English codes format LTR for readability
            props.inputMode === "numeric" || props.secureTextEntry
              ? styles.inputLtr
              : styles.inputRtl,
            style,
          ]}
          placeholderTextColor={COLORS.mutedForeground}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={COLORS.primary}
          {...props}
        />
        {onClear && value && value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={ACCESSIBILITY.standardHitSlop}
            style={styles.clearBtn}
            accessibilityLabel="مسح الحقل"
          >
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText} role="alert">
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                              SEGMENTED TABS                                */
/* -------------------------------------------------------------------------- */

export interface TabOption<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeKey: T;
  onSelect: (key: T) => void;
}

export const SegmentedTabs = <T extends string>({
  options,
  activeKey,
  onSelect,
}: SegmentedTabsProps<T>) => {
  return (
    <View style={styles.tabsContainer} role="tablist">
      {options.map((opt) => {
        const isActive = activeKey === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            role="tab"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.7}
            onPress={() => onSelect(opt.key)}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
          >
            {opt.icon && (
              <View
                style={[
                  styles.tabIconWrapper,
                  isActive && styles.tabIconWrapperActive,
                ]}
              >
                {opt.icon}
              </View>
            )}
            <Text
              style={[
                styles.tabText,
                isActive ? styles.tabTextActive : styles.tabTextInactive,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    CARD                                    */
/* -------------------------------------------------------------------------- */

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "accent";
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = "default",
}) => {
  return (
    <View
      style={[
        styles.cardBase,
        variant === "elevated" && styles.cardElevated,
        variant === "accent" && styles.cardAccent,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    BADGE                                   */
/* -------------------------------------------------------------------------- */

export interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "guardian" | "student" | "staff";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  size = "md",
}) => {
  return (
    <View
      style={[
        styles.badgeBase,
        styles[`badge_${variant}`],
        size === "sm" && styles.badgeSize_sm,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          styles[`badgeText_${variant}`],
          size === "sm" && styles.badgeText_sm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                                NOTICE BANNER                               */
/* -------------------------------------------------------------------------- */

export interface NoticeBannerProps {
  message: string;
  variant?: "info" | "warning" | "error" | "success";
  icon?: React.ReactNode;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  message,
  variant = "info",
  icon,
}) => {
  return (
    <View style={[styles.bannerContainer, styles[`banner_${variant}`]]}>
      {icon && <View style={styles.bannerIcon}>{icon}</View>}
      <Text style={[styles.bannerText, styles[`bannerText_${variant}`]]}>
        {message}
      </Text>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  // Buttons
  buttonBase: {
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    flexDirection: "row-reverse",
  },
  buttonContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  buttonIcon: {
    marginLeft: SPACING.xs,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: "700",
    textAlign: "center",
  },
  fullWidth: {
    width: "100%",
  },
  btnSize_sm: {
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  btnSize_lg: {
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  btnTextSize_sm: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  btnTextSize_lg: {
    fontSize: TYPOGRAPHY.sizes.lg,
  },
  btnVariant_primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  btnText_primary: {
    color: COLORS.primaryForeground,
  },
  btnVariant_secondary: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  btnText_secondary: {
    color: COLORS.secondaryForeground,
  },
  btnVariant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  btnText_outline: {
    color: COLORS.foreground,
  },
  btnVariant_ghost: {
    backgroundColor: "transparent",
  },
  btnText_ghost: {
    color: COLORS.primary,
  },
  btnVariant_destructive: {
    backgroundColor: COLORS.destructive,
  },
  btnText_destructive: {
    color: COLORS.destructiveForeground,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnTextDisabled: {
    color: COLORS.mutedForeground,
  },

  // Inputs
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    minHeight: ACCESSIBILITY.minTouchTarget,
    paddingHorizontal: SPACING.md,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  inputContainerError: {
    borderColor: COLORS.destructive,
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    color: COLORS.foreground,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  inputRtl: {
    textAlign: "right",
  },
  inputLtr: {
    textAlign: "left",
    writingDirection: "ltr",
  },
  inputIconContainer: {
    marginLeft: SPACING.sm,
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  clearBtnText: {
    fontSize: 20,
    color: COLORS.mutedForeground,
    fontWeight: "600",
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.destructive,
    marginTop: 4,
    textAlign: "right",
    fontWeight: "600",
  },
  helperText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    marginTop: 4,
    textAlign: "right",
  },

  // Segmented Tabs
  tabsContainer: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    minHeight: ACCESSIBILITY.minTouchTarget,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
  },
  tabIconWrapper: {
    opacity: 0.7,
  },
  tabIconWrapperActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: "700",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabTextInactive: {
    color: COLORS.mutedForeground,
  },

  // Cards
  cardBase: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardElevated: {
    ...SHADOWS.md,
  },
  cardAccent: {
    borderRightWidth: 4,
    borderRightColor: COLORS.primary,
  },

  // Badges
  badgeBase: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  badgeSize_sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: "700",
  },
  badgeText_sm: {
    fontSize: 10,
  },
  badge_primary: {
    backgroundColor: COLORS.primaryLight,
  },
  badgeText_primary: {
    color: COLORS.primaryDark,
  },
  badge_secondary: {
    backgroundColor: COLORS.secondary,
  },
  badgeText_secondary: {
    color: COLORS.secondaryForeground,
  },
  badge_success: {
    backgroundColor: COLORS.successLight,
  },
  badgeText_success: {
    color: COLORS.success,
  },
  badge_warning: {
    backgroundColor: COLORS.warningLight,
  },
  badgeText_warning: {
    color: COLORS.warning,
  },
  badge_guardian: {
    backgroundColor: COLORS.roleGuardianBg,
  },
  badgeText_guardian: {
    color: COLORS.roleGuardian,
  },
  badge_student: {
    backgroundColor: COLORS.roleStudentBg,
  },
  badgeText_student: {
    color: COLORS.roleStudent,
  },
  badge_staff: {
    backgroundColor: COLORS.roleStaffBg,
  },
  badgeText_staff: {
    color: COLORS.roleStaff,
  },

  // Notice Banner
  bannerContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  bannerIcon: {
    marginLeft: SPACING.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 18,
    textAlign: "right",
  },
  banner_info: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  bannerText_info: {
    color: COLORS.secondaryForeground,
  },
  banner_warning: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  bannerText_warning: {
    color: COLORS.warning,
  },
  banner_error: {
    backgroundColor: COLORS.destructiveLight,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  bannerText_error: {
    color: COLORS.destructive,
  },
  banner_success: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  bannerText_success: {
    color: COLORS.success,
  },
});
