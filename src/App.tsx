import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, I18nManager } from "react-native";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ChooseRoleScreen } from "./screens/ChooseRoleScreen";
import { RikazLogo } from "./components/RikazLogo";
import { COLORS, SPACING } from "./theme/tokens";

// فرض الاتجاه العربي RTL لواجهة التطبيق
try {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
} catch (e) {
  console.warn("RTL force notice:", e);
}

const NavigationRoot: React.FC = () => {
  const { session, loading, memberships, activeContext } = useAuth();
  const [showRolePicker, setShowRolePicker] = useState(false);

  // شاشة الانتظار أثناء استرجاع الجلسة المشفرة من expo-secure-store
  if (loading) {
    return (
      <View style={styles.center}>
        <RikazLogo size={56} />
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    );
  }

  // إذا لم يكن المستخدم مسجلاً
  if (!session) {
    return <LoginScreen />;
  }

  // إذا طلب المستخدم شاشة اختيار الدور، أو كان لديه أكثر من دور ولم يحدد سياقاً بعد
  if (showRolePicker || (memberships.length > 1 && !activeContext)) {
    return (
      <ChooseRoleScreen
        onSelected={() => setShowRolePicker(false)}
      />
    );
  }

  return (
    <HomeScreen
      onOpenContextPicker={() => setShowRolePicker(true)}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <NavigationRoot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
