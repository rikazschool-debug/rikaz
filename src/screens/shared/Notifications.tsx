import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui";
import { DataState, Panel } from "../../components/StudentKit";
import { fetchNotifications, markNotificationsRead, type NotificationRow } from "../../api/notifications";
import { CONFIG } from "../../config";
import { schoolTime } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

/** قائمة الإشعارات مع التعليم كمقروء؛ تُعرض داخل تبويب التواصل. */
export const NotificationsList: React.FC = () => {
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    setRows(null);
    fetchNotifications().then(setRows).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);
  const mark = async (ids: string[]) => {
    try {
      await markNotificationsRead(ids);
      const now = new Date().toISOString();
      setRows((r) => r?.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)) ?? r);
    } catch {
      // تبقى غير مقروءة؛ لا نغيّر العرض
    }
  };
  const unread = (rows ?? []).filter((n) => !n.read_at);
  return (
    <DataState loading={!rows && !error} error={error} empty={!!rows && !rows.length} emptyTitle="لا توجد إشعارات" onRetry={load}>
      <View style={styles.list}>
        {unread.length ? (
          <Pressable onPress={() => void mark(unread.map((n) => n.id))} accessibilityRole="button" style={styles.markAll}>
            <AppText variant="label" weight="bold" color={COLORS.primary}>{`تعليم الكل كمقروء (${unread.length})`}</AppText>
          </Pressable>
        ) : null}
        {(rows ?? []).map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            accessibilityLabel={`${n.read_at ? "" : "غير مقروء، "}${n.title}`}
            onPress={() => {
              if (!n.read_at) void mark([n.id]);
              if (n.link) void Linking.openURL(n.link.startsWith("http") ? n.link : `${CONFIG.platformUrl}${n.link}`);
            }}
          >
            <Panel style={[styles.card, !n.read_at && styles.unread]}>
              <View style={styles.head}>
                <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>{n.title}</AppText>
                {!n.read_at ? <View style={styles.dot} /> : null}
              </View>
              {n.body ? <AppText variant="caption" color={COLORS.mutedForeground}>{n.body}</AppText> : null}
              <AppText variant="micro" color={COLORS.mutedForeground}>{schoolTime(n.created_at)}</AppText>
            </Panel>
          </Pressable>
        ))}
      </View>
    </DataState>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: SPACING.sm },
  markAll: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  card: { paddingVertical: SPACING.md, gap: 4 },
  unread: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },
});
