import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Plus, Send } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SubScreen } from "../../components/StudentKit";
import {
  fetchConversations, fetchGuardianContacts, fetchGuardianLinks, fetchMessages, fetchStudentContacts, inbox, KIND_LABEL,
  markConversationRead, newKey, sendMessage, fetchChatLimits, uploadChatFile, uploadVoice, type ChatLimits, startFamilyConversation, startStudentConversation, fetchTeacherStudents, fetchFamilyContacts, fetchStaffDirectory, startDirectConversation, myUserId, type Contact, type Conversation, type Message,
} from "../../api/family";
import { AttachBar, MessageFiles, PendingList, VoiceRecorder, type PickedFile, type VoiceClip } from "./ChatMedia";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { schoolTime } from "../../lib/studentData";
import { COLORS, FONTS, SPACING } from "../../theme/tokens";

type Role = "student" | "guardian";

/** قائمة المحادثات (الوارد/الأرشيف) مع زر محادثة جديدة. */
export const ConversationList: React.FC<{ role: Role | "teacher"; onOpen: (c: Conversation) => void; onNew?: () => void }> = ({ role, onOpen, onNew }) => {
  const { active } = useAuth();
  const [box, setBox] = useState<"inbox" | "archive">("inbox");
  const q = useLoad(() => fetchConversations(active?.schoolId ?? ""), [active?.schoolId]);
  const rows = inbox(q.data ?? [], role, box === "archive");
  return (
    <View style={styles.gap}>
      <View style={styles.row}>
        <View style={styles.flex}><Chips label="الصندوق" value={box} onChange={setBox} items={[{ key: "inbox", label: role === "student" ? "رسائلي" : "الوارد" }, { key: "archive", label: "الأرشيف" }]} /></View>
        {onNew ? <Pressable onPress={onNew} accessibilityRole="button" accessibilityLabel="محادثة جديدة" style={styles.plus}><Plus size={20} color={COLORS.primaryForeground} /></Pressable> : null}
      </View>
      <DataState loading={q.loading} error={q.error} empty={!rows.length} emptyTitle={box === "archive" ? "الأرشيف فارغ" : "لا توجد محادثات"} emptyHint={box === "inbox" && onNew ? (role === "teacher" ? "ابدأ محادثة جديدة من زر +" : "ابدأ محادثة جديدة مع إدارة المدرسة من زر +") : undefined} onRetry={q.reload}>
        <Panel>
          {rows.map((c, i) => (
            <Pressable key={c.id} onPress={() => onOpen(c)} accessibilityRole="button" accessibilityLabel={`${c.title ?? ""}${c.unread ? `، ${c.unread} غير مقروءة` : ""}`} style={({ pressed }) => [styles.conv, i > 0 && styles.border, pressed && { backgroundColor: COLORS.muted }]}>
              <View style={styles.avatar}><AppText weight="bold" color={COLORS.primary}>{String(c.title ?? "؟").trim().charAt(0)}</AppText></View>
              <View style={styles.flex}>
                <View style={styles.row}>
                  <AppText variant="bodyStrong" weight={c.unread ? "extrabold" : "semibold"} style={styles.flex} numberOfLines={1}>{c.title ?? "محادثة"}</AppText>
                  {c.last_at ? <AppText variant="micro" color={COLORS.mutedForeground}>{schoolTime(c.last_at)}</AppText> : null}
                </View>
                <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{`${KIND_LABEL[c.kind] ?? ""}${c.student_name ? ` · ${c.student_name}` : ""}`}</AppText>
                <View style={styles.row}>
                  <AppText variant="caption" color={COLORS.mutedForeground} style={styles.flex} numberOfLines={1}>{c.last_body ?? "لا رسائل بعد"}</AppText>
                  {c.unread ? <View style={styles.badge}><AppText variant="micro" weight="bold" color={COLORS.primaryForeground}>{String(c.unread)}</AppText></View> : null}
                </View>
              </View>
            </Pressable>
          ))}
        </Panel>
      </DataState>
    </View>
  );
};

