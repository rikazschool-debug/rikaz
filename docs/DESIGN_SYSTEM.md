# نظام تصميم ركاز للجوال

## مصدر الهوية
كل عناصر الهوية منقولة من مستودع منصة ركاز، دون اختراع هوية بديلة:
- **الألوان:** `src/styles.css` في المنصة (قيم oklch محوّلة إلى sRGB). الأساسي `#006560` (oklch 0.45 0.09 190)، والذهبي `#EBB25F` (oklch 0.8 0.12 75)، والخلفية الدافئة `#FEFDFB`.
- **الشعار:** مسار SVG نفسه في `src/components/logo.tsx` و`public/favicon.svg` (بلاطة بزوايا دائرية يُقتطع منها حرف R). أُعيد رسم أيقونة التطبيق وشاشة البداية منه باللون الأساسي، بدل الأيقونة الكحلية السابقة.
- **الخط:** Cairo، وهو خط المنصة (`font-display`)، عبر `@expo-google-fonts/cairo`.
- **الشعار اللفظي:** «ركاز | مدارس تُدار بذكاء».

## المراجع
- Apple Human Interface Guidelines — Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple HIG — Accessibility (أهداف لمس 44×44 نقطة): https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple HIG — Right to left: https://developer.apple.com/design/human-interface-guidelines/right-to-left
- Apple HIG — Typography (Dynamic Type): https://developer.apple.com/design/human-interface-guidelines/typography
- Material Design 3 — Accessibility (أهداف لمس 48dp): https://m3.material.io/foundations/designing/structure
- Material Design 3 — Bidirectionality: https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl
- Material Design 3 — Navigation bar: https://m3.material.io/components/navigation-bar/overview
- Material Design 3 — Text fields: https://m3.material.io/components/text-fields/overview

## الأسس المطبقة
- **المسافات:** شبكة 4 نقاط (`SPACING`). هامش الشاشة 16، وحشوة البطاقة 20.
- **الخطوط:** سلّم من 8 درجات (`TYPE`)، مع ارتفاع سطر واسع لأن Cairo يحتاجه للحروف العربية. كل وزن له ملف خط مستقل، لأن أندرويد لا يختار الوزن من `fontWeight` في الخطوط المخصصة.
- **تكبير النص:** مسموح، بحد أقصى ×1.6 للنصوص و×1.35 للعناوين و×1.3 للأزرار، والعناصر تلتف ولا تُقص.
- **اللمس:** كل زر وحقل بارتفاع 48 نقطة على الأقل، مع مساحة لمس إضافية للروابط.
- **الاتجاه:** RTL مفروض. أرقام الهوية والرمز والبريد تُكتب من اليسار لليمين، وتُحوَّل الأرقام العربية الهندية تلقائيًا إلى أرقام لاتينية.
- **لوحة المفاتيح:** لوحة أرقام للهوية والرمز، وتعبئة تلقائية للرمز من الرسائل (iOS: `oneTimeCode`، أندرويد: `sms-otp`)، والتمرير يعمل والحقل ظاهر فوق اللوحة.
- **مناطق الأمان:** `react-native-safe-area-context` في كل الشاشات وشريط التنقل.
- **الحالات:** ضغط، وتعطيل، وتحميل، وتركيز الحقل، وخطأ يُقرأ تلقائيًا لقارئ الشاشة.

## المكونات (`src/components/ui.tsx`)
`AppText` و`Button` (أساسي، ثانوي، نصي، تحذيري) و`TextField` و`Card` و`Notice` (معلومة، خطأ، نجاح، تنبيه) و`Segmented` و`IconTile` و`LinkButton` و`Divider`، إضافة إلى `Brand` و`RikazLogo`.
