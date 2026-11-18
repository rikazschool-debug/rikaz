import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { BookOpen, Paperclip, Plus } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, SegmentTabs, SubScreen } from "../../components/StudentKit";
import { CO_CATEGORIES, CO_EMOJI, canCollaborate, fetchCommunity, fetchMaterialFiles, fetchMaterials, react, removeMaterial, shareMaterial, type Material } from "../../api/collab";
import { fileUrl, myUserId, type Conversation } from "../../api/family";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { schoolDate } from "../../lib/studentData";
import { AttachBar, PendingList, type PickedFile } from "../shared/ChatMedia";
import { Thread } from "../shared/Conversations";
import { COLORS, SPACING } from "../../theme/tokens";

const ROLE: Record<string, string> = { org_owner: "مدير النظام", principal: "مدير المدرسة", vice_principal: "الوكيل", supervisor: "مشرف تربوي", teacher: "معلم" };

/** التعاون: المجتمع المهني بين فروع المجموعة، والمكتبة الرقمية للمواد المشتركة. */
export const Collaboration: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const org = active?.orgId ?? "";
  const ok = useLoad(() => (org ? canCollaborate(org) : Promise.resolve(false)), [org]);
  const [tab, setTab] = useState<"community" | "library">("library");
  const [conv, setConv] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (conv) return <Thread conv={conv} onBack={() => setConv(null)} />;
  const openCommunity = async () => {
    setBusy(true); setErr(null);
    try { setConv(await fetchCommunity(org)); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <SubScreen title="التعاون" eyebrow="بين فروع المجموعة" onBack={onBack}>
      <DataState loading={ok.loading} error={ok.error} empty={ok.data === false} emptyTitle="التعاون غير متاح لحسابك" onRetry={ok.reload}>
        <SegmentTabs label="التعاون" value={tab} onChange={setTab} items={[{ key: "library", label: "المكتبة الرقمية" }, { key: "community", label: "المجتمع المهني" }]} />
        {tab === "community" ? (
          <Panel style={styles.card}>
            <AppText variant="bodyStrong" weight="extrabold">المجتمع المهني</AppText>
            <AppText variant="caption" color={COLORS.mutedForeground}>محادثة مهنية تجمع المعلمين والإدارة في فروع المجموعة.</AppText>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Button title="فتح المجتمع المهني" loading={busy} onPress={() => void openCommunity()} />
          </Panel>
        ) : <Library org={org} school={active?.schoolId ?? null} />}
      </DataState>
    </SubScreen>
  );
};

