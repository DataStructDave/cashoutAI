import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import Header, { HEADER_HEIGHT } from "../components/Header";
import { colors, fontSizes, radii, spacing } from "../theme";
import { useEntryStore } from "../store/EntryStore";
import { appendSlipsForDate, replaceSlipsForDate } from "../store/slipsStorage";
import { trackEvent } from "../utils/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "Summary">;

const PAYMENT_TYPE_LABELS = [
  "Mastercard",
  "Debit",
  "Visa",
  "Amex",
  "Cash",
  "Other",
] as const;

type Totals = {
  subtotal: number;
  tip: number;
  total: number;
};

function parseAmount(value?: string): number {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function SummaryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { entries, clearEntries, clearImages } = useEntryStore();
  const editDate = route.params?.editDate;

  const { totalsByPaymentType, countByPaymentType, paymentTypesWithSlips } =
    useMemo(() => {
      const totals: Record<string, Totals> = {};
      const counts: Record<string, number> = {};

      PAYMENT_TYPE_LABELS.forEach((label) => {
        totals[label] = { subtotal: 0, tip: 0, total: 0 };
        counts[label] = 0;
      });

      for (const entry of entries) {
        const rawKey = entry.paymentType?.trim() || "Other";
        const paymentType = PAYMENT_TYPE_LABELS.includes(
          rawKey as (typeof PAYMENT_TYPE_LABELS)[number]
        )
          ? rawKey
          : "Other";

        totals[paymentType].subtotal += parseAmount(entry.subtotal);
        totals[paymentType].tip += parseAmount(entry.tip);
        totals[paymentType].total += parseAmount(entry.total);
        counts[paymentType] += 1;
      }

      const withSlips = PAYMENT_TYPE_LABELS.filter(
        (label) => counts[label] > 0
      );

      return {
        totalsByPaymentType: totals,
        countByPaymentType: counts,
        paymentTypesWithSlips: withSlips,
      };
    }, [entries]);

  return (
    <View style={styles.container}>
      <Header title="CashoutAI" />

      <TouchableOpacity
        style={[styles.backButton, { top: HEADER_HEIGHT + insets.top + 6 }]}
        onPress={() => navigation.navigate("CountSlips")}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </TouchableOpacity>

      <View
        style={[
          styles.content,
          {
            paddingTop: HEADER_HEIGHT + insets.top + 42,
            paddingBottom: insets.bottom,
            paddingHorizontal: 20,
          },
        ]}
      >
        {paymentTypesWithSlips.map((label) => {
          const totals = totalsByPaymentType[label];
          const slipCount = countByPaymentType[label];

          return (
            <View key={label} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.slipCount}>
                  {slipCount} slip{slipCount !== 1 ? "s" : ""}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Subtotal</Text>
                <Text style={styles.rowValue}>
                  ${totals.subtotal.toFixed(2)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Tips</Text>
                <Text style={styles.rowValue}>${totals.tip.toFixed(2)}</Text>
              </View>

              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${totals.total.toFixed(2)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Home button */}
      <TouchableOpacity
        style={[styles.homeButton, { bottom: insets.bottom + 20, right: 20 }]}
        onPress={async () => {
          if (entries.length > 0) {
            trackEvent("cashout_submitted", {
              entry_count: entries.length,
              is_edit: !!editDate,
            });
            if (editDate) {
              await replaceSlipsForDate(editDate, entries);
            } else {
              const today = new Date().toLocaleDateString("en-CA");
              await appendSlipsForDate(today, entries);
            }
          }
          clearEntries();
          clearImages();
          navigation.navigate("Home");
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={24} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    position: "absolute",
    left: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 11,
  },
  content: {
    flex: 1,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.base,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  slipCount: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.primary,
  },

  /* Rows */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  rowValue: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.text,
  },

  /* Total row */
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.primaryDarker,
  },
  totalValue: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.textBlack,
  },

  /* Home button */
  homeButton: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
