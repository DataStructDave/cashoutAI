import { useState, useEffect, useMemo } from "react";
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
import Header, { HEADER_HEIGHT } from "../components/Header";
import { colors, fontSizes, radii, spacing } from "../theme";
import { loadSlipsByDate, type SlipsByDate } from "../store/slipsStorage";
import type { Entry } from "./CountSlips/types";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function getCalendarDays(
  year: number,
  month: number
): { dateStr: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();

  const pad = (n: number) => n.toString().padStart(2, "0");

  const result: {
    dateStr: string;
    day: number;
    isCurrentMonth: boolean;
  }[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, 1 - (startPad - i));
    result.push({
      dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}`,
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    result.push({
      dateStr: `${year}-${pad(month + 1)}-${pad(day)}`,
      day,
      isCurrentMonth: true,
    });
  }

  while (result.length < 42) {
    const d = new Date(
      year,
      month + 1,
      result.length - daysInMonth - startPad + 1
    );

    result.push({
      dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}`,
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }

  return result;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function HistoryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const cellSize = Math.min(40, (width - spacing.xl * 2 - 12) / 7 - 4);
  const cellWithMargin = cellSize + 6;
  const gridWidth = 7 * cellWithMargin;

  const [slipsByDate, setSlipsByDate] = useState<SlipsByDate>({});
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadSlipsByDate().then(setSlipsByDate);
  }, []);

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const slipsForSelected = selectedDate ? slipsByDate[selectedDate] ?? [] : [];
  const datesWithSlips = useMemo(
    () => new Set(Object.keys(slipsByDate)),
    [slipsByDate]
  );

  return (
    <View style={styles.container}>
      <Header title="CashoutAI" />

      <TouchableOpacity
        style={[styles.backButton, { top: HEADER_HEIGHT + insets.top + 6 }]}
        onPress={() => navigation.navigate("Home")}
      >
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </TouchableOpacity>

      <View
        style={[
          styles.content,
          {
            paddingTop: HEADER_HEIGHT + insets.top + 48,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() =>
              setCurrentMonth(
                (d) => new Date(d.getFullYear(), d.getMonth() - 1)
              )
            }
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>

          <Text style={styles.monthLabel}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>

          <TouchableOpacity
            onPress={() =>
              setCurrentMonth(
                (d) => new Date(d.getFullYear(), d.getMonth() + 1)
              )
            }
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={[styles.weekdayRow, { width: gridWidth }]}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[styles.weekdayText, { width: cellSize }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={[styles.grid, { width: gridWidth }]}>
            {calendarDays.map(({ dateStr, day, isCurrentMonth }) => {
              const isSelected = dateStr === selectedDate;
              const hasSlips = datesWithSlips.has(dateStr);

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => setSelectedDate(dateStr)}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    isSelected && styles.cellSelected,
                    !isCurrentMonth && styles.cellMuted,
                  ]}
                >
                  {hasSlips && !isSelected && (
                    <View
                      style={[
                        styles.cellSlipRing,
                        {
                          width: cellSize * 0.7,
                          height: cellSize * 0.7,
                          borderRadius: (cellSize * 0.7) / 2,
                        },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Slip History: container only when there are slips; otherwise just text under calendar */}
        {selectedDate && slipsForSelected.length > 0 ? (
          <View style={styles.slipsContainer}>
            <View style={styles.slipsHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {formatDisplayDate(selectedDate)}
              </Text>
              <View style={styles.slipsHeaderButtons}>
                <TouchableOpacity
                  style={styles.slipsHeaderBtn}
                  onPress={() =>
                    navigation.navigate("Analytics", {
                      date: selectedDate,
                      entries: slipsForSelected,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={20}
                    color={colors.onPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.slipsHeaderBtn}
                  onPress={() =>
                    navigation.navigate("CountSlips", {
                      entries: slipsForSelected,
                      date: selectedDate,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={20}
                    color={colors.onPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              style={styles.slipsScroll}
              contentContainerStyle={styles.slipsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {slipsForSelected.map((entry: Entry, i: number) => (
                <View key={i} style={styles.slipCard}>
                  <Text style={styles.slipLine}>Total: ${entry.total}</Text>
                  <Text style={styles.slipMeta}>
                    Subtotal ${entry.subtotal ?? "—"} · Tip $
                    {entry.tip ?? "—"}
                  </Text>
                  <Text style={styles.slipMeta}>
                    {entry.paymentType || "Unknown"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : selectedDate ? (
          <View style={styles.emptyState}>
            <Text style={styles.muted}>No slips recorded.</Text>
            <TouchableOpacity
              style={styles.emptyStateAddBtn}
              onPress={() =>
                navigation.navigate("CountSlips", {
                  entries: [],
                  date: selectedDate,
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.muted}>Select a date to view slips</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  content: {
    flex: 1,
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    zIndex: 10,
  },

  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  monthLabel: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
  },

  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.base,
    marginBottom: spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: "center",
  },

  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  weekdayText: {
    textAlign: "center",
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  cell: {
    margin: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },

  cellSelected: {
    backgroundColor: colors.primary,
  },

  cellMuted: {
    opacity: 0.35,
  },

  cellSlipRing: {
    position: "absolute",
    backgroundColor: "rgba(119, 196, 110, 0.4)",
  },

  cellText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },

  cellTextSelected: {
    color: colors.onPrimary,
    fontWeight: "600",
  },

  slipsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    minHeight: 0,
  },

  slipsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.base,
    gap: spacing.sm,
  },

  slipsHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  slipsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  slipsScroll: {
    flex: 1,
  },

  slipsScrollContent: {
    paddingBottom: spacing.xl,
  },

  emptyState: {
    marginTop: spacing.xl,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  emptyStateAddBtn: {
    padding: 4,
  },

  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    flex: 1,
  },

  slipCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  slipLine: {
    fontSize: fontSizes.base,
    fontWeight: "600",
  },

  slipMeta: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  muted: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
  },
});
