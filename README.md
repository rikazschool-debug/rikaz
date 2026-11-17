# تطبيق جوال ركاز (Rikaz Mobile App)

تطبيق الجوال الرسمي لمنصة ركاز لإدارة المدارس، مبني باستخدام **React Native** و **Expo SDK 51** و **TypeScript**.

---

## 1. تحليل بيئة التشغيل: هل يكفي Expo Go أم يحتاج Development Build؟

### الخلاصة:
**حالياً، تطبيق Expo Go كافٍ تماماً (100%)** للتطوير اليومي والمعاينة المستمرة على محاكي الأندرويد، ولا تحتاج نهائياً إلى بناء ملفات APK أو انتظار بناءات سحابية مع كل تعديل.

### الأسباب ومراجعة الحزم:
جميع الحزم المستخدمة في المشروع حالياً معتمدة ومدعومة برمجياً داخل حزمة **Expo Go (SDK 51)**:
- `@supabase/supabase-js`: حزمة جافاسكريبت نقية (Pure JS).
- `expo-secure-store`: مدعومة ومضمنة مسبقاً في Expo Go.
- `react-native-svg` و `lucide-react-native`: مدعومة ومضمنة مسبقاً في Expo Go.
- `react-native-screens` و `react-native-safe-area-context`: مدعومة ومضمنة مسبقاً في Expo Go.
- `expo-linear-gradient` و `expo-font` و `expo-status-bar`: مدعومة ومضمنة مسبقاً في Expo Go.

### متى ستحتاج إلى Development Build (`expo-dev-client`) مستقبلاً؟
ستحتاج إلى إنشاء Development Build فقط في الحالات التالية:
1. عند إضافة مكتبات كود أصلي (Native C++ / Java / Kotlin) غير مضمنة في Expo Go، مثل: حزم مكالمات الفيديو والبث المباشر المتقدمة (مثل `react-native-agora` أو `react-native-webrtc`).
2. عند إضافة وتعديل ملفات AndroidManifest بأذونات منخفضة المستوى غير قياسية، أو تعديل كود مجلد `android/` يدوياً.
3. لتضمين خدمات إشعارات أصلية متقدمة تتطلب إعدادات خاصة في ملفات Gradle.

---

## 2. دليل الإعداد والتشغيل على نظام Windows ومحاكي Android Studio

اتبع الخطوات التالية للتشغيل السريع والتطوير اللحظي عبر Fast Refresh:

### أ) المتطلبات المسبقة على Windows
1. **Node.js**: تثبيت إصدار LTS (18 أو 20) من الموقع الرسمي.
2. **Git for Windows**: مثبت ومتاح في موجه الأوامر (CMD أو PowerShell).
3. **Android Studio**: تثبيت أحدث إصدار.

### ب) ضبط إعدادات Android Studio ومتغيرات البيئة (Environment Variables)
1. افتح **Android Studio** ثم انتقل إلى: **More Actions > SDK Manager**.
2. في تبويب **SDK Platforms**: تأكد من تثبيت **Android 14.0 (API 34)** أو **Android 13.0 (API 33)**.
3. في تبويب **SDK Tools**: تأكد من تفعيل وتثبيت:
   - `Android SDK Build-Tools`
   - `Android Emulator`
   - `Android SDK Platform-Tools` (تحتوي على أداة `adb`)
4. أضف مسارات الأندرويد إلى متغيرات بيئة النظام في Windows:
   - افتح **Environment Variables** في Windows.
   - أضف متغيراً جديداً باسم `ANDROID_HOME` بقيمة:
     ```text
     C:\Users\<اسم_المستخدم>\AppData\Local\Android\Sdk
     ```
   - في متغير `Path` (تحت System variables أو User variables)، أضف السطرين التاليين:
     ```text
     %ANDROID_HOME%\platform-tools
     %ANDROID_HOME%\emulator
     ```
   - للتأكد من نجاح الإعداد، افتح نافذة CMD جديدة واكتب:
     ```bash
     adb version
     ```

### ج) إنشاء وتشغيل المحاكي (Virtual Device)
1. في Android Studio، افتح **Virtual Device Manager** (أو **Device Manager**).
2. اضغط **Create Device** واختر هاتفاً حديثاً (مثل **Pixel 7** أو **Pixel 8**).
3. اختر صورة النظام: **API 34 (Google APIs)**.
4. اضغط **Finish** ثم اضغط زر التشغيل (▶) لإقلاع المحاكي وانتظر حتى تظهر شاشة أندرويد الرئيسية.

---

