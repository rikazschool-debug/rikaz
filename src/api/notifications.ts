import { supabase } from "./client";

export type NotificationRow = { id: string; title: string; body: string | null; link: string | null; created_at: string; read_at: string | null };

/** نفس موجز المنصة العام: تنبيهات واتساب تبقى في صندوقها الخاص. سياسات المنصة تقصر القراءة على المستخدم. */
export const GENERAL_FILTER = "dedupe_key.is.null,dedupe_key.not.like.wa:%";

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from("notifications").select("id,title,body,link,created_at,read_at").or(GENERAL_FILTER).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data as unknown as NotificationRow[]) ?? [];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.rpc("mark_notifications_read" as never, { _ids: ids } as never);
  if (error) throw error;
}
