import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import { colors, fontSizes, radii, spacing } from "../theme";
import { setPaywallUnlocked } from "../store/onboardingStorage";
import { trackEvent } from "../utils/analytics";
import {
  getOfferings,
  getCustomerInfo,
  hasPremiumAccess,
  purchasePackage,
  restorePurchases,
} from "../services/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

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

const FALLBACK_MONTHLY_PRICE = "$9.99";
const FALLBACK_YEARLY_PRICE = "$89.99";

// Set in .env or EAS: EXPO_PUBLIC_PRIVACY_POLICY_URL, EXPO_PUBLIC_TERMS_URL (optional; defaults to Apple EULA)
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "";
const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ??
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

export default function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(
    null,
  );
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(
    null,
  );
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const selectedPackage =
    selectedPlan === "yearly" ? annualPackage : monthlyPackage;
  const monthlyPrice =
    monthlyPackage?.product.priceString ?? FALLBACK_MONTHLY_PRICE;
  const yearlyPrice =
    annualPackage?.product.priceString ?? FALLBACK_YEARLY_PRICE;
  const yearlyPerMonth =
    annualPackage?.product.pricePerMonthString ?? "$7.49/mo";

  useEffect(() => {
    trackEvent("paywall_viewed");
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCustomerInfo().then((info) => {
      if (cancelled) return;
      if (info && hasPremiumAccess(info)) {
        setPaywallUnlocked().then(() => navigation.replace("Home"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    setLoadingOfferings(true);
    getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        const current = offerings?.current ?? null;
        setMonthlyPackage(current?.monthly ?? null);
        setAnnualPackage(current?.annual ?? null);
      })
      .catch(() => {
        if (!cancelled)
          Alert.alert(
            "Could not load plans",
            "Could not load plans. Please try again.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingOfferings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unlockAndGoHome = async () => {
    await setPaywallUnlocked();
    navigation.replace("Home");
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      Alert.alert("Please wait", "Plans are still loading. Please try again.");
      return;
    }
    setPurchasing(true);
    try {
      trackEvent("paywall_conversion_attempt", { plan: selectedPlan });
      const customerInfo = await purchasePackage(selectedPackage);
      if (hasPremiumAccess(customerInfo)) {
        await unlockAndGoHome();
      } else {
        Alert.alert(
          "Purchase",
          "Purchase did not grant access. Please try Restore.",
        );
      }
    } catch (err: unknown) {
      const userCancelled =
        err && typeof err === "object" && "userCancelled" in err
          ? Boolean((err as { userCancelled?: boolean }).userCancelled)
          : false;
      if (userCancelled) {
        Alert.alert("Purchase cancelled");
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Purchase failed.";
      Alert.alert("Purchase failed", message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      trackEvent("paywall_restore_tapped");
      const customerInfo = await restorePurchases();
      if (hasPremiumAccess(customerInfo)) {
        await unlockAndGoHome();
      } else {
        Alert.alert(
          "No subscription",
          "No active subscription found for this account.",
        );
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Restore failed.";
      Alert.alert("Restore failed", message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View
        style={[
          styles.scrollContent,
          {
            flex: 1,
            justifyContent: "space-evenly",
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Unlock CashoutAI</Text>
          <Image
            source={require("../assets/cashoutAI_icon.png")}
            style={styles.titleLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.features}>
          {FEATURES.map(({ icon, label }) => (
            <View key={label} style={styles.featureRow}>
              <Ionicons name={icon} size={20} color={colors.primary} />
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
            disabled={loadingOfferings}
          >
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planPrice}>
              <Text style={styles.planAmount}>{monthlyPrice}</Text>
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
            disabled={loadingOfferings}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Best value</Text>
            </View>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planPrice}>
              <Text style={styles.planAmount}>{yearlyPrice}</Text>
              <Text style={styles.planPeriod}>/yr</Text>
            </Text>
            <Text style={styles.planNote}>Save 25%</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (purchasing || loadingOfferings) && styles.buttonDisabled,
          ]}
          activeOpacity={0.88}
          onPress={handleSubscribe}
          disabled={purchasing || loadingOfferings}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>
              Start My 3-Day Free Trial
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.reminderText}>
          {selectedPlan === "monthly"
            ? `3 days free, then ${monthlyPrice} per month`
            : `3 days free, then ${yearlyPrice} per year (${yearlyPerMonth})`}
        </Text>

        <TouchableOpacity
          style={[styles.restoreButton, restoring && styles.buttonDisabled]}
          activeOpacity={0.88}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore purchase</Text>
          )}
        </TouchableOpacity>

        <View style={styles.termsBlock}>
          <Text style={styles.termsText}>
            Subscription automatically renews unless cancelled. Payment will be
            charged to your Apple ID. You can manage or cancel in Settings.
          </Text>
          <View style={styles.termsLinksRow}>
            {PRIVACY_POLICY_URL ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                activeOpacity={0.7}
              >
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
            ) : null}
            {PRIVACY_POLICY_URL && TERMS_URL ? (
              <Text style={styles.termsSeparator}> · </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => Linking.openURL(TERMS_URL)}
              activeOpacity={0.7}
            >
              <Text style={styles.termsLink}>Terms of Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes["3xl"],
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
  },
  titleLogo: {
    width: 40,
    height: 40,
  },
  features: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureLabel: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: "500",
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  trustLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  planRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
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
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
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
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  restoreButtonText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: "600",
  },
  termsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  termsText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  termsLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  termsLink: {
    fontSize: fontSizes.base,
    color: colors.primary,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  termsSeparator: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
