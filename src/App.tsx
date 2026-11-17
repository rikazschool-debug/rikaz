import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, I18nManager } from "react-native";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";

// Force RTL layout
try {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
} catch (e) {
  console.warn("RTL force notice:", e);
}

const NavigationRoot: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return session ? <HomeScreen /> : <LoginScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <NavigationRoot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});
