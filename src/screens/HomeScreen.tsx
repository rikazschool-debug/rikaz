import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { Button, COLORS } from "../components/UiComponents";
import { MembershipItem } from "../api/types";

export const HomeScreen: React.FC = () => {
  const { user, activeContext, memberships, switchContext, signOut, refreshPermissions } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activePermsList = Object.entries(activeContext?.permissions || {})
    .filter(([_, allowed]) => allowed)
    .map(([key]) => key);

  async function handleSelectContext(item: MembershipItem) {
    if (!item.school_id) return;
    setModalVisible(false);
    await switchContext(item.school_id, item.role, item.school_name || "الفرع المختار", item.org_id);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshPermissions();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Bar */}
        <View style={styles.topBar}>
          <Button
            title="خروج"
            variant="outline"
            onPress={signOut}
            style={styles.logoutBtn}
          />
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>مرحبًا بك</Text>
            <Text style={styles.userNameText}>{user?.email || "مستخدم ركاز"}</Text>
          </View>
        </View>

        {/* Active Context Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.switchButtonText}>تبديل المدرسة / الدور ▾</Text>
            </TouchableOpacity>
            <Text style={styles.contextLabel}>السياق النشط حاليًا</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{activeContext?.schoolName || "لم يتم اختيار مدرسة"}</Text>
            <Text style={styles.infoKey}>المدرسة / الفرع:</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{activeContext?.roleLabel || "غير محدد"}</Text>
            </View>
            <Text style={styles.infoKey}>الدور الحالي:</Text>
          </View>
        </View>

        {/* Permissions & Features Card */}
        <View style={styles.permsCard}>
          <View style={styles.permsCardHeader}>
            <Button
              title={refreshing ? "جارٍ التحديث..." : "تحديث الصلاحيات"}
              variant="ghost"
              onPress={handleRefresh}
              disabled={refreshing}
              style={{ height: 36, paddingHorizontal: 10 }}
            />
            <Text style={styles.permsCardTitle}>الصلاحيات الفعلية للفرع (perm_my_school)</Text>
          </View>

          <Text style={styles.permsNotice}>
            تطبيق الجوال يتبع الصلاحيات الدقيقة الممنوحة للحساب، ولا يعتمد على مسمى الدور وحده.
          </Text>

          {activePermsList.length === 0 ? (
            <View style={styles.emptyPerms}>
              <Text style={styles.emptyPermsText}>لا توجد صلاحيات استثنائية مسندة لهذا الفرع</Text>
            </View>
          ) : (
            <View style={styles.chipsContainer}>
              {activePermsList.map(permKey => (
                <View key={permKey} style={styles.permChip}>
                  <Text style={styles.permChipText}>{permKey}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Note on pending modules */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>حالة الأقسام</Text>
          <Text style={styles.noteDesc}>
            تم ضبط البنية وتفعيل بوابات الدخول وحفظ الجلسة الآمن. الأقسام المتخصصة تظهر تلقائيًا عند استكمالها دون إظهار روابط وهمية.
          </Text>
        </View>
      </ScrollView>

      {/* Context Switcher Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختيار المدرسة والدور</Text>
            <Text style={styles.modalSubtitle}>
              اختر المدرسة والدور الذي تريد العمل ضمن سياقه
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {memberships.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.membershipItem,
                    activeContext?.schoolId === item.school_id &&
                    activeContext?.role === item.role &&
                    styles.membershipItemActive,
                  ]}
                  onPress={() => handleSelectContext(item)}
                >
                  <Text style={styles.membershipSchool}>{item.school_name}</Text>
                  <Text style={styles.membershipRole}>{item.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="إغلاق"
              variant="secondary"
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
  },
  topBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  welcomeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  logoutBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderColor: "#EF4444",
  },
  contextCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  contextHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contextLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primaryDark,
  },
  switchButton: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  switchButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  infoKey: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 13,
  },
  permsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  permsCardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  permsCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
  permsNotice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 12,
    lineHeight: 18,
  },
  chipsContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  permChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permChipText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  emptyPerms: {
    padding: 16,
    alignItems: "center",
  },
  emptyPermsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  noteCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 4,
  },
  noteDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 16,
  },
  membershipItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  membershipItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  membershipSchool: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  membershipRole: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
