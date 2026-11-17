import React from "react";
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
} from "react-native";

export const COLORS = {
  primary: "#1E3A8A",      // Rikaz Royal Blue
  primaryDark: "#172554",
  accent: "#2563EB",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  destructive: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  inputBg: "#F1F5F9",
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}) => {
  const isDisabled = disabled || loading;

  const getBtnStyle = (): ViewStyle => {
    switch (variant) {
      case "secondary":
        return { backgroundColor: "#E2E8F0" };
      case "outline":
        return { backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.border };
      case "ghost":
        return { backgroundColor: "transparent" };
      case "destructive":
        return { backgroundColor: COLORS.destructive };
      case "primary":
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case "secondary":
        return { color: COLORS.text };
      case "outline":
      case "ghost":
        return { color: COLORS.primary };
      case "destructive":
      case "primary":
      default:
        return { color: "#FFFFFF" };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        getBtnStyle(),
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? COLORS.primary : "#FFF"} size="small" />
      ) : (
        <Text style={[styles.buttonText, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

interface AlertBannerProps {
  message: string;
  type?: "error" | "warning" | "success" | "info";
  style?: ViewStyle;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  type = "error",
  style,
}) => {
  const getBg = () => {
    switch (type) {
      case "warning": return "#FEF3C7";
      case "success": return "#D1FAE5";
      case "info": return "#E0F2FE";
      case "error":
      default: return "#FEE2E2";
    }
  };

  const getTextCol = () => {
    switch (type) {
      case "warning": return "#92400E";
      case "success": return "#065F46";
      case "info": return "#075985";
      case "error":
      default: return "#991B1B";
    }
  };

  return (
    <View style={[styles.alert, { backgroundColor: getBg() }, style]}>
      <Text style={[styles.alertText, { color: getTextCol() }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  inputContainer: {
    marginVertical: 8,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    textAlign: "right", // Arabic RTL
  },
  input: {
    height: 50,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    textAlign: "right", // Arabic RTL
  },
  inputError: {
    borderColor: COLORS.destructive,
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
    marginTop: 4,
    textAlign: "right",
  },
  alert: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  alertText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
  },
});
