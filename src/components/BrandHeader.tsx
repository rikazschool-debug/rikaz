import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { COLORS } from "./UiComponents";

export const BrandHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>منصة رِكاز</Text>
      <Text style={styles.subtitle}>النظام الموحد لإدارة المدارس</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 18,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primaryDark,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
});
