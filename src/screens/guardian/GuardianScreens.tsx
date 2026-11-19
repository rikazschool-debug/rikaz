import React, { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, Platform, RefreshControl, StyleSheet, View } from "react-native";
import {
  Award, Bell, BookOpen, CalendarCheck, CalendarDays, ClipboardList, DoorOpen, IdCard, LayoutGrid, LifeBuoy, LogOut, MessagesSquare,
  PartyPopper, Repeat, School, Users, Wallet, ChevronLeft, Clock3, UserRound, type LucideIcon,
} from "lucide-react-native";
import { BottomBar, type BottomItem } from "../../components/BottomBar";
import { AppText, Button, Notice } from "../../components/ui";
import { openSection } from "../../components/StudentKit";
import { fetchMyProfile, type MyProfile } from "../../api/profile";
import { canFollow, fetchFamilyChildren, type FamilyChild } from "../../api/student";
import type { Conversation } from "../../api/family";
import { useAuth } from "../../hooks/useAuth";
import { maskNationalId, maskPhone } from "../../lib/mask";
import { StudentScope } from "../student/useStudentData";
import { GuardianAttendance } from "./GuardianAttendance";
import { StudentSchedule } from "../student/StudentSchedule";
import { GuardianHomework } from "./GuardianHomework";
import { Classrooms } from "../shared/Classrooms";
import { NewChat, Thread } from "../shared/Conversations";
import { Events } from "../shared/Events";
import { GuardianPickup } from "../shared/Pickup";
import { GuardianEvaluation } from "./GuardianEvaluation";
import { EduRecords } from "../teacher/TeacherSections";
import { ChildFinance, FamilyRequests, Visits } from "./GuardianExtras";
import { SPACING } from "../../theme/tokens";
import { G, GR, GSHADOW } from "../../theme/guardian";
import { FontSetContext, READEX } from "../../theme/fontSet";
import { SBadge, SCard, SChips, SCircleButton, SHeader, SSearch, SScreen, SSection, STopBar, SWell } from "../../components/student/SKit";
import { GRow } from "../../components/guardian/GKit";
import { GuardianComm, type GuardianCommTab } from "./GuardianComm";
import { fetchOverview } from "../../api/student";
import { useLoad } from "../../hooks/useLoad";
import { currentOrNext, riyadhMinutes } from "../../lib/studentDay";
import { lessonsOn, riyadhWeekday, hm } from "../../lib/studentData";


export type GuardianTab = "account" | "comm" | "home" | "kids" | "more";
const TABS: BottomItem<GuardianTab>[] = [
  {key:"home",label:"أبنائي",icon:Users},
  {key:"kids",label:"الجدول",icon:CalendarCheck},
  {key:"comm",label:"التواصل",icon:MessagesSquare},
  {key:"more",label:"الخدمات",icon:LayoutGrid},
  {key:"account",label:"حسابي",icon:UserRound},
];
const BAR={active:G.primary,inactive:G.muted,pill:G.mintStrong,surface:G.surface,border:G.border};

/** أقسام داخل التطبيق؛ «ابن» = تخص الابن المختار. */
type Sub = "evaluation" | "remedial" | "attendance" | "schedule" | "homework" | "classrooms" | "finance" | "pickup" | "visits" | "requests" | "events" | "thread" | "newchat";
const SUB: Record<Exclude<Sub, "thread" | "newchat">, { label: string; hint: string; icon: LucideIcon; child?: boolean }> = {
  attendance: { label: "الحضور والغياب", hint: "تقويم المواظبة", icon: CalendarCheck, child: true },
  schedule: { label: "الجدول", hint: "حصص اليوم والأسبوع", icon: CalendarDays, child: true },
  homework: { label: "الواجبات والاختبارات", hint: "المطلوب والمسلّم", icon: ClipboardList, child: true },
  classrooms: { label: "الفصول الرقمية", hint: "الدروس والمنشورات", icon: School },
  finance: { label: "البيانات المالية", hint: "الرصيد والمدفوعات", icon: Wallet, child: true },
  pickup: { label: "الخروج والاستئذان", hint: "استلام واستئذان", icon: DoorOpen },
  visits: { label: "الزيارات", hint: "مواعيد المدرسة", icon: CalendarDays },
  requests: { label: "طلبات ولي الأمر", hint: "طلباتك للمدرسة", icon: ClipboardList },
  events: { label: "الأنشطة والفعاليات", hint: "الرحلات والموافقات", icon: PartyPopper },
  evaluation: { label: "تقييم المعلمين", hint: "قيّم معلمي ابنك", icon: Award },
  remedial: { label: "الخطط العلاجية", hint: "خطط دعم أبنائك", icon: BookOpen },
};
const QUICK: (keyof typeof SUB)[] = ["attendance", "homework", "schedule", "requests", "classrooms", "visits"];
const MORE: { title: string; keys: (keyof typeof SUB)[] }[] = [
  { title: "اليوم الدراسي", keys: ["attendance", "schedule", "homework", "classrooms", "pickup"] },
  { title: "المتابعة والطلبات", keys: ["visits", "requests", "finance", "events", "evaluation", "remedial"] },
];

