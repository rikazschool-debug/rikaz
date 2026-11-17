import { httpsOrigin, publicKey, VPS_API_URL, VPS_PLATFORM_URL, VPS_PUBLIC_KEY } from "./lib/connection";

export const CONFIG = {
  supabaseUrl: httpsOrigin(process.env.EXPO_PUBLIC_SUPABASE_URL || VPS_API_URL),
  supabaseKey: publicKey(
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    VPS_PUBLIC_KEY),
  platformUrl: httpsOrigin(process.env.EXPO_PUBLIC_PLATFORM_URL || VPS_PLATFORM_URL),
  /** خدمات الهوية مستقلة عن عنوان Auth/PostgREST وعن روابط واجهة الويب. */
  authUrl: httpsOrigin(process.env.EXPO_PUBLIC_AUTH_API_URL || VPS_PLATFORM_URL),
  /** الخدمات منشورة؛ يبقى الدخول الحقيقي مغلقًا حتى قبول اختبارات الطالب وولي الأمر. */
  idLoginEnabled: process.env.EXPO_PUBLIC_MOBILE_ID_LOGIN === "1",
  /** معاينة مرئية في التطوير فقط؛ لا تفعّل أي طلبات دخول. */
  loginDesignPreviewEnabled:
    __DEV__ && process.env.EXPO_PUBLIC_MOBILE_LOGIN_PREVIEW === "1",
};
