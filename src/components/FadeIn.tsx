import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { enterDuration, MOTION } from "../lib/motion";

/** ظهور هادئ للمحتوى الجديد (شفافية وإزاحة خفيفة)، ويظهر فورًا عند تقليل الحركة. */
export const FadeIn: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = enterDuration(reduced);
    if (duration === 0) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [progress, reduced]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [MOTION.enterOffset, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
};