/** المحادثة نفسها: الرسائل الأحدث، تحميل الأقدم، الرد، والتعليم كمقروء. */
export const Thread: React.FC<{ conv: Conversation; onBack: () => void }> = ({ conv, onBack }) => {
  const [rows, setRows] = useState<Message[] | null>(null);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const key = useRef(newKey());
  const [limits, setLimits] = useState<ChatLimits | null>(null);
  const [pending, setPending] = useState<PickedFile[]>([]);
  useEffect(() => { void fetchChatLimits(conv.id).then(setLimits).catch(() => setLimits(null)); }, [conv.id]);
  const load = () => {
    setError(false);
    fetchMessages(conv.id).then((r) => { setRows(r); setMore(r.length >= 30); const last = r[r.length - 1]; if (last) void markConversationRead(conv.id, last.seq).catch(() => undefined); }).catch(() => setError(true));
  };
  useEffect(load, [conv.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const older = async () => {
    const first = rows?.[0];
    if (!first) return;
    try { const r = await fetchMessages(conv.id, first.seq); setMore(r.length >= 30); setRows((x) => [...r, ...(x ?? [])]); } catch { setError(true); }
  };
  const readOnly = conv.status === "archived" || !!conv.send_block || conv.allow_replies === false;
  const allowFiles = limits?.attachments !== false && (conv as { allow_attachments?: boolean }).allow_attachments !== false;
  const send = async () => {
    if ((!body.trim() && !pending.length) || busy) return;
    setBusy(true); setSendErr(null);
    try {
      const ids: string[] = [];
      for (const f of pending) ids.push(await uploadChatFile(conv.id, f));
      await sendMessage(conv.id, body.trim(), key.current, ids); key.current = newKey(); setBody(""); setPending([]); load();
    } catch (e) { setSendErr(errorText(e, "تعذّر إرسال الرسالة. حاول مرة أخرى.")); } finally { setBusy(false); }
  };
  const sendVoice = async (c: VoiceClip) => {
    setSendErr(null);
    try { const id = await uploadVoice(conv.id, c); await sendMessage(conv.id, "", newKey(), [id]); load(); }
    catch (e) { setSendErr(errorText(e, "تعذّر إرسال التسجيل.")); throw e; }
  };
  return (
    <SubScreen title={conv.title ?? "محادثة"} eyebrow={`${KIND_LABEL[conv.kind] ?? "محادثة"}${conv.student_name ? ` · ${conv.student_name}` : ""}`} onBack={onBack}>
      <DataState loading={!rows && !error} error={error} empty={!!rows && !rows.length} emptyTitle="لا رسائل بعد" emptyHint={readOnly ? undefined : "اكتب رسالتك الأولى بالأسفل."} onRetry={load}>
        <View style={styles.gap}>
          {more && rows?.length ? <Button title="عرض الرسائل الأقدم" variant="ghost" onPress={() => void older()} /> : null}
          {(rows ?? []).map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
              {!m.mine ? <AppText variant="micro" weight="bold" color={COLORS.primary}>{`${m.sender_name ?? ""}${m.sender_label ? ` · ${m.sender_label}` : ""}`}</AppText> : null}
              <AppText variant="body" color={m.mine ? COLORS.primaryForeground : COLORS.foreground}>{m.deleted_at ? "حُذفت هذه الرسالة" : m.body ?? ""}</AppText>
              {m.files?.length && !m.deleted_at ? <MessageFiles files={m.files} mine={m.mine} /> : null}
              {m.created_at ? <AppText variant="micro" color={m.mine ? COLORS.onPrimaryMuted : COLORS.mutedForeground}>{schoolTime(m.created_at)}</AppText> : null}
            </View>
          ))}
        </View>
      </DataState>
      {readOnly ? <Notice tone="info">هذه المحادثة للقراءة فقط.</Notice> : (
        <View style={styles.gap}>
        {pending.length ? <PendingList items={pending} onRemove={(k) => setPending((x) => x.filter((p) => p.key !== k))} /> : null}
        <View style={styles.tools}>
          {allowFiles ? <AttachBar disabled={busy} onPick={(f) => setPending((x) => [...x, ...f])} onError={setSendErr} /> : null}
          {limits?.voice ? <VoiceRecorder limits={limits} disabled={busy} onSend={sendVoice} onError={setSendErr} /> : null}
        </View>
        <View style={styles.composer}>
          <TextInput value={body} onChangeText={setBody} placeholder="اكتب رسالتك…" placeholderTextColor={COLORS.mutedForeground} multiline maxLength={4000} accessibilityLabel="نص الرسالة" style={styles.input} />
          <Pressable onPress={() => void send()} disabled={busy || (!body.trim() && !pending.length)} accessibilityRole="button" accessibilityLabel="إرسال" style={[styles.plus, (busy || (!body.trim() && !pending.length)) && { opacity: 0.5 }]}><Send size={18} color={COLORS.primaryForeground} /></Pressable>
        </View>
        </View>
      )}
      {sendErr ? <Notice tone="error">{sendErr}</Notice> : null}
    </SubScreen>
  );
};

