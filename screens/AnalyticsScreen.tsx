import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import Header, { HEADER_HEIGHT } from "../components/Header";
import { colors, fontSizes, radii, spacing } from "../theme";
import type { Entry } from "./CountSlips/types";

type Props = NativeStackScreenProps<RootStackParamList, "Analytics">;

const PAYMENT_TYPE_LABELS = [
  "Mastercard",
  "Debit",
  "Visa",
  "Amex",
  "Cash",
  "Other",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Totals = {
  subtotal: number;
  tip: number;
  total: number;
};

function parseAmount(value?: string): number {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function AnalyticsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { date, entries } = route.params ?? {
    date: "",
    entries: [] as Entry[],
  };

  const {
    totalsByPaymentType,
    countByPaymentType,
    paymentTypesWithSlips,
    tipAveragePct,
    tipAvgPctByType,
  } = useMemo(() => {
    const totals: Record<string, Totals> = {};
    const counts: Record<string, number> = {};
    const tipPercentsByType: Record<string, number[]> = {};

    PAYMENT_TYPE_LABELS.forEach((label) => {
      totals[label] = { subtotal: 0, tip: 0, total: 0 };
      counts[label] = 0;
      tipPercentsByType[label] = [];
    });

    const tipPercents: number[] = [];
    for (const entry of entries) {
      const rawKey = entry.paymentType?.trim() || "Other";
      const paymentType = PAYMENT_TYPE_LABELS.includes(
        rawKey as (typeof PAYMENT_TYPE_LABELS)[number]
      )
        ? rawKey
        : "Other";

      const subtotal = parseAmount(entry.subtotal);
      const tip = parseAmount(entry.tip);
      totals[paymentType].subtotal += subtotal;
      totals[paymentType].tip += tip;
      totals[paymentType].total += parseAmount(entry.total);
      counts[paymentType] += 1;
      if (subtotal > 0) {
        const pct = (tip / subtotal) * 100;
        tipPercents.push(pct);
        tipPercentsByType[paymentType].push(pct);
      }
    }

    const withSlips = PAYMENT_TYPE_LABELS.filter((label) => counts[label] > 0);

    const tipAvgPct =
      tipPercents.length > 0
        ? tipPercents.reduce((a, b) => a + b, 0) / tipPercents.length
        : 0;

    const tipAvgPctByType: Record<string, number> = {};
    PAYMENT_TYPE_LABELS.forEach((label) => {
      const arr = tipPercentsByType[label];
      tipAvgPctByType[label] =
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    });

    return {
      totalsByPaymentType: totals,
      countByPaymentType: counts,
      paymentTypesWithSlips: withSlips,
      tipAveragePct: tipAvgPct,
      tipAvgPctByType,
    };
  }, [entries]);

  return (
    <View style={styles.container}>
      <Header title="Analytics" />

      <TouchableOpacity
        style={[styles.backButton, { top: HEADER_HEIGHT + insets.top + 6 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </TouchableOpacity>

      <View
        style={[
          styles.content,
          {
            paddingTop: HEADER_HEIGHT + insets.top + 42,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          },
        ]}
      >
        {date ? (
          <Text style={styles.dateTitle}>{formatDisplayDate(date)}</Text>
        ) : null}

        {/* Tip average % */}
        <View style={styles.tipAverageCard}>
          <Text style={styles.tipAverageLabel}>Tip average %</Text>
          <Text style={styles.tipAverageValue}>
            {tipAveragePct.toFixed(1)}%
          </Text>
          <Text style={styles.tipAverageMeta}>
            across {entries.length} slip{entries.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Totals by card type – scrollable when overflow */}
        <ScrollView
          style={styles.cardsScroll}
          contentContainerStyle={styles.cardsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {paymentTypesWithSlips.map((label) => {
            const totals = totalsByPaymentType[label];
            const slipCount = countByPaymentType[label];
            const avgTipPct = tipAvgPctByType[label] ?? 0;

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

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Avg tip %</Text>
                  <Text style={styles.rowValue}>{avgTipPct.toFixed(1)}%</Text>
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
        </ScrollView>
      </View>
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
    zIndex: 11,
  },
  content: {
    flex: 1,
  },
  cardsScroll: {
    flex: 1,
  },
  cardsScrollContent: {
    paddingBottom: spacing.lg,
  },
  dateTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  tipAverageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tipAverageLabel: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tipAverageValue: {
    fontSize: fontSizes["2xl"],
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
  tipAverageMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
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
});
