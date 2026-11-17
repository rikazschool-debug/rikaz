import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RikazLogo } from "./RikazLogo";
import { COLORS, TYPOGRAPHY, SPACING } from "../theme/tokens";

interface BrandHeaderProps {
  light?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  light = false,
  showTagline = true,
  size = "md",
}) => {
  const logoSize = size === "sm" ? 32 : size === "lg" ? 48 : 38;
  const titleSize = size === "sm" ? 18 : size === "lg" ? 24 : 20;

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <RikazLogo size={logoSize} light={light} />
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: titleSize,
                  color: light ? COLORS.primaryForeground : COLORS.foreground,
                },
              ]}
            >
              ركاز
            </Text>
            {showTagline && (
              <Text
                style={[
                  styles.tagline,
                  {
                    color: light
                      ? "rgba(251, 248, 241, 0.75)"
                      : COLORS.mutedForeground,
                  },
                ]}
              >
                | مدارس تُدار بذكاء
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },
  brandRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
  },
  textColumn: {
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: SPACING.xs,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: "500",
  },
});