/** ولي الأمر: أبناؤه الموثّقون في المدرسة النشطة كما تعيدهم المنصة؛ لا أسماء أو أرقام مصطنعة. */
export function GuardianShell({ onSwitch }: { onSwitch: () => void }) {
  const { active, fullName, contexts, signOut } = useAuth();
  const [tab, setTabRaw] = useState<GuardianTab>("home");
  const [sub, setSub] = useState<Sub | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kidsAll, setKids] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("");
  const [commTab, setCommTab] = useState<GuardianCommTab>("chats");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exitError, setExitError] = useState(false);
  const schoolId = active?.schoolId;
  const setTab = (t: GuardianTab) => { setSub(null); setTabRaw(t); };

  useEffect(() => {
    let alive = true;
    setFailed(false); setLoading(true);
    Promise.all([fetchMyProfile(schoolId), fetchFamilyChildren()])
      .then(([p, k]) => { if (alive) { setProfile(p); setKids(k); } })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [schoolId, revision]);

  const here = useMemo(() => kidsAll.filter((k) => k.school_id === schoolId), [kidsAll, schoolId]);
  const kids = here.filter(canFollow);
  const pending = here.filter((k) => !canFollow(k));
  useEffect(() => { const first = kids[0]; if (first && !kids.some((k) => k.student_id === selected)) setSelected(first.student_id); }, [kids, selected]);
  const child = kids.find((k) => k.student_id === selected);
  const overview=useLoad(()=>child?fetchOverview(child.student_id):Promise.resolve(null),[child?.student_id,schoolId,revision]);
  const [clock,setClock]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const next=currentOrNext(lessonsOn(overview.data?.timetable??[],riyadhWeekday(new Date(clock))),riyadhMinutes(new Date(clock)));
  const [academic,setAcademic]=useState<"attendance"|"schedule"|"homework">("attendance");
  const [search,setSearch]=useState("");

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (confirm) { setConfirm(false); return true; }
      if (sub === "thread" || sub === "newchat") { setSub(null); setConv(null); return true; }
      if (sub) { setSub(null); return true; }
      if (tab !== "home") { setTabRaw("home"); return true; }
      return false;
    });
    return () => h.remove();
  }, [tab, sub, confirm]);

  const name = profile?.full_name || fullName || "ولي الأمر";
  const back = () => { setSub(null); setConv(null); };
  async function leave() { setBusy(true); setExitError(!(await signOut())); setBusy(false); }
  function askLeave() {
    if (Platform.OS === "web") { setConfirm(true); return; }
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الخروج", style: "destructive", onPress: () => void leave() }]);
  }

  // الشاشات الفرعية داخل التطبيق
  const scoped = (el: React.ReactNode) => (child ? <StudentScope studentId={child.student_id} schoolId={child.school_id}>{el}</StudentScope> : null);
  let screen: React.ReactNode = null;
  if (sub === "thread" && conv) screen = <Thread conv={conv} onBack={back} />;
  else if (sub === "newchat") screen = <NewChat role="guardian" onBack={back} onCreated={(id) => { setConv({ id, title: "محادثة جديدة", kind: "family" }); setSub("thread"); }} />;
  else if (sub === "attendance") screen = scoped(<GuardianAttendance onBack={back} />);
  else if (sub === "schedule") screen = scoped(<StudentSchedule onBack={back} />);
  else if (sub === "homework") screen = scoped(<GuardianHomework onBack={back} />);
  else if (sub === "finance" && child) screen = <ChildFinance studentId={child.student_id} name={child.student ?? ""} onBack={back} />;
  else if (sub === "classrooms") screen = <Classrooms onBack={back} canComment={false} />;
  else if (sub === "pickup") screen = <GuardianPickup onBack={back} initialChild={child?.student_id} />;
  else if (sub === "visits") screen = <Visits kids={kids} onBack={back} />;
  else if (sub === "requests") screen = <FamilyRequests kids={kids} onBack={back} />;
  else if (sub === "events") screen = <Events onBack={back} />;
  else if (sub === "evaluation") screen = <GuardianEvaluation onBack={back} />;
  else if (sub === "remedial") screen = <EduRecords kind="student_plan" eyebrow="الخطط المشاركة معك" onBack={back} />;

  const go = (k: keyof typeof SUB) => setSub(k);
  const tile = (k: keyof typeof SUB) => {
    const item=SUB[k]; const off=!!item.child&&!child;
    return <View key={k} style={styles.tileWrap}><SCard onPress={off?undefined:()=>go(k)} label={item.label} style={[styles.tile,off&&styles.disabled]}><SWell icon={item.icon} tone={k==="homework"?"amber":"mint"} round/><AppText variant="bodyStrong" weight="bold" color={G.ink}>{item.label}</AppText><AppText variant="caption" color={G.text2}>{item.hint}</AppText></SCard></View>;
  };
  const childPicker=kids.length>1?<SChips label="الأبناء" value={selected} onChange={setSelected} items={kids.map(k=>({key:k.student_id,label:k.student??""}))}/>:null;
  const titles={home:"أبنائي",kids:"الجدول والحضور",comm:"التواصل",more:"الخدمات",account:"حسابي"};
  const childHeader=child?<SCard style={styles.row}><SWell icon={Users} round/><View style={styles.flex}><AppText weight="bold" color={G.ink}>{child.student}</AppText><AppText variant="caption" color={G.text2}>{[child.grade,child.section].filter(Boolean).join(" · ")}</AppText></View></SCard>:null;
  const showComm=(value:GuardianCommTab)=>{setCommTab(value);setTab("comm");};

  return <FontSetContext.Provider value={READEX}><View style={styles.flex}>
    {!screen?<STopBar title={titles[tab]} onBell={()=>showComm("notifications")} onAccount={()=>setTab("account")} accountActive={tab==="account"}/>:null}
    <View style={styles.flex}>{screen??(tab==="kids"&&child?<View style={styles.flex}>
      <View style={styles.academicHeader}>{childPicker}{childHeader}<SChips label="المتابعة الدراسية" value={academic} onChange={setAcademic} items={[{key:"attendance",label:"الحضور والغياب"},{key:"schedule",label:"الجدول الدراسي"},{key:"homework",label:"الواجبات والاختبارات"}]}/></View>
      <StudentScope key={child.student_id} studentId={child.student_id} schoolId={child.school_id}>{academic==="attendance"?<GuardianAttendance onBack={()=>setTab("home")}/>:academic==="schedule"?<StudentSchedule onBack={()=>setTab("home")}/>:<GuardianHomework onBack={()=>setTab("home")}/>}</StudentScope>
    </View>:<SScreen refresh={<RefreshControl refreshing={loading} onRefresh={()=>setRevision(v=>v+1)} tintColor={G.primary}/> }>
      {failed?<><Notice tone="warning">تعذر تحميل بياناتك الآن.</Notice><Button title="إعادة المحاولة" variant="secondary" onPress={()=>setRevision(v=>v+1)}/></>:null}
      {!loading&&!failed&&!kids.length&&tab!=="account"&&tab!=="comm"?<Notice tone="info">{pending.length?"ستظهر بيانات أبنائك بعد توثيق المدرسة للعلاقة.":"لا يوجد أبناء مرتبطون بحسابك في هذه المدرسة. تواصل مع المدرسة لربطهم."}</Notice>:null}
      {tab==="home"?<>
        <View style={styles.hero}><View style={styles.row}><SBadge label={active?.schoolName??"مدرستك"}/><View style={styles.flex}/><SBadge label={`أبنائي (${kids.length})`}/></View><View style={styles.row}><View style={styles.avatar}><AppText style={styles.initial} weight="bold" color={G.primary}>{name.charAt(0)}</AppText></View><View style={styles.flex}><AppText variant="caption" color={G.onPrimaryMuted}>مرحبًا بك مجددًا،</AppText><AppText variant="title" weight="bold" color={G.onPrimary}>{name}</AppText><AppText variant="caption" color={G.onPrimaryMuted}>متابعة الأداء الأكاديمي واليومي</AppText></View></View></View>
        {childPicker}{childHeader}
        {child?<SCard onPress={()=>{setAcademic("schedule");setTab("kids");}} label="جدول الابن" style={styles.row}><SWell icon={Clock3} round/><View style={styles.flex}><SBadge label={overview.loading?"جارٍ تحميل الجدول":next?.live?"الحصة الحالية":next?"الحصة القادمة":"الجدول الدراسي"}/><AppText variant="headline" weight="bold" color={G.ink}>{next?.slot.subject??"عرض حصص ابنك"}</AppText>{next?<AppText variant="caption" color={G.text2}>{[next.slot.teacher,`${hm(next.slot.start)} — ${hm(next.slot.end)}`].filter(Boolean).join(" · ")}</AppText>:null}</View><ChevronLeft size={20} color={G.primary}/></SCard>:null}
        <SSection title="متابعة سريعة" icon={LayoutGrid}/><View style={styles.grid}>{QUICK.map(tile)}</View>
        {child?<SCard onPress={()=>go("finance")} label="الرسوم والبيانات المالية" style={styles.row}><SWell icon={Wallet} round/><View style={styles.flex}><AppText variant="headline" weight="bold" color={G.ink}>الرسوم والبيانات المالية</AppText><AppText variant="caption" color={G.text2}>الرصيد والمدفوعات</AppText></View><ChevronLeft size={20} color={G.primary}/></SCard>:null}
        <SSection title="التواصل مع المدرسة" icon={MessagesSquare}/><View style={styles.listGroup}><GRow first icon={MessagesSquare} title="التواصل والمحادثات" onPress={()=>showComm("chats")}/><GRow icon={Bell} title="الإعلانات والتعاميم المدرسية" onPress={()=>showComm("circulars")}/><GRow icon={PartyPopper} title="الأنشطة والفعاليات" onPress={()=>go("events")}/></View>
      </>:null}
      {tab==="kids"&&!child?<><SHeader title="أبنائي"/>{pending.map(k=><SCard key={k.student_id}><GRow first icon={Users} title={k.student??"بانتظار توثيق العلاقة"} subtitle="ستظهر البيانات بعد توثيق المدرسة للعلاقة"/></SCard>)}</>:null}
      {tab==="comm"?<GuardianComm tab={commTab} onTab={setCommTab} onOpen={c=>{setConv(c);setSub("thread");}} onNew={()=>setSub("newchat")}/>:null}
      {tab==="more"?<><SHeader eyebrow="كل ما تحتاجه لمتابعة أبنائك" title="الخدمات"/>{childPicker}{childHeader}<SSearch value={search} onChange={setSearch} placeholder="ابحث عن خدمة…" label="البحث في الخدمات"/>{MORE.map(g=>{const keys=g.keys.filter(k=>SUB[k].label.includes(search.trim()));return keys.length?<View key={g.title} style={styles.group}><SSection title={g.title}/><View style={styles.grid}>{keys.map(tile)}</View></View>:null;})}{search&&!Object.values(SUB).some(x=>x.label.includes(search.trim()))?<Notice tone="info">لا توجد خدمات مطابقة</Notice>:null}</>:null}
      {tab==="account"?<>
        <View style={[styles.hero,styles.profileHero]}><View style={styles.avatar}><AppText style={styles.initial} weight="bold" color={G.primary}>{name.charAt(0)}</AppText></View><AppText variant="title" weight="bold" color={G.onPrimary} align="center">{name}</AppText><AppText variant="caption" color={G.onPrimaryMuted} align="center">{`ولي أمر · ${active?.schoolName??""}`}</AppText></View>
        <SSection title="بيانات ولي الأمر"/><View style={styles.listGroup}><GRow first icon={IdCard} title="رقم الهوية الوطنية"><AppText style={styles.ltr} color={G.ink}>{maskNationalId(profile?.national_id)||"غير مسجل"}</AppText></GRow><GRow icon={UserRound} title="رقم الجوال المسجل"><AppText style={styles.ltr} color={G.ink}>{maskPhone(profile?.phone)||"غير مسجل"}</AppText></GRow><GRow icon={School} title="المدرسة التابع لها" subtitle={active?.schoolName||"غير مسجلة"}/></View>
        <SSection title="الأبناء المرتبطون بالحساب" end={<SBadge label={`${here.length} مرتبطين`}/>}/><View style={styles.listGroup}>{here.map((k,i)=><GRow key={k.student_id} first={i===0} icon={Users} title={k.student??"بانتظار توثيق العلاقة"} subtitle={canFollow(k)?[k.grade,k.section].filter(Boolean).join(" · "):"بانتظار توثيق المدرسة"} onPress={canFollow(k)?()=>{setSelected(k.student_id);setTab("kids");}:undefined}/>)}{!here.length?<AppText style={styles.empty} color={G.text2}>{loading?"جارٍ التحميل…":"لا يوجد أبناء مرتبطون في هذه المدرسة"}</AppText>:null}</View>
        <SSection title="إدارة الحساب والخدمات"/><View style={styles.listGroup}>{contexts.length>1?<GRow first icon={Repeat} title="تبديل الصفة" onPress={onSwitch}/>:null}<GRow first={contexts.length<=1} icon={ClipboardList} title="طلبات ولي الأمر والأذونات" subtitle="الموافقات والزيارات والاستئذان" onPress={()=>go("requests")}/><GRow icon={Bell} title="التنبيهات والرسائل" onPress={()=>showComm("notifications")}/><GRow icon={LifeBuoy} title="الدعم الفني والمساعدة المدرسية" onPress={()=>openSection("support")}/></View>
        {exitError?<Notice tone="error">تعذر تسجيل الخروج. حاول مرة أخرى.</Notice>:null}
        {confirm?<View style={styles.group}><AppText>تأكيد تسجيل الخروج</AppText><Button title="إلغاء" variant="secondary" onPress={()=>setConfirm(false)}/><Button title="تأكيد الخروج" variant="destructive" loading={busy} onPress={()=>void leave()}/></View>:<Button title="تسجيل الخروج" variant="destructive" icon={LogOut} loading={busy} onPress={askLeave}/>}
      </>:null}
    </SScreen>)}</View><BottomBar items={TABS} value={tab} onChange={setTab} palette={BAR}/>
  </View></FontSetContext.Provider>;
}
const styles=StyleSheet.create({
 flex:{flex:1,},row:{flexDirection:"row",alignItems:"center",gap:SPACING.md},
 hero:{backgroundColor:G.primary,borderRadius:GR.card,padding:SPACING.xl,gap:SPACING.lg,...GSHADOW.l2},
 avatar:{width:68,height:68,borderRadius:34,backgroundColor:G.mintStrong,alignItems:"center",justifyContent:"center"},initial:{fontSize:30,lineHeight:44},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:SPACING.md},tileWrap:{flexBasis:"46%",flexGrow:1},tile:{minHeight:156,gap:SPACING.sm},disabled:{opacity:0.5},
 listGroup:{backgroundColor:G.surface,paddingHorizontal:SPACING.lg,borderRadius:GR.tile},group:{gap:SPACING.md},
 profileHero:{alignItems:"center"},ltr:{writingDirection:"ltr",textAlign:"right",flexShrink:1},empty:{paddingVertical:SPACING.lg},academicHeader:{padding:SPACING.lg,gap:SPACING.md,backgroundColor:G.canvas}
});