const Library: React.FC<{ org: string; school: string | null }> = ({ org, school }) => {
  const [cat, setCat] = useState("activities");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [share, setShare] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const q = useLoad(async () => {
    const [me, list] = await Promise.all([myUserId(), fetchMaterials(org, cat, search, page)]);
    return { me: me ?? "", ...list, files: await fetchMaterialFiles(list.rows.map((r) => r.id)) };
  }, [org, cat, search, page]);
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setMsg(null);
    try { await fn(); if (ok) setMsg({ tone: "success", text: ok }); q.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); }
  };
  if (share && school) return <ShareForm org={org} school={school} category={cat} onClose={() => setShare(false)} onDone={(t) => { setShare(false); setMsg({ tone: "success", text: t }); q.reload(); }} />;
  return (
    <View style={styles.gap}>
      <Chips label="التصنيف" value={cat} onChange={(v) => { setCat(v); setPage(0); }} items={Object.entries(CO_CATEGORIES).map(([key, label]) => ({ key, label }))} />
      <TextField label="البحث بعنوان المادة" value={search} onChangeText={(v) => { setSearch(v); setPage(0); }} />
      {school ? <Button title="مشاركة مادة" icon={Plus} variant="secondary" onPress={() => setShare(true)} /> : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <DataState loading={q.loading && !q.data} error={q.error} empty={!q.data?.rows.length} emptyTitle="لا توجد مشاركات بعد" onRetry={q.reload}>
        {(q.data?.rows ?? []).map((m: Material) => (
          <Panel key={m.id} style={styles.card}>
            <View style={styles.head}><BookOpen size={18} color={COLORS.primary} /><AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{m.title}</AppText></View>
            {m.description ? <AppText variant="body" numberOfLines={6}>{m.description}</AppText> : null}
            <AppText variant="micro" color={COLORS.mutedForeground}>{[m.author_name, m.author_role && (ROLE[m.author_role] ?? ""), m.author_branch, schoolDate(m.created_at.slice(0, 10))].filter(Boolean).join(" · ")}</AppText>
            {(q.data?.files ?? []).filter((f) => f.source_id === m.id).map((f) => (
              <Pressable key={f.id} accessibilityRole="link" accessibilityLabel={`فتح ${f.name}`} style={styles.file} onPress={async () => { const u = await fileUrl(f); if (u) void Linking.openURL(u); else setMsg({ tone: "error", text: "تعذر فتح الملف" }); }}>
                <Paperclip size={14} color={COLORS.primary} /><AppText variant="caption" color={COLORS.primary} numberOfLines={1} style={styles.flex}>{f.name}</AppText>
              </Pressable>
            ))}
            <View style={styles.emojis}>
              {CO_EMOJI.map((e) => {
                const n = m.co_reactions.filter((r) => r.emoji === e).length;
                const mine = m.co_reactions.some((r) => r.user_id === q.data?.me && r.emoji === e);
                return (
                  <Pressable key={e} accessibilityRole="button" accessibilityLabel={`تفاعل ${e}`} accessibilityState={{ selected: mine }} onPress={() => void act(() => react(m, q.data!.me, e))} style={[styles.emoji, mine && styles.emojiOn]}>
                    <AppText variant="caption">{`${e} ${n || ""}`}</AppText>
                  </Pressable>
                );
              })}
            </View>
            {m.author === q.data?.me ? <Button title="حذف المادة" variant="destructive" onPress={() => void act(() => removeMaterial(m.id), "حُذفت المادة")} /> : null}
          </Panel>
        ))}
        <View style={styles.pager}>
          <Button title="السابق" variant="ghost" disabled={!page} onPress={() => setPage((p) => p - 1)} />
          <Button title="التالي" variant="ghost" disabled={!q.data?.more} onPress={() => setPage((p) => p + 1)} />
        </View>
      </DataState>
    </View>
  );
};

const ShareForm: React.FC<{ org: string; school: string; category: string; onClose: () => void; onDone: (t: string) => void }> = ({ org, school, category, onClose, onDone }) => {
  const [cat, setCat] = useState(category);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const failed = await shareMaterial({ org, school, me: (await myUserId()) ?? "", title, description: desc, category: cat, files });
      onDone(failed ? "حُفظت المادة، وبعض المرفقات لم تُرفع" : "حُفظت المادة");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Panel style={styles.card}>
      <AppText variant="bodyStrong" weight="extrabold">مشاركة مادة</AppText>
      <Chips label="التصنيف" value={cat} onChange={setCat} items={Object.entries(CO_CATEGORIES).map(([key, label]) => ({ key, label }))} />
      <TextField label="العنوان" value={title} onChangeText={setTitle} maxLength={200} />
      <TextField label="الوصف" value={desc} onChangeText={setDesc} multiline maxLength={4000} />
      <PendingList items={files} onRemove={(k) => setFiles(files.filter((f) => f.key !== k))} />
      <AttachBar disabled={busy} onPick={(fs) => setFiles([...files, ...fs])} onError={setErr} />
      {err ? <Notice tone="error">{err}</Notice> : null}
      <Button title="حفظ المادة" loading={busy} disabled={!title.trim() || busy} onPress={() => void save()} />
      <Button title="إلغاء" variant="ghost" disabled={busy} onPress={onClose} />
    </Panel>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: SPACING.md },
  card: { paddingVertical: SPACING.md, gap: SPACING.sm },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  file: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, minHeight: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: SPACING.md },
  emojis: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  emoji: { minHeight: 36, minWidth: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: SPACING.sm },
  emojiOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  pager: { flexDirection: "row", justifyContent: "space-between" },
});
