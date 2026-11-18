import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FadeIn } from "../../components/FadeIn";
import { ScreenTitle, SegmentTabs, studentStyles } from "../../components/StudentKit";
import type { Conversation } from "../../api/family";
import { ConversationList } from "../shared/Conversations";
import { NotificationsList } from "../shared/Notifications";
import { Events } from "../shared/Events";
import { SPACING } from "../../theme/tokens";

type Tab = "chats" | "notifications" | "events";

/** التواصل: محادثاتك ومجموعاتك، الإشعارات، الفعاليات — كلها من المنصة داخل التطبيق. */
export const StudentComm: React.FC<{ onOpen: (c: Conversation) => void; onNew: () => void; initial?: Tab }> = ({ onOpen, onNew, initial = "chats" }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <ScrollView style={studentStyles.screen} keyboardShouldPersistTaps="handled" contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow="التواصل والمحادثات" title="رسائلك" />
      <SegmentTabs label="التواصل" value={tab} onChange={setTab} items={[{ key: "chats", label: "المحادثات" }, { key: "notifications", label: "الإشعارات" }, { key: "events", label: "الفعاليات" }]} />
      <FadeIn key={tab}>
        {tab === "chats" ? <ConversationList role="student" onOpen={onOpen} onNew={onNew} /> : tab === "notifications" ? <NotificationsList /> : <Events embedded />}
      </FadeIn>
    </ScrollView>
  );
};
