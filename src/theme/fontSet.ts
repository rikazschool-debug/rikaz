import { createContext, useContext } from "react";
import { FONTS } from "./tokens";

/** مجموعة الخطوط النشطة: Cairo افتراضيًا، وReadex Pro داخل صفحات الطالب (تصميم الطالب المعتمد). */
export type FontSet = Record<keyof typeof FONTS, string>;
export const READEX: FontSet = {
  regular: "ReadexPro_400Regular",
  medium: "ReadexPro_500Medium",
  semibold: "ReadexPro_600SemiBold",
  bold: "ReadexPro_700Bold",
  extrabold: "ReadexPro_700Bold",
};
export const FontSetContext = createContext<FontSet>(FONTS);
export const useFontSet = () => useContext(FontSetContext);
