import React, { useEffect, useRef, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Camera, FileText, ImageIcon, Mic, Paperclip, Pause, Play, Square, Trash2, X } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { signedFileUrl, type ChatFile, type ChatLimits } from "../../api/family";
import { clipSeconds, fileKind, fmtSec } from "../../lib/chatFiles";
import { COLORS, SPACING } from "../../theme/tokens";

export type PickedFile = { key: string; uri: string; name: string; mime: string; size: number };
const kb = (n?: number | null) => (n ? `${Math.max(1, Math.ceil(n / 1024))} ك.ب` : "");

/* ---------- عرض المرفقات في الرسالة ---------- */
const ImageThumb: React.FC<{ f: ChatFile }> = ({ f }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (f.storage_path) void signedFileUrl(f.storage_path).then(setUrl); }, [f.storage_path]);
  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={`صورة ${f.name}`} onPress={() => url && void Linking.openURL(url)}>
      {url ? <Image source={{ uri: url }} style={styles.img} resizeMode="cover" /> : <View style={[styles.img, styles.ph]}><ImageIcon size={22} color={COLORS.mutedForeground} /></View>}
    </Pressable>
  );
};

/** مشغل الرسالة الصوتية: الرابط يُجلب عند التشغيل فقط، ولا تشغيل تلقائي. */
export const VoicePlayer: React.FC<{ path?: string | null; uri?: string; seconds?: number | null; tint: string }> = ({ path, uri, seconds, tint }) => {
  const [src, setSrc] = useState<string | null>(uri ?? null);
  const player = useAudioPlayer(src ? { uri: src } : null);
  const st = useAudioPlayerStatus(player);
  const want = useRef(false);
  useEffect(() => { if (want.current && st.isLoaded) { want.current = false; player.play(); } }, [st.isLoaded, player]);
  async function toggle() {
    if (st.playing) { player.pause(); return; }
    if (!src && path) { want.current = true; setSrc(await signedFileUrl(path)); return; }
    if (st.didJustFinish || (st.duration && st.currentTime >= st.duration)) player.seekTo(0);
    player.play();
  }
  return (
    <Pressable onPress={() => void toggle()} accessibilityRole="button" accessibilityLabel={st.playing ? "إيقاف الرسالة الصوتية" : "تشغيل الرسالة الصوتية"} style={styles.voice}>
      {st.playing ? <Pause size={18} color={tint} /> : <Play size={18} color={tint} />}
      <View style={styles.track}><View style={[styles.prog, { backgroundColor: tint, width: `${st.duration ? Math.min(100, (st.currentTime / st.duration) * 100) : 0}%` }]} /></View>
      <AppText variant="micro" color={tint}>{fmtSec(st.playing || st.currentTime ? st.currentTime : seconds ?? st.duration ?? 0)}</AppText>
    </Pressable>
  );
};

