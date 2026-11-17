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
  /**
   * الدخول برقم الهوية (الطالب، ولي الأمر، الموظفون) يحتاج نقاط دخول عامة في المنصة لم تُنشأ بعد
   * (انظر docs/PLATFORM_INTEGRATION.md). يبقى معطلًا حتى تُنشأ، ويُفعَّل بالقيمة 1.
   */
  idLoginEnabled: process.env.EXPO_PUBLIC_MOBILE_ID_LOGIN === "1",
};
