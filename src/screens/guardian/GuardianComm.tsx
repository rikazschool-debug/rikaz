import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Archive, PenSquare } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { DataState } from "../../components/StudentKit";
import { SBadge, SCard, SChips, SCircleButton, SHeader, SSearch, SWell } from "../../components/student/SKit";
import { GRow } from "../../components/guardian/GKit";
import { fetchConversations, inbox, KIND_LABEL, type Conversation } from "../../api/family";
import { useAuth } from "../../hooks/useAuth";
import { useLoad } from "../../hooks/useLoad";
import { shortWhen } from "../../lib/studentDay";
import { NotificationsList } from "../shared/Notifications";
import { Circulars } from "./GuardianExtras";
import { G } from "../../theme/guardian";
import { SPACING } from "../../theme/tokens";
export type GuardianCommTab="chats"|"notifications"|"circulars"|"archive";
export function GuardianComm({tab,onTab,onOpen,onNew}:{tab:GuardianCommTab;onTab:(t:GuardianCommTab)=>void;onOpen:(c:Conversation)=>void;onNew:()=>void}){
 const {active}=useAuth(); const [search,setSearch]=useState("");
 const q=useLoad(()=>fetchConversations(active?.schoolId??""),[active?.schoolId]);
 const rows=inbox(q.data??[],"guardian",tab==="archive").filter(c=>[c.title,c.student_name,c.last_body].some(v=>(v??"").includes(search.trim())));
 const unread=inbox(q.data??[],"guardian",false).reduce((n,c)=>n+(c.unread??0),0);
 const chats=tab==="chats"||tab==="archive";
 return <><SHeader eyebrow={active?.schoolName} title="التواصل والمحادثات" action={<SCircleButton icon={PenSquare} label="محادثة جديدة" onPress={onNew}/>}/><SChips label="التواصل" value={tab} onChange={onTab} items={[{key:"chats",label:"المحادثات",count:unread||undefined},{key:"notifications",label:"الإشعارات"},{key:"circulars",label:"التعاميم"},{key:"archive",label:"الأرشيف"}]}/>{chats?<SSearch value={search} onChange={setSearch} placeholder="ابحث في محادثات المعلمين والإدارة…" label="البحث في المحادثات"/>:null}
 {chats?<DataState loading={q.loading} error={q.error} empty={!rows.length} emptyTitle={search?"لا توجد نتائج مطابقة":tab==="archive"?"الأرشيف فارغ":"لا توجد محادثات"} onRetry={q.reload}><View style={st.list}>{rows.map(c=><SCard key={c.id} onPress={()=>onOpen(c)} label={c.title??"محادثة"} style={c.unread?st.unread:undefined}><View style={st.row}><View style={st.avatar}><AppText weight="bold" color={G.primary} style={st.initial}>{(c.title??"؟").replace(/^أ\.\s*/,"").charAt(0)}</AppText></View><View style={st.flex}><AppText variant="headline" weight="bold" color={G.ink}>{c.title??"محادثة"}</AppText><SBadge label={KIND_LABEL[c.kind]??"محادثة"}/>{c.student_name?<AppText variant="caption" color={G.text2}>{c.student_name}</AppText>:null}</View><View style={st.meta}>{c.last_at?<AppText variant="micro" color={G.text2}>{shortWhen(c.last_at)}</AppText>:null}{c.unread?<SBadge label={String(c.unread)} tone="primary"/>:null}</View></View><AppText color={G.text2} numberOfLines={3} style={st.message}>{c.last_body??"لا رسائل بعد"}</AppText></SCard>)}</View></DataState>:tab==="notifications"?<NotificationsList/>:<Circulars/>}
 {tab==="chats"?<GRow icon={Archive} title="المحادثات المؤرشفة" first onPress={()=>onTab("archive")}/>:null}</>;
}
const st=StyleSheet.create({flex:{flex:1},list:{gap:SPACING.md},row:{flexDirection:"row",alignItems:"center",gap:SPACING.md},avatar:{width:52,height:52,borderRadius:26,backgroundColor:G.mintStrong,alignItems:"center",justifyContent:"center"},initial:{fontSize:22,lineHeight:32},meta:{gap:SPACING.sm,alignItems:"center"},unread:{borderStartWidth:5,borderStartColor:G.primary},message:{marginTop:SPACING.md}});
