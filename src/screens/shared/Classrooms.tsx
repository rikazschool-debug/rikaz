import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { MessageCircle, Paperclip, Pin, School } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { DataState, IconTileBox, ListRow, Panel, SubScreen } from "../../components/StudentKit";
import { addComment, createPost, fetchComments, fetchPosts, fetchRoom, fetchRooms, fileUrl, isCourseTeacher, myUserId, updatePost, uploadPostFile, type Post, type PostFile, type RoomDetail } from "../../api/family";
import { AttachBar } from "./ChatMedia";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { schoolTime } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

type View_ = { room?: string; subject?: RoomDetail["subjects"][number] };

/** الفصول الرقمية: فصل الشعبة ← المقررات ← منشورات المعلم. التعليقات للطالب فقط كما في المنصة. */
export const Classrooms: React.FC<{ onBack: () => void; canComment: boolean }> = ({ onBack, canComment }) => {
  const [v, setV] = useState<View_>({});
  if (v.room && v.subject) return <Subject subject={v.subject} canComment={canComment} onBack={() => setV({ room: v.room })} />;
  if (v.room) return <Room id={v.room} onBack={() => setV({})} onSubject={(s) => setV({ room: v.room, subject: s })} />;
  return <Rooms onBack={onBack} onOpen={(room) => setV({ room })} />;
};

const Rooms: React.FC<{ onBack: () => void; onOpen: (id: string) => void }> = ({ onBack, onOpen }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchRooms(active?.schoolId ?? ""), [active?.schoolId]);
  return (
    <SubScreen title="الفصول الرقمية" eyebrow="دروسك ومقرراتك" onBack={onBack}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا يوجد فصل رقمي لشعبتك بعد" onRetry={q.reload}>
        <Panel>
          {(q.data ?? []).map((r, i) => (
            <ListRow key={r.id} first={i === 0} icon={School} title={r.title} subtitle={[r.subjects != null ? `${r.subjects} مقرر` : null, r.posts != null ? `${r.posts} منشور` : null].filter(Boolean).join(" · ") || undefined} onPress={() => onOpen(r.id)} />
          ))}
        </Panel>
      </DataState>
    </SubScreen>
  );
};

