# أقسام الطالب وولي الأمر داخل التطبيق

كل قسم يقرأ من نفس مصادر منصة ركاز، والخادم هو من يقرر السماح.

| القسم | الطالب | ولي الأمر | المصدر في المنصة |
|---|---|---|---|
| الجدول | ✓ | ✓ لكل ابن | family_child |
| الواجبات والاختبارات | ✓ | ✓ لكل ابن | student_homework |
| الحضور والغياب | ✓ | ✓ لكل ابن | family_attendance_range |
| الدرجات والنتائج | ✓ | — (لم يُتحقق من الصلاحية) | grade_results |
| الفصول الرقمية | ✓ مع التعليقات | ✓ قراءة فقط | section_rooms_list / section_room_get / classroom_posts |
| المحادثات | ✓ | ✓ | my_conversations / conv_messages / send_message |
| محادثة جديدة مع الإدارة | ✓ | ✓ | student_contacts / guardian_contacts |
| الإشعارات | ✓ | ✓ | notifications / mark_notifications_read |
| الفعاليات | ✓ عرض | ✓ مع موافقة الرحلات | evt_family / evt_consent |
| الخروج والاستئذان | سجل فقط | طلب، إلغاء، سجل | submit_pickup_request / cancel_pickup |
| التعاميم | — | ✓ مع الإقرار | circulars / open_circular / ack_circular |
| الزيارات | — | طلب، تأكيد، اعتذار، إلغاء | gv_list / gv_create / gv_act |
| طلبات ولي الأمر | — | ✓ | family_requests / family_request_create |
| البيانات المالية | — | ✓ لكل ابن | family_child.finance |

## المعلم — الواجبات والاختبارات

| الإجراء | في التطبيق | المصدر في المنصة |
|---|---|---|
| واجب جديد (طلاب محددون، معايير التصحيح) | ✓ | save_homework / set_homework_kind / publish_homework |
| اختبار جديد (أسئلة، إجابات صحيحة، نماذج، مدة) | ✓ | exam_draft_save / publish_homework |
| نشر مسودة، تعديل بعد النشر، تمديد، إغلاق، أرشفة، إلغاء | ✓ | publish_homework / revise_homework / extend_homework / set_homework_status |
| طباعة أوراق الاختبار الورقي ورصد التظليل | على المنصة | — |

ما زال على المنصة: التقييم الشامل والخطط العلاجية (ولي الأمر)، والتسجيل في الدورات، وإرفاق الملفات في المحادثات، والملف الصحي ورعاية الموهبة.
الفصول الافتراضية مخفية في المنصة نفسها لكل الأدوار، لذلك لا تظهر في التطبيق.

لم تُجرَّب هذه الشاشات بحساب طالب أو ولي أمر حقيقي ولا على جهاز.