export const MessageFiles: React.FC<{ files: ChatFile[]; mine: boolean }> = ({ files, mine }) => {
  const tint = mine ? COLORS.primaryForeground : COLORS.primary;
  return (
    <View style={styles.files}>
      {files.map((f) => {
        const k = fileKind(f);
        if (k === "voice") return <VoicePlayer key={f.id} path={f.storage_path} seconds={f.duration} tint={tint} />;
        if (k === "image") return <ImageThumb key={f.id} f={f} />;
        return (
          <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={`فتح الملف ${f.name}`} style={[styles.chip, mine && styles.chipMine]}
            onPress={async () => { const u = f.storage_path ? await signedFileUrl(f.storage_path, f.name) : null; if (u) void Linking.openURL(u); }}>
            <Paperclip size={14} color={tint} />
            <AppText variant="micro" weight="bold" color={tint} numberOfLines={1} style={styles.flex}>{f.name}</AppText>
            <AppText variant="micro" color={tint}>{kb(f.size_bytes)}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ---------- إرفاق قبل الإرسال ---------- */
let seq = 0;
const nextKey = () => `f${++seq}`;
export async function pickDocuments(): Promise<PickedFile[]> {
  const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (r.canceled) return [];
  return r.assets.map((a) => ({ key: nextKey(), uri: a.uri, name: a.name, mime: a.mimeType || "application/octet-stream", size: a.size ?? 0 }));
}
export async function pickImages(camera: boolean): Promise<PickedFile[] | "denied"> {
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return "denied";
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, allowsMultipleSelection: !camera };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled) return [];
  return r.assets.map((a, i) => ({ key: nextKey(), uri: a.uri, name: a.fileName || `صورة-${Date.now()}-${i}.jpg`, mime: a.mimeType || "image/jpeg", size: a.fileSize ?? 0 }));
}

export const PendingList: React.FC<{ items: PickedFile[]; onRemove: (k: string) => void }> = ({ items, onRemove }) => (
  <View style={styles.pending}>
    {items.map((p) => (
      <View key={p.key} style={styles.pend}>
        {p.mime.startsWith("image/") ? <Image source={{ uri: p.uri }} style={styles.pendImg} /> : <FileText size={16} color={COLORS.primary} />}
        <AppText variant="micro" numberOfLines={1} style={styles.flex}>{p.name}</AppText>
        <Pressable onPress={() => onRemove(p.key)} accessibilityRole="button" accessibilityLabel={`إزالة ${p.name}`} hitSlop={8}><X size={16} color={COLORS.mutedForeground} /></Pressable>
      </View>
    ))}
  </View>
);

export const AttachBar: React.FC<{ disabled?: boolean; onPick: (files: PickedFile[]) => void; onError: (m: string) => void }> = ({ disabled, onPick, onError }) => {
  const run = async (fn: () => Promise<PickedFile[] | "denied">) => {
    try { const r = await fn(); if (r === "denied") onError("يلزم السماح بالوصول من إعدادات الجهاز"); else if (r.length) onPick(r); } catch { onError("تعذر فتح الملفات"); }
  };
  return (
    <View style={styles.bar}>
      <IconBtn icon={Paperclip} label="إرفاق ملف" disabled={disabled} onPress={() => void run(pickDocuments)} />
      <IconBtn icon={ImageIcon} label="إرفاق صورة" disabled={disabled} onPress={() => void run(() => pickImages(false))} />
      <IconBtn icon={Camera} label="التقاط صورة" disabled={disabled} onPress={() => void run(() => pickImages(true))} />
    </View>
  );
};

const IconBtn: React.FC<{ icon: typeof Mic; label: string; onPress: () => void; disabled?: boolean; tone?: string }> = ({ icon: Icon, label, onPress, disabled, tone }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.iconBtn, (disabled || pressed) && { opacity: 0.5 }]}>
    <Icon size={20} color={tone ?? COLORS.primary} />
  </Pressable>
);

/* ---------- التسجيل الصوتي (حدود المدة والحجم من إعدادات المدرسة) ---------- */
export type VoiceClip = { uri: string; mime: string; size: number; seconds: number };
export const VoiceRecorder: React.FC<{ limits: ChatLimits; disabled?: boolean; onSend: (c: VoiceClip) => Promise<void>; onError: (m: string) => void }> = ({ limits, disabled, onSend, onError }) => {
  const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const st = useAudioRecorderState(rec, 250);
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [busy, setBusy] = useState(false);
  const secs = Math.floor((st.durationMillis ?? 0) / 1000);
  useEffect(() => { if (st.isRecording && secs >= limits.voice_max_sec) void stop(); }, [secs, st.isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) { onError("يلزم السماح بالميكروفون من إعدادات الجهاز"); return; }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await rec.prepareToRecordAsync();
    rec.record();
  }
  async function stop() {
    const seconds = clipSeconds(secs, limits.voice_max_sec);
    await rec.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = rec.uri;
    if (!uri) { onError("تعذر حفظ التسجيل"); return; }
    const size = (await (await fetch(uri)).blob()).size;
    if (size > limits.voice_max_bytes) { onError(`التسجيل أكبر من الحد (${(limits.voice_max_bytes / 1048576).toFixed(1)} م.ب)`); return; }
    setClip({ uri, mime: uri.endsWith(".webm") ? "audio/webm" : "audio/mp4", size, seconds });
  }
  if (clip) {
    return (
      <View style={styles.clip}>
        <View style={styles.flex}><VoicePlayer uri={clip.uri} seconds={clip.seconds} tint={COLORS.primary} /></View>
        <IconBtn icon={Trash2} label="حذف التسجيل" tone={COLORS.destructive} disabled={busy} onPress={() => setClip(null)} />
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="إرسال الصوت" onPress={async () => { setBusy(true); try { await onSend(clip); setClip(null); } finally { setBusy(false); } }} style={[styles.sendVoice, busy && { opacity: 0.5 }]}>
          <AppText variant="label" weight="bold" color={COLORS.primaryForeground}>{busy ? "جارٍ الإرسال…" : "إرسال"}</AppText>
        </Pressable>
      </View>
    );
  }
  if (st.isRecording) {
    return (
      <View style={styles.clip} accessibilityLiveRegion="polite">
        <View style={styles.dot} />
        <AppText variant="label" weight="bold" style={styles.flex}>{`جارٍ التسجيل ${fmtSec(secs)} / ${fmtSec(limits.voice_max_sec)}`}</AppText>
        <IconBtn icon={Square} label="إيقاف التسجيل" tone={COLORS.destructive} onPress={() => void stop()} />
      </View>
    );
  }
  return <IconBtn icon={Mic} label={`تسجيل رسالة صوتية حتى ${limits.voice_max_sec} ثانية`} disabled={disabled} onPress={() => void start().catch(() => onError("تعذر بدء التسجيل"))} />;
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  files: { gap: SPACING.xs, marginTop: SPACING.xs },
  img: { width: 200, height: 150, borderRadius: 12 },
  ph: { backgroundColor: COLORS.muted, alignItems: "center", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, paddingHorizontal: SPACING.md, minHeight: 36, maxWidth: 240 },
  chipMine: { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.35)" },
  voice: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 40, minWidth: 180 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(127,127,127,0.3)", overflow: "hidden" },
  prog: { height: 4 },
  bar: { flexDirection: "row", gap: SPACING.xs },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  pending: { gap: SPACING.xs },
  pend: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: SPACING.sm },
  pendImg: { width: 32, height: 32, borderRadius: 6 },
  clip: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: SPACING.md, minHeight: 52 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.destructive },
  sendVoice: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: SPACING.md, minHeight: 40, justifyContent: "center" },
});
