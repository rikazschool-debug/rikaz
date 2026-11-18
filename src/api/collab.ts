import { supabase } from "./client";
import type { Conversation } from "./family";

/** التعاون: المجتمع المهني (محادثة المجموعة) والمكتبة الرقمية — نفس دوال وجداول المنصة، والوصول يقرره _co_ok في الخادم. */
type Json = Record<string, unknown>;
const rpc = async <T>(name: string, args: Json): Promise<T> => {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};
export const CO_CATEGORIES: Record<string, string> = { activities: "أنشطة", teaching: "مواد تعليمية", worksheets: "أوراق عمل", notes: "مذكرات", summaries: "ملخصات", courses: "دورات" };
export const CO_EMOJI = ["👍", "❤️", "👏", "💡", "🎉"];
export type Material = {
  id: string; title: string; description: string | null; category: string; author: string; author_name: string | null; author_role: string | null;
  author_branch: string | null; created_at: string; stage_name: string | null; grade_name: string | null; co_reactions: { user_id: string; emoji: string }[];
};
export type CoFile = { id: string; name: string; storage_path: string; size_bytes?: number | null };

export const canCollaborate = (org: string) => rpc<boolean>("_co_ok", { _org: org }).then((r) => !!r);
export async function fetchCommunity(org: string): Promise<Conversation> {
  const c = await rpc<{ id: string; title: string | null; kind: string }>("co_community", { _org: org });
  return { id: c.id, title: c.title ?? "المجتمع المهني", kind: c.kind ?? "group" };
}
const PAGE = 24;
export async function fetchMaterials(org: string, category: string, search: string, page: number): Promise<{ rows: Material[]; more: boolean }> {
  let q = supabase.from("co_materials").select("*, co_reactions(*)", { count: "exact" }).eq("org_id", org).eq("category", category);
  const s = search.trim().replace(/[,()*%\\]/g, " ");
  if (s) q = q.ilike("title", `%${s}%`);
  const { data, error, count } = await q.order("created_at", { ascending: false }).order("id").range(page * PAGE, page * PAGE + PAGE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Material[], more: (page + 1) * PAGE < Number(count ?? 0) };
}
export async function fetchMaterialFiles(ids: string[]): Promise<(CoFile & { source_id: string })[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("files").select("id, name, storage_path, size_bytes, source_id").eq("source_type", "co_material").in("source_id", ids);
  if (error) throw error;
  return (data ?? []) as unknown as (CoFile & { source_id: string })[];
}
export async function react(m: Material, me: string, emoji: string) {
  const own = m.co_reactions.find((x) => x.user_id === me);
  const { error } = own?.emoji === emoji
    ? await supabase.from("co_reactions").delete().eq("material_id", m.id).eq("user_id", me)
    : await supabase.from("co_reactions").upsert({ material_id: m.id, user_id: me, emoji } as never, { onConflict: "material_id,user_id" });
  if (error) throw error;
}
export async function removeMaterial(id: string) {
  const { error } = await supabase.from("co_materials").delete().eq("id", id);
  if (error) throw error;
}
/** مشاركة مادة ثم رفع مرفقاتها؛ المرفق الفاشل يُزال بـ co_remove_file. يعيد عدد المرفقات التي لم تُرفع. */
export async function shareMaterial(p: { org: string; school: string; me: string; title: string; description: string; category: string; files: { uri: string; name: string; mime: string; size: number }[] }): Promise<number> {
  const { data, error } = await supabase.from("co_materials")
    .insert({ title: p.title.trim(), description: p.description, category: p.category, stage_name: null, grade_name: null, org_id: p.org, school_id: p.school, author: p.me } as never)
    .select("id").single();
  if (error) throw error;
  const id = (data as { id: string }).id;
  let failed = 0;
  for (const f of p.files) {
    try {
      const rec = await rpc<{ id: string; storage_path: string }>("co_add_file", { _material: id, _name: f.name, _mime: f.mime, _size: f.size });
      const buf = await (await fetch(f.uri)).arrayBuffer();
      const up = await supabase.storage.from("rikaz-files").upload(rec.storage_path, buf, { contentType: f.mime });
      if (up.error) { failed++; await rpc("co_remove_file", { _id: rec.id }).catch(() => undefined); }
    } catch { failed++; }
  }
  return failed;
}
