import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { RikazLogo } from "../components/RikazLogo";
import { Badge } from "../components/UiComponents";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS, ACCESSIBILITY } from "../theme/tokens";
import { MembershipItem } from "../api/types";
import { Building2, Users, GraduationCap, Briefcase, ChevronLeft } from "lucide-react-native";

interface ChooseRoleScreenProps {
  onSelected?: () => void;
}

/**
 * شاشة اختيار المدرسة والدور (مطابقة لـ src/routes/_authenticated/app/choose-role.tsx)
 * تظهر عند امتلاك المستخدم أكثر من صفة (مثلاً موظف + ولي أمر، أو معلم في أكثر من فرع)
 */
export const ChooseRoleScreen: React.FC<ChooseRoleScreenProps> = ({ onSelected }) => {
  const { user, memberships, activeContext, switchContext, signOut } = useAuth();

  const getRoleKind = (role: string) => {
    switch (role) {
      case "guardian":
        return { kind: "حساب الأسرة", icon: Users, badge: "guardian" as const };
      case "student":
        return { kind: "حساب الطالب", icon: GraduationCap, badge: "student" as const };
      default:
        return { kind: "حساب الموظف", icon: Briefcase, badge: "staff" as const };
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "مالك المؤسسة";
      case "principal":
        return "مدير المدرسة";
      case "vice_principal":
        return "وكيل المدرسة";
      case "teacher":
        return "معلم";
      case "student_affairs":
        return "شؤون الطلاب";
      case "counselor":
        return "موجه طلابي";
      case "nurse":
        return "مرشد صحي";
      case "security":
        return "حراسة وأمن";
      case "guardian":
        return "ولي أمر";
      case "student":
        return "طالب";
      default:
        return role;
    }
  };

  async function handleSelect(item: MembershipItem) {
    if (!item.school_id) return;
    await switchContext(
      item.school_id,
      item.role,
      item.school_name || "الفرع المختار",
      item.org_id
    );
    if (onSelected) onSelected();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={signOut}
          style={styles.signOutBtn}
          accessibilityLabel="تسجيل الخروج"
          hitSlop={ACCESSIBILITY.standardHitSlop}
        >
          <Text style={styles.signOutText}>تسجيل خروج</Text>
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <RikazLogo size={32} />
          <Text style={styles.headerTitle}>ركاز</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <View style={styles.heroSection}>
          <Text style={styles.title}>أهلاً بك في ركاز</Text>
          <Text style={styles.subtitle}>
            لديك أكثر من صفة. اختر الصفة التي تريد الدخول بها، ويمكنك التبديل لاحقاً من شريط السياق.
          </Text>
          {user?.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        <View style={styles.list}>
          {memberships.map((item) => {
            const { kind, icon: RoleIcon, badge } = getRoleKind(item.role);
            const isCurrent =
              activeContext?.schoolId === item.school_id &&
              activeContext?.role === item.role;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${kind}، ${getRoleLabel(item.role)} في ${item.school_name || "مدرسة"}`}
                style={[
                  styles.card,
                  isCurrent && styles.cardActive,
                ]}
              >
                <View style={styles.cardAccentBar} />
                <View style={styles.cardContent}>
                  <View style={styles.iconCircle}>
                    <RoleIcon size={24} color={COLORS.primary} />
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.badgeRow}>
                      <Badge label={kind} variant={badge} size="sm" />
                      {isCurrent && (
                        <Badge label="النشط حالياً" variant="primary" size="sm" />
                      )}
                    </View>

                    <Text style={styles.roleTitle}>{getRoleLabel(item.role)}</Text>

                    <View style={styles.schoolRow}>
                      <Building2 size={14} color={COLORS.mutedForeground} />
                      <Text style={styles.schoolName}>
                        {item.school_name || "المدرسة الرئيسية"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chevronWrapper}>
                    <ChevronLeft size={20} color={COLORS.mutedForeground} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerBrand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  signOutBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  signOutText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.destructive,
    fontWeight: "600",
  },
  container: {
    padding: SPACING.lg,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: "800",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 340,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.primaryDark,
    marginTop: SPACING.xs,
    fontWeight: "600",
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  cardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
  },
  cardAccentBar: {
    height: 3,
    backgroundColor: COLORS.primary,
  },
  cardContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    flex: 1,
    alignItems: "flex-end",
  },
  badgeRow: {
    flexDirection: "row-reverse",
    gap: SPACING.xs,
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: "800",
    color: COLORS.foreground,
    marginBottom: 4,
    textAlign: "right",
  },
  schoolRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  schoolName: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    fontWeight: "500",
  },
  chevronWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
});
