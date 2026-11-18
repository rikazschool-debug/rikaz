# Uploaded role-selection reference

Applied only the account-entry selector from the uploaded screen reference: educational staff, student, and guardian. The reference's other dashboards, sample records, unsupported contact details, security claims, and password alternatives are not copied.

- Native segmented selection sits above the login form with recognizable role icons, selected state, RTL labels, and flexible large-text layout.
- Retained existing Rikaz logo component, palette, Cairo font, student C-Smart flow, and six-digit WhatsApp flow with the existing resend cooldown.
- Removed the mobile platform-owner login form. Owner-only contexts are no longer synthesized; a mixed-role owner retains only actual permitted mobile memberships. This filter does not change server permissions or web roles.
- Existing VPS login availability guard remains unchanged. The role selector does not enable unpublished authentication services.

Validation: isolated membership tests, TypeScript checking, and Android/iOS JavaScript export are distinct from native builds, device runs, and real sign-in. Real sign-in requires deployed VPS login services and a designated test account.

## أقسام الحساب حسب الدور

تعرض الرئيسية أقسام الصفة النشطة فقط، مطابقة لقائمة منصة ركاز:

- **الطالب:** جدولي، الفصول الرقمية، مذكرة الواجبات، الاختبارات، الخروج والاستئذان، المحادثات، الإشعارات، الأنشطة والفعاليات.
- **ولي الأمر:** أقسام الطالب، ومعها التعاميم، وطلبات ولي الأمر، والزيارات، ونظام التقييم الشامل، والخطط العلاجية.
- **الكادر التعليمي:** قائمة كل دور كما في المنصة (المعلم، المدير، الوكيل، رئيس القسم، المشرف، شؤون الطلاب، المرشد، التوجيه الصحي، الأمن)، مع إضافة أو حجب أقسام حسب صلاحيات المدرسة الممنوحة للشخص.

المصدر في المنصة: `src/lib/roles.ts` (NAV_BY_ROLE)، و`src/routes/_authenticated/app/route.tsx`، و`src/lib/workspace-perms.ts`. يفتح كل قسم صفحته في منصة ركاز على الويب إلى أن يُبنى داخل التطبيق، والخادم يعيد التحقق من الصلاحية عند فتحه.

أقسام تعتمد على قدرات تشغيلية تحسبها المنصة من خدمات إضافية (المشتريات، الصيانة، القبول، المكالمات، الموارد البشرية، ملفي الوظيفي) لا تظهر في التطبيق حاليًا.


## Visual reference (Stitch export)

The uploaded Stitch export is the layout reference for the mobile screens. The app keeps the Rikaz platform palette (teal primary, amber accent) and the Cairo font; the reference's royal-blue palette and IBM Plex font are intentionally not used.

Applied from the reference:
- Sign-in: logo in a raised white tile, product name and subtitle, three account-type cards with the active one filled, form card with a top accent strip, short help line.
- Home: greeting bar with logo tile, profile card with status pill, gradient card for the active school and role with the switch action, "أقسامك" grid of raised tiles grouped by category.
- Account: profile card with initial avatar and account-type pill, grouped settings list, sign-out action.
- Switch school/role: the current role row is highlighted.

Not applied: screens that need data the app does not load yet (timetable, grades, homework, digital card, permission requests). They stay in the web platform until built natively; no sample data is shown.