/** محادثة جديدة مع إدارة المدرسة؛ ولي الأمر يختار الابن أولًا. الجهات المسموحة يحددها الخادم. */
export const NewChat: React.FC<{ role: Role; onBack: () => void; onCreated: (id: string) => void }> = ({ role, onBack, onCreated }) => {
  const { active } = useAuth();
  const kids = useLoad(() => (role === "guardian" ? fetchGuardianLinks(active?.schoolId ?? "") : Promise.resolve([])), [role, active?.schoolId]);
  const [kid, setKid] = useState("");
  useEffect(() => { if (!kid && kids.data?.length) setKid(kids.data[0]!.student_id); }, [kids.data, kid]);
  const contacts = useLoad<Contact[]>(() => (role === "student" ? fetchStudentContacts() : kid ? fetchGuardianContacts(kid) : Promise.resolve([])), [role, kid]);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const key = useRef(newKey());
  const link = kids.data?.find((k) => k.student_id === kid);
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const id = role === "student" ? await startStudentConversation(to) : await startFamilyConversation(kid, link!.guardian_id, to);
      if (body.trim()) await sendMessage(id, body.trim(), key.current).catch(() => undefined);
      onCreated(id);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <SubScreen title="محادثة جديدة" eyebrow="إدارة المدرسة" onBack={onBack}>
      {role === "guardian" ? (
        <DataState loading={kids.loading} error={kids.error} empty={!kids.data?.length} emptyTitle="لا يوجد أبناء موثّقون في هذه المدرسة" onRetry={kids.reload}>
          <AppText variant="label" weight="bold">الابن / الابنة</AppText>
          <Chips label="الأبناء" value={kid} onChange={(v) => { setKid(v); setTo(""); }} items={(kids.data ?? []).map((k) => ({ key: k.student_id, label: k.name }))} />
        </DataState>
      ) : null}
      {role === "student" || kid ? (
        <DataState loading={contacts.loading} error={contacts.error} empty={!contacts.data?.length} emptyTitle="لا توجد جهة إدارية متاحة حاليًا" onRetry={contacts.reload}>
          <AppText variant="label" weight="bold">إلى</AppText>
          <Panel>
            {(contacts.data ?? []).map((c, i) => (
              <Pressable key={c.user_id} onPress={() => setTo(c.user_id)} accessibilityRole="radio" accessibilityState={{ checked: to === c.user_id }} style={[styles.conv, i > 0 && styles.border]}>
                <View style={[styles.radio, to === c.user_id && styles.radioOn]} />
                <View style={styles.flex}><AppText variant="bodyStrong">{c.full_name}</AppText>{c.label ? <AppText variant="micro" color={COLORS.mutedForeground}>{c.label}</AppText> : null}</View>
              </Pressable>
            ))}
          </Panel>
        </DataState>
      ) : null}
      <TextField label="الرسالة الأولى (اختياري)" value={body} onChangeText={setBody} multiline maxLength={4000} />
      {err ? <Notice tone="error">{err}</Notice> : null}
      <Button title="بدء المحادثة" onPress={() => void start()} loading={busy} disabled={!to || (role === "guardian" && !link)} />
    </SubScreen>
  );
};

const ROLE_AR: Record<string, string> = {
  principal: "مدير المدرسة", vice_principal: "الوكيل", dept_head: "رئيس قسم", supervisor: "مشرف تربوي",
  student_affairs: "شؤون الطلاب", teacher: "معلم", counselor: "مرشد", nurse: "التوجيه الصحي", security: "الأمن",
};