## 3. تنزيل وتشغيل المشروع مع Fast Refresh

افتح موجه الأوامر (PowerShell أو Terminal) ونفّذ التالي:

```bash
# 1. استنساخ المشروع وتحديد فرع develop
git clone -b develop https://github.com/rikazschool-debug/rikaz.git
cd rikaz

# 2. تثبيت الحزم والاعتماديات
npm install

# 3. إعداد ملف البيئة
copy .env.example .env

# 4. تشغيل التطبيق وربطه بمحاكي أندرويد
npm run android
# أو:
npx expo start --android
```

### ماذا يحدث تلقائياً عند تنفيذ هذا الأمر؟
1. يتعرف أمر Expo تلقائياً على المحاكي الشغال عبر `adb`.
2. يتم تثبيت تطبيق **Expo Go** تلقائياً داخل المحاكي (لمرة واحدة فقط).
3. يتم تجميع الحزمة عبر **Metro Bundler** وفتح تطبيق ركاز مباشرة داخل المحاكي.
4. يعمل **Fast Refresh** تلقائياً: أي تعديل تحفظه في ملفات الكود ينعكس في شاشة المحاكي بأجزاء من الثانية!

> **ملاحظة مفيدة**: إذا واجهت مشكلة في وصول المحاكي إلى خادم Metro المحلي، نفّذ الأمر التالي في نافذة تيرمنال منفصلة:
> ```bash
> adb reverse tcp:8081 tcp:8081
> ```

---

## 4. جدول تمييز التعديلات (تحديث لحظي مقابل إعادة بناء)

| نوع التعديل | كيفية الانعكاس على المحاكي | الإجراء المطلوب من المطور |
| :--- | :--- | :--- |
| **تعديل واجهات JSX ومكونات React** (`src/screens/*`, `src/components/*`) | **فوري ولحظي (Fast Refresh)** خلال أجزاء من الثانية مع الحفاظ على حالة الشاشة | حفظ الملف (`Ctrl + S`) فقط |
| **تعديل التنسيقات والألوان والهوامش** (`StyleSheet`, Flexbox) | **فوري ولحظي (Fast Refresh)** | حفظ الملف (`Ctrl + S`) |
| **تعديل النصوص والترجمات والرسائل** | **فوري ولحظي (Fast Refresh)** | حفظ الملف (`Ctrl + S`) |
| **تعديل المنطق البرمجي والدوال** (`src/api/*`, `src/hooks/*`) | **فوري ولحظي (Fast Refresh)** | حفظ الملف (`Ctrl + S`) |
| **تعديل متغيرات البيئة** (`.env`) | **يتطلب إعادة تشغيل خادم التطوير** | إيقاف السيرفر (`Ctrl + C`) ثم تشغيله بمسح الكاش: `npm run clear` ثم `npm run android` |
| **تثبيت مكتبة جافاسكريبت نقية جديدة** (Pure JS مثل `date-fns`) | **يتطلب إعادة تحميل Metro** | `npm install <package>` ثم الضغط على `r` في نافذة السيرفر |
| **تعديل إعدادات `app.json` (القيم العامة)** | **يتطلب إعادة تحميل** | الضغط على `r` لإعادة التحميل في التيرمنال |
| **تفعيل RTL لأول مرة عبر `I18nManager`** | **يتطلب إعادة تشغيل التطبيق** | إغلاق التطبيق داخل المحاكي وإعادة فتحه لتطبيق اتجاه اليمين لليسار |
| **إضافة مكتبة كود أصلي (Native Module) غير مدعومة في Expo Go** | **يتطلب Development Build كامل** | استخدام `npx expo run:android` أو EAS Build لإنشاء حزمة جديدة |
| **تغيير الأيقونات الأصلية، شاشة الـ Splash لنظام أندرويد، أو Package Name** | **يتطلب إعادة بناء كامل** | إعادة بناء الحزمة الأصلية |

---

## 5. اختصارات لوحة المفاتيح داخل موجه الأوامر (Terminal)

أثناء تشغيل `npx expo start`:
- **`r`**: إعادة تحميل التطبيق بالكامل داخل المحاكي (Reload).
- **`m`**: فتح قائمة التطوير (Developer Menu) على شاشة المحاكي (أو اضغط `Ctrl + M` داخل نافذة المحاكي).
- **`a`**: إعادة محاولة الفتح والاتصال بمحاكي أندرويد.
- **`j`**: فتح مصحح الأخطاء (Debugger).
- **`c`**: مسح الكاش وإعادة التجميع من الصفر.
