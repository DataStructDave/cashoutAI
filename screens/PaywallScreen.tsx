import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import { colors, fontSizes, radii, spacing } from "../theme";
import { setPaywallUnlocked } from "../store/onboardingStorage";
import { trackEvent } from "../utils/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

type Plan = "monthly" | "yearly";

const FEATURES = [
  { icon: "scan-outline" as const, label: "Unlimited slip scanning" },
  { icon: "calendar-outline" as const, label: "Full history & calendar" },
  { icon: "stats-chart-outline" as const, label: "Analytics by card & tip %" },
];

const TRUST_ITEMS = [
  { icon: "shield-checkmark-outline" as const, label: "Secure payment" },
  { icon: "close-circle-outline" as const, label: "Cancel anytime" },
];

export default function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");

  const minContentHeight =
    windowHeight - insets.top - insets.bottom - spacing.lg;

  useEffect(() => {
    trackEvent("paywall_viewed");
  }, []);

  const goHome = async () => {
    await setPaywallUnlocked();
    navigation.replace("Home");
  };

  const handleSubscribe = () => {
    trackEvent("paywall_conversion_attempt", { plan: selectedPlan });
    goHome();
  };

  const handleRestore = () => {
    trackEvent("paywall_restore_tapped");
    goHome();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: minContentHeight,
            flexGrow: 1,
            justifyContent: "space-evenly",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Unlock cashOutAI</Text>
        <Text style={styles.subtitle}>
          Get the most out of your cashouts with full access to scanning,
          history, and analytics.
        </Text>

        <View style={styles.features}>
          {FEATURES.map(({ icon, label }) => (
            <View key={label} style={styles.featureRow}>
              <Ionicons name={icon} size={22} color={colors.primary} />
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trustRow}>
          {TRUST_ITEMS.map(({ icon, label }) => (
            <View key={label} style={styles.trustItem}>
              <Ionicons name={icon} size={18} color={colors.textMuted} />
              <Text style={styles.trustLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.planRow}>
          <TouchableOpacity
            style={[
              styles.card,
              styles.planCard,
              selectedPlan === "monthly" && styles.cardSelected,
            ]}
            activeOpacity={0.88}
            onPress={() => setSelectedPlan("monthly")}
          >
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planPrice}>
              <Text style={styles.planAmount}>$9.99</Text>
              <Text style={styles.planPeriod}>/mo</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              styles.planCard,
              selectedPlan === "yearly" && styles.cardSelected,
            ]}
            activeOpacity={0.88}
            onPress={() => setSelectedPlan("yearly")}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Best value</Text>
            </View>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planPrice}>
              <Text style={styles.planAmount}>$89.99</Text>
              <Text style={styles.planPeriod}>/yr</Text>
            </Text>
            <Text style={styles.planNote}>Save 25%</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={handleSubscribe}
        >
          <Text style={styles.primaryButtonText}>
            Start My 3-Day Free Trial
          </Text>
        </TouchableOpacity>

        <Text style={styles.reminderText}>
          {selectedPlan === "monthly"
            ? "3 days free, then $9.99 per month"
            : "3 days free, then $89.99 per year (7.49/mo)"}
        </Text>

        <TouchableOpacity
          style={styles.restoreButton}
          activeOpacity={0.88}
          onPress={handleRestore}
        >
          <Text style={styles.restoreButtonText}>Restore purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes["3xl"],
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  features: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: "500",
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trustLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  planRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    position: "relative",
  },
  planCard: {
    flex: 1,
    marginBottom: 0,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  badge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.onPrimary,
  },
  planTitle: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  planPrice: {
    marginTop: spacing.xs,
  },
  planAmount: {
    fontSize: fontSizes["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  planPeriod: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    fontWeight: "500",
  },
  planNote: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  reminderText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.onPrimary,
  },
  restoreButton: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  restoreButtonText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: "600",
  },
});
