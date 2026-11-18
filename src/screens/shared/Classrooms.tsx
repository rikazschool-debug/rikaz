import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { MessageCircle, Paperclip, Pin, School } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { DataState, IconTileBox, ListRow, Panel, SubScreen } from "../../components/StudentKit";
import { addComment, fetchComments, fetchPosts, fetchRoom, fetchRooms, fileUrl, type Post, type PostFile, type RoomDetail } from "../../api/family";
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
  const q = useLoad(() => fetchPosts(subject.classroom_id), [subject.classroom_id]);
  const [fileErr, setFileErr] = useState(false);
  const open = async (f: PostFile) => {
    setFileErr(false);
    const url = await fileUrl(f).catch(() => null);
    if (url) void Linking.openURL(url); else setFileErr(true);
  };
  return (
    <SubScreen title={subject.subject} eyebrow={subject.teachers?.join("، ") || "منشورات المقرر"} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
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
              {canComment ? <Comments post={p} /> : null}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

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
  post: { paddingVertical: SPACING.md, gap: SPACING.xs },
  file: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, minHeight: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: SPACING.md },
  comments: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  comment: { backgroundColor: COLORS.muted, borderRadius: 10, padding: SPACING.sm },
});
