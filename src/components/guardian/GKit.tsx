import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { AppText } from "../ui";
import { SWell } from "../student/SKit";
import { G } from "../../theme/guardian";
import { SPACING } from "../../theme/tokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
export function GRow({ icon, title, subtitle, onPress, first, children }: { icon: LucideIcon; title: string; subtitle?: string; onPress?: () => void; first?: boolean; children?: React.ReactNode }) {
 const reduced = useReducedMotion();
 const body = <><SWell icon={icon} size={44} round/><View style={s.flex}><AppText variant="bodyStrong" weight="bold" color={G.ink}>{title}</AppText>{subtitle ? <AppText variant="caption" color={G.text2}>{subtitle}</AppText> : null}</View>{children}{onPress ? <ChevronLeft size={18} color={G.muted}/> : null}</>;
 return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({pressed})=>[s.row,!first&&s.border,pressed&&s.pressed,{transform:[{scale:pressScale(pressed,reduced)}]}]}>{body}</Pressable> : <View style={[s.row,!first&&s.border]}>{body}</View>;
}
const s=StyleSheet.create({flex:{flex:1},row:{flexDirection:"row",alignItems:"center",gap:SPACING.md,paddingVertical:SPACING.lg,minHeight:72},border:{borderTopWidth:1,borderTopColor:G.border},pressed:{backgroundColor:G.mint}});
