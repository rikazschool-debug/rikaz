import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Bell, MessagesSquare, PartyPopper, Users, type LucideIcon } from "lucide-react-native";
import { AppText, Button } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { IconTileBox, ListRow, openSection, Panel, ScreenTitle, SegmentTabs, studentStyles } from "../../components/StudentKit";
import type { SectionKey } from "../../lib/sections";
import { COLORS, SPACING } from "../../theme/tokens";

type Tab = "chats" | "notifications" | "events";

const TABS: Record<Tab, { icon: LucideIcon; title: string; body: string; action: string; key: SectionKey }> = {
  chats: { icon: MessagesSquare, title: "محادثاتك مع المعلمين", body: "تواصل مع معلميك وتابع الرسائل الجديدة.", action: "فتح المحادثات", key: "communication" },
  notifications: { icon: Bell, title: "الإشعارات", body: "تنبيهات الواجبات والحصص وأخبار المدرسة.", action: "فتح الإشعارات", key: "notifications" },
  events: { icon: PartyPopper, title: "الأنشطة والفعاليات", body: "فعاليات مدرستك وأنشطتها القادمة.", action: "فتح الفعاليات", key: "events" },
};

export const StudentComm: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("chats");
  const c = TABS[tab];
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow="التواصل والمحادثات" title="رسائلك" />
      <SegmentTabs label="التواصل" value={tab} onChange={setTab} items={[{ key: "chats", label: "المحادثات" }, { key: "notifications", label: "الإشعارات" }, { key: "events", label: "الفعاليات" }]} />
      <FadeIn key={tab}>
        <Panel style={styles.panel}>
          <View style={styles.hero}>
            <IconTileBox icon={c.icon} size={56} />
            <AppText variant="headline" weight="extrabold" align="center">{c.title}</AppText>
            <AppText variant="caption" color={COLORS.mutedForeground} align="center">{c.body}</AppText>
          </View>
          <Button title={c.action} onPress={() => openSection(c.key)} />
        </Panel>
      </FadeIn>
      <Panel>
        <ListRow first icon={MessagesSquare} title="المحادثات" subtitle="معلموك ومجموعات صفك" web onPress={() => openSection("communication")} />
        <ListRow icon={Users} title="مجموعات الصف" subtitle="نقاشات الصف والإعلانات" web onPress={() => openSection("communication")} />
        <ListRow icon={Bell} title="الإشعارات" subtitle="كل التنبيهات في مكان واحد" web onPress={() => openSection("notifications")} />
      </Panel>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  panel: { paddingVertical: SPACING.xl, gap: SPACING.lg },
  hero: { alignItems: "center", gap: SPACING.xs },
});
