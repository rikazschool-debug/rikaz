/** إعدادات عامة تُقرأ من .env (المتغيرات EXPO_PUBLIC_* فقط، فهي تُضمَّن في التطبيق ولا يوضع فيها سر). */

/** مفتاح المنصة العام (publishable) وهو نفس المفتاح العام المستخدم في واجهة الويب. */
const DEFAULT_SUPABASE_URL = "https://czoaudsfbinpkwqsmhrd.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_v1WLD3o5pHc6gU8ba4L_Nw_Ph_uypxw";
const DEFAULT_PLATFORM_URL = "https://kalmalki.lovable.app";

function trimSlash(v: string) {
  return v.replace(/\/+$/, "");
}

export const CONFIG = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_PUBLISHABLE_KEY,
  /** عنوان منصة ركاز على الويب: تُفتح منه الأقسام غير المتوفرة في التطبيق بعد، وتُستدعى منه خدمات الدخول بالهوية. */
  platformUrl: trimSlash(process.env.EXPO_PUBLIC_PLATFORM_URL || DEFAULT_PLATFORM_URL),
  /**
   * الدخول برقم الهوية (الطالب، ولي الأمر، الموظفون) يحتاج نقاط دخول عامة في المنصة لم تُنشأ بعد
   * (انظر docs/PLATFORM_INTEGRATION.md). يبقى معطلًا حتى تُنشأ، ويُفعَّل بالقيمة 1.
   */
  idLoginEnabled: process.env.EXPO_PUBLIC_MOBILE_ID_LOGIN === "1",
};
