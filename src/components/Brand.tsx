import React from "react";
import { StyleSheet, View } from "react-native";
import { RikazLogo } from "./RikazLogo";
import { AppText } from "./ui";
import { COLORS, SPACING } from "../theme/tokens";

/** الشعار مع الاسم والشعار اللفظي كما في المنصة: «ركاز | مدارس تُدار بذكاء» */
export const Brand: React.FC<{ light?: boolean; size?: number; tagline?: boolean }> = ({ light, size = 40, tagline = true }) => (
  <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="ركاز، مدارس تُدار بذكاء">
    <RikazLogo size={size} light={light} />
    <View>
      <AppText variant="headline" weight="extrabold" color={light ? COLORS.primaryForeground : COLORS.foreground} style={{ fontSize: size * 0.55, lineHeight: size * 0.8 }}>
        ركاز
      </AppText>
      {tagline ? (
        <AppText variant="micro" color={light ? COLORS.onPrimaryMuted : COLORS.mutedForeground}>
          مدارس تُدار بذكاء
        </AppText>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
});
