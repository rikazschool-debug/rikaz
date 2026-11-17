import React, { useId } from "react";
import Svg, { Defs, Mask, Rect, Path } from "react-native-svg";
import { COLORS } from "../theme/tokens";

interface RikazLogoProps {
  size?: number;
  light?: boolean;
  color?: string;
}

/**
 * شعار ركاز الأصلي المنقول حرفياً من src/components/logo.tsx بالمنصة
 * يعرض بلاطة هندسية منحنية الحواف يقتطع منها حرف R بأسلوب معماري
 */
export const RikazLogo: React.FC<RikazLogoProps> = ({
  size = 40,
  light = false,
  color,
}) => {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `rk_mask_${rawId}`;
  const fillColor = color || (light ? COLORS.primaryForeground : COLORS.primary);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel="شعار ركاز"
    >
      <Defs>
        <Mask id={maskId}>
          {/* خلفية القناع بيضاء لإظهار البلاطة */}
          <Rect width="100" height="100" fill="#FFFFFF" />
          {/* قوس حرف R الداخلي المقتطع */}
          <Path
            d="M-2 27 H62 A12.5 12.5 0 0 1 62 52 H-2"
            fill="none"
            stroke="#000000"
            strokeWidth="9"
          />
          {/* خط ساق حرف R المائل المقتطع */}
          <Path
            d="M56 52 L94 100"
            stroke="#000000"
            strokeWidth="9.5"
          />
        </Mask>
      </Defs>

      {/* البلاطة الأساسية المنحنية مع تطبيق القناع */}
      <Rect
        x="4"
        y="6"
        width="92"
        height="88"
        rx="16"
        fill={fillColor}
        mask={`url(#${maskId})`}
      />
    </Svg>
  );
};
