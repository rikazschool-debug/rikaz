import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Archive, PenSquare } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { DataState } from "../../components/StudentKit";
import { SBadge, SChips, SCircleButton, SHeader, SScreen, SSearch, sStyles } from "../../components/student/SKit";
import { fetchConversations, inbox, KIND_LABEL, type Conversation } from "../../api/family";
import { NotificationsList } from "../shared/Notifications";
import { Events } from "../shared/Events";
import { useAuth } from "../../hooks/useAuth";
import { useLoad } from "../../hooks/useLoad";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { shortWhen } from "../../lib/studentDay";
import { R, S, SHADOW } from "../../theme/student";
import { SPACING } from "../../theme/tokens";

type Tab = "chats" | "notifications" | "events" | "archive";
const AVATAR = [
  { bg: "#B8F0E3", fg: S.primary }, { bg: "#DCE8FF", fg: "#1E3A8A" }, { bg: "#FFE2C2", fg: "#9A3412" }, { bg: "#E2E8F0", fg: S.ink },
];
const hash = (t: string) => [...t].reduce((a, c) => (a + c.charCodeAt(0)) % 997, 0);

/** يطابق البحث العنوان وآخر رسالة واسم الطالب. */
export function matchConversation(c: Conversation, q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  return [c.title, c.last_body, c.student_name].some((v) => (v ?? "").includes(t));
}

const ConvCard: React.FC<{ c: Conversation; onPress: () => void }> = ({ c, onPress }) => {
  const reduced = useReducedMotion();
  const title = c.title ?? "محادثة";
  const a = AVATAR[hash(title) % AVATAR.length];
  const unread = c.unread ?? 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}${unread ? `، ${unread} غير مقروءة` : ""}`}
      style={({ pressed }) => [st.card, unread > 0 && st.cardUnread, pressed && { backgroundColor: S.mint }, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
      <View style={[st.avatar, { backgroundColor: a.bg }]}>
        <AppText weight="bold" color={a.fg} style={st.avatarText}>{title.replace(/^أ\.\s*/, "").trim().charAt(0) || "؟"}</AppText>
      </View>
      <View style={sStyles.flex}>
        <View style={st.line}>
          <AppText variant="bodyStrong" weight="bold" color={S.ink} numberOfLines={1} style={st.shrink}>{title}</AppText>
          {c.last_at ? <AppText variant="micro" weight={unread ? "semibold" : "regular"} color={unread ? S.secondary : S.text2}>{shortWhen(c.last_at)}</AppText> : null}
        </View>
        <AppText variant="caption" color={unread ? S.ink : S.text2} weight={unread ? "medium" : "regular"} numberOfLines={1}>{c.last_body ?? "لا رسائل بعد"}</AppText>
        <View style={st.line}>
          <View style={st.titleWrap}>
            {KIND_LABEL[c.kind] ? <SBadge label={c.kind === "group" ? "مجموعة" : KIND_LABEL[c.kind]} tone={c.kind === "group" ? "muted" : "mint"} /> : null}
            <AppText variant="micro" color={S.muted} numberOfLines={1} style={st.shrink}>{c.student_name ?? (unread ? "رسائل جديدة" : "تمت القراءة")}</AppText>
          </View>
          {unread ? <View style={st.count}><AppText variant="micro" weight="bold" color={S.onPrimary}>{String(unread)}</AppText></View> : null}
        </View>
      </View>
    </Pressable>
  );
};

/** التواصل: المحادثات، الإشعارات، الفعاليات، والأرشيف — كلها من المنصة داخل التطبيق. */
export const StudentComm: React.FC<{ onOpen: (c: Conversation) => void; onNew: () => void; initial?: Tab }> = ({ onOpen, onNew, initial = "chats" }) => {
  const { active } = useAuth();
  const [tab, setTab] = useState<Tab>(initial);
  const [q, setQ] = useState("");
  const conv = useLoad(() => fetchConversations(active?.schoolId ?? ""), [active?.schoolId]);
  const all = conv.data ?? [];
  const unread = inbox(all, "student", false).reduce((s, c) => s + (c.unread ?? 0), 0);
  const rows = tab === "chats" || tab === "archive" ? inbox(all, "student", tab === "archive").filter((c) => matchConversation(c, q)) : [];
  const chats = tab === "chats" || tab === "archive";

  return (
    <SScreen>
      <SHeader eyebrow="التواصل والمحادثات المدرسية" title="رسائلك" action={<SCircleButton icon={PenSquare} label="محادثة جديدة" onPress={onNew} />} />
      {chats ? <SSearch value={q} onChange={setQ} placeholder="ابحث في المحادثات والمعلمين…" label="البحث في المحادثات" /> : null}
      <SChips label="التواصل" value={tab} onChange={setTab}
        items={[{ key: "chats", label: "المحادثات", count: unread || undefined }, { key: "notifications", label: "الإشعارات" }, { key: "events", label: "الأنشطة والفعاليات" }, { key: "archive", label: "الأرشيف" }]} />
      <FadeIn key={tab}>
        {chats ? (
          <DataState loading={conv.loading} error={conv.error} empty={!rows.length} onRetry={conv.reload}
            emptyTitle={q ? "لا توجد نتائج مطابقة" : tab === "archive" ? "الأرشيف فارغ" : "لا توجد محادثات"}
            emptyHint={!q && tab === "chats" ? "ابدأ محادثة جديدة من زر القلم أعلى الصفحة." : undefined}>
            <View style={st.list}>{rows.map((c) => <ConvCard key={c.id} c={c} onPress={() => onOpen(c)} />)}</View>
          </DataState>
        ) : tab === "notifications" ? <NotificationsList /> : <Events embedded />}
      </FadeIn>
      {tab === "archive" ? null : chats && rows.length ? (
        <Pressable onPress={() => setTab("archive")} accessibilityRole="button" style={st.archive}>
          <Archive size={16} color={S.text2} />
          <AppText variant="caption" color={S.text2}>المحادثات المؤرشفة</AppText>
        </Pressable>
      ) : null}
    </SScreen>
  );
};

const st = StyleSheet.create({
  shrink: { flexShrink: 1 },
  list: { gap: SPACING.md },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: S.surface, borderRadius: R.tile + 4, padding: SPACING.lg, borderWidth: 1, borderColor: S.hairline, ...SHADOW.l1 },
  cardUnread: { borderStartWidth: 5, borderStartColor: S.primary },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, lineHeight: 34 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexShrink: 1 },
  count: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: S.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  archive: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 },
});