const Room: React.FC<{ id: string; onBack: () => void; onSubject: (s: RoomDetail["subjects"][number]) => void }> = ({ id, onBack, onSubject }) => {
  const q = useLoad(() => fetchRoom(id), [id]);
  return (
    <SubScreen title={q.data?.title ?? "الفصل الرقمي"} eyebrow="المقررات والمعلمون" onBack={onBack}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.subjects?.length} emptyTitle="لا توجد مقررات في هذا الفصل بعد" onRetry={q.reload}>
        <View style={styles.grid}>
          {(q.data?.subjects ?? []).map((s) => (
            <Pressable key={s.classroom_id} onPress={() => onSubject(s)} accessibilityRole="button" accessibilityLabel={s.subject} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <IconTileBox icon={School} />
              <AppText variant="bodyStrong" numberOfLines={2}>{s.subject}</AppText>
              {s.teachers?.length ? <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={2}>{s.teachers.join("، ")}</AppText> : null}
            </Pressable>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

const Subject: React.FC<{ subject: RoomDetail["subjects"][number]; canComment: boolean; onBack: () => void }> = ({ subject, canComment, onBack }) => {
  const { active } = useAuth();
  const q = useLoad(async () => {
    const [teacher, me] = await Promise.all([isCourseTeacher(subject.course_id), myUserId()]);
    return { teacher, me, ...(await fetchPosts(subject.classroom_id, teacher)) };
  }, [subject.classroom_id]);
  const [fileErr, setFileErr] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ tone: "success", text: ok }); q.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(null); }
  };
  const teacher = !!q.data?.teacher;
  const open = async (f: PostFile) => {
    setFileErr(false);
    const url = await fileUrl(f).catch(() => null);
    if (url) void Linking.openURL(url); else setFileErr(true);
  };
  return (
    <SubScreen title={subject.subject} eyebrow={subject.teachers?.join("، ") || "منشورات المقرر"} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      {teacher ? (
        <Panel style={styles.post}>
          <AppText variant="bodyStrong" weight="extrabold">منشور جديد</AppText>
          <TextField label="العنوان" value={title} onChangeText={setTitle} maxLength={200} />
          <TextField label="النص" value={body} onChangeText={setBody} multiline maxLength={8000} />
          <Button title="حفظ كمسودة" loading={busy === "new"} disabled={!title.trim() || !!busy}
            onPress={() => void act("new", async () => { await createPost(subject.classroom_id, active?.schoolId ?? "", title, body); setTitle(""); setBody(""); }, "حُفظت المسودة. انشرها حين تكون جاهزة.")} />
        </Panel>
      ) : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {fileErr ? <Notice tone="warning">لا تملك صلاحية فتح هذا الملف أو لم يعد متاحًا.</Notice> : null}
      <DataState loading={q.loading && !q.data} error={q.error} empty={!q.data?.posts.length} emptyTitle="لا توجد منشورات بعد" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data?.posts ?? []).map((p) => (
            <Panel key={p.id} style={styles.post}>
              <View style={styles.row}>
                {p.pinned ? <Pin size={15} color={COLORS.primary} accessibilityLabel="مثبت" /> : null}
                <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{p.title}</AppText>
              </View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{schoolTime(p.created_at)}</AppText>
              {p.body ? <AppText variant="body">{p.body}</AppText> : null}
              {(q.data?.files ?? []).filter((f) => f.source_id === p.id).map((f) => (
                <Pressable key={f.id} onPress={() => void open(f)} accessibilityRole="link" accessibilityLabel={`فتح ${f.name}`} style={styles.file}>
                  <Paperclip size={14} color={COLORS.primary} />
                  <AppText variant="caption" color={COLORS.primary} numberOfLines={1} style={styles.flex}>{f.name}</AppText>
                </Pressable>
              ))}
              {teacher ? <AppText variant="micro" color={COLORS.mutedForeground}>{`${STATUS[p.status] ?? p.status} · ${p.audience === "students_guardians" ? "للطلاب والأسر" : "للطلاب"}`}</AppText> : null}
              {teacher && p.author_user_id === q.data?.me ? (
                <View style={styles.tools}>
                  {p.status !== "published" ? <Button title="نشر" disabled={!!busy} onPress={() => void act("p", () => updatePost(p.id, { status: "published" }), "نُشر المنشور")} /> : (
                    <Button title="أرشفة" variant="secondary" disabled={!!busy} onPress={() => void act("a", () => updatePost(p.id, { status: "archived" }), "أُرشف")} />
                  )}
                  <Button title={p.pinned ? "إلغاء التثبيت" : "تثبيت"} variant="ghost" disabled={!!busy} onPress={() => void act("pin", () => updatePost(p.id, { pinned: !p.pinned }), p.pinned ? "أُلغي التثبيت" : "ثُبّت")} />
                  <Button title={p.comments_enabled ? "إغلاق التعليقات" : "فتح التعليقات"} variant="ghost" disabled={!!busy} onPress={() => void act("c", () => updatePost(p.id, { comments_enabled: !p.comments_enabled }), "تم")} />
                  <Button title={p.audience === "students_guardians" ? "للطلاب فقط" : "إظهار للأسر أيضًا"} variant="ghost" disabled={!!busy} onPress={() => void act("au", () => updatePost(p.id, { audience: p.audience === "students_guardians" ? "students" : "students_guardians" }), "تم تحديث الجمهور")} />
                  <AttachBar disabled={!!busy} onError={(t) => setMsg({ tone: "error", text: t })} onPick={(fs) => void act("f", async () => { for (const f of fs) await uploadPostFile(p.id, f); }, "رُفع الملف")} />
                  {busy === "f" ? <AppText variant="micro" color={COLORS.mutedForeground}>جارٍ الرفع…</AppText> : null}
                </View>
              ) : null}
              {canComment && p.status === "published" ? <Comments post={p} /> : null}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

const STATUS: Record<string, string> = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

const Comments: React.FC<{ post: Post }> = ({ post }) => {
  const [open, setOpen] = useState(false);
  const q = useLoad(() => (open ? fetchComments(post.id) : Promise.resolve([])), [open, post.id]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button title="التعليقات" variant="ghost" icon={MessageCircle} onPress={() => setOpen(true)} />;
  const send = async () => {
    setBusy(true); setErr(null);
    try { await addComment(post, body); setBody(""); q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <View style={styles.comments}>
      {(q.data ?? []).map((c) => (
        <View key={c.id} style={styles.comment}><AppText variant="caption">{c.body}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{schoolTime(c.created_at)}</AppText></View>
      ))}
      {!q.loading && !q.data?.length ? <AppText variant="micro" color={COLORS.mutedForeground}>لا توجد تعليقات بعد</AppText> : null}
      {post.comments_enabled ? (
        <>
          <TextField label="تعليقك" value={body} onChangeText={setBody} maxLength={2000} />
          {err ? <Notice tone="error">{err}</Notice> : null}
          <Button title="إرسال التعليق" variant="secondary" onPress={() => void send()} loading={busy} disabled={!body.trim()} />
        </>
      ) : <AppText variant="micro" color={COLORS.mutedForeground}>التعليقات مغلقة على هذا المنشور</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  card: { flexBasis: "46%", flexGrow: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: SPACING.md, gap: 4 },
  pressed: { backgroundColor: COLORS.primaryTint, borderColor: COLORS.primary },
  list: { gap: SPACING.md },
  tools: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  post: { paddingVertical: SPACING.md, gap: SPACING.xs },
  file: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, minHeight: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: SPACING.md },
  comments: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  comment: { backgroundColor: COLORS.muted, borderRadius: 10, padding: SPACING.sm },
});