/** محادثة المعلم الجديدة: مع ولي أمر طالب من تكليفه الساري، أو مع زميل في مدرسته — كما في المنصة. */
export const TeacherNewChat: React.FC<{ onBack: () => void; onCreated: (id: string) => void }> = ({ onBack, onCreated }) => {
  const { active } = useAuth();
  const school = active?.schoolId ?? "";
  const [mode, setMode] = useState<"family" | "staff">("family");
  const [student, setStudent] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const students = useLoad(() => (mode === "family" ? fetchTeacherStudents(school) : Promise.resolve([])), [mode, school]);
  const guardians = useLoad(() => (student ? fetchFamilyContacts(student) : Promise.resolve([])), [student]);
  const staff = useLoad(() => (mode === "staff" ? fetchStaffDirectory(school) : Promise.resolve([])), [mode, school]);
  const uniq = [...new Map((students.data ?? []).map((x) => [x.student_id, x])).values()];
  const term = search.trim();
  const shownStudents = uniq.filter((x) => !term || x.full_name.includes(term));
  const shownStaff = (staff.data ?? []).filter((x) => !term || x.full_name.includes(term));
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const me = (await myUserId()) ?? "";
      let last = "";
      if (mode === "staff") last = await startDirectConversation(school, to);
      else for (const g of picked) {
        const id = await startFamilyConversation(student, g, me);
        last = id;
        if (body.trim()) await sendMessage(id, body.trim(), newKey()).catch(() => undefined);
      }
      if (mode === "staff" && body.trim()) await sendMessage(last, body.trim(), newKey()).catch(() => undefined);
      if (last) onCreated(last);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const radio = (on: boolean) => <View style={[styles.radio, on && styles.radioOn]} />;
  return (
    <SubScreen title="محادثة جديدة" eyebrow={mode === "family" ? "ولي أمر طالب" : "زميل في المدرسة"} onBack={onBack}>
      <Chips label="نوع المحادثة" value={mode} onChange={(v) => { setMode(v); setTo(""); setPicked([]); setStudent(""); setSearch(""); }} items={[{ key: "family", label: "ولي أمر طالب" }, { key: "staff", label: "زميل" }]} />
      <TextField label="بحث بالاسم" value={search} onChangeText={setSearch} />
      {mode === "family" ? (
        <>
          <AppText variant="label" weight="bold">الطالب (من طلاب تكليفك الساري)</AppText>
          <DataState loading={students.loading} error={students.error} empty={!shownStudents.length} emptyTitle="لا يوجد طلاب ضمن تكليفك الساري" onRetry={students.reload}>
            <Panel>
              {shownStudents.slice(0, 60).map((x, i) => (
                <Pressable key={x.student_id} onPress={() => { setStudent(x.student_id); setPicked([]); }} accessibilityRole="radio" accessibilityState={{ checked: student === x.student_id }} style={[styles.conv, i > 0 && styles.border]}>
                  {radio(student === x.student_id)}
                  <View style={styles.flex}><AppText variant="bodyStrong">{x.full_name}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{[x.section && `شعبة ${x.section}`, x.subject].filter(Boolean).join(" · ")}</AppText></View>
                </Pressable>
              ))}
            </Panel>
          </DataState>
          {student ? (
            <DataState loading={guardians.loading} error={guardians.error} empty={!guardians.data?.length} emptyTitle="لا يوجد ولي أمر موثّق ومخوّل بالمتابعة ولديه حساب" onRetry={guardians.reload}>
              <AppText variant="label" weight="bold">المستلمون</AppText>
              <Panel>
                {(guardians.data ?? []).map((g, i) => {
                  const on = picked.includes(g.guardian_id);
                  return (
                    <Pressable key={g.guardian_id} onPress={() => setPicked(on ? picked.filter((y) => y !== g.guardian_id) : [...picked, g.guardian_id])} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.conv, i > 0 && styles.border]}>
                      {radio(on)}
                      <View style={styles.flex}><AppText variant="bodyStrong">{g.full_name}</AppText>{g.relationship ? <AppText variant="micro" color={COLORS.mutedForeground}>{g.relationship}</AppText> : null}</View>
                    </Pressable>
                  );
                })}
              </Panel>
            </DataState>
          ) : null}
        </>
      ) : (
        <DataState loading={staff.loading} error={staff.error} empty={!shownStaff.length} emptyTitle="لا يوجد زملاء" onRetry={staff.reload}>
          <Panel>
            {shownStaff.slice(0, 80).map((x, i) => (
              <Pressable key={x.user_id} onPress={() => setTo(x.user_id)} accessibilityRole="radio" accessibilityState={{ checked: to === x.user_id }} style={[styles.conv, i > 0 && styles.border]}>
                {radio(to === x.user_id)}
                <View style={styles.flex}><AppText variant="bodyStrong">{x.full_name}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{[x.role && (ROLE_AR[x.role] ?? ""), x.department].filter(Boolean).join(" · ")}</AppText></View>
              </Pressable>
            ))}
          </Panel>
        </DataState>
      )}
      <TextField label="الرسالة الأولى (اختياري)" value={body} onChangeText={setBody} multiline maxLength={4000} />
      {err ? <Notice tone="error">{err}</Notice> : null}
      <Button title="بدء المحادثة" onPress={() => void start()} loading={busy} disabled={mode === "staff" ? !to : !picked.length} />
    </SubScreen>
  );
};

export const unreadTotal = (rows: Conversation[]) => rows.reduce((s, c) => s + (c.unread ?? 0), 0);
export { Pill };

const styles = StyleSheet.create({
  tools: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, flexWrap: "wrap" },
  flex: { flex: 1 },
  gap: { gap: SPACING.md },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  plus: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  conv: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 56 },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  bubble: { maxWidth: "86%", borderRadius: 16, padding: SPACING.md, gap: 2 },
  mine: { alignSelf: "flex-start", backgroundColor: COLORS.primary },
  theirs: { alignSelf: "flex-end", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.card, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontFamily: FONTS.regular, fontSize: 15, textAlign: "right", color: COLORS.foreground },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  radioOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
