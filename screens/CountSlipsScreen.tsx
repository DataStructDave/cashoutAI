import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import Header, { HEADER_HEIGHT } from "../components/Header";
import EntrySheet, { COLLAPSED_HEIGHT } from "./CountSlips/EntrySheet";
import ScanEntry from "./CountSlips/ScanEntry";
import ManualEntry from "./CountSlips/ManualEntry";
import type { Entry } from "./CountSlips/types";
import { useEntryStore } from "../store/EntryStore";
import { replaceSlipsForDate } from "../store/slipsStorage";
import { colors, fontSizes, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "CountSlips">;
type EntryMode = "scan" | "manual";

export type { Entry } from "./CountSlips/types";

function CountSlipsScreenContent({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const {
    entries,
    addEntry,
    removeEntry,
    clearEntries,
    loadEntries,
    selectedImages,
    addImage,
    removeImage,
    clearImages,
  } = useEntryStore();

  // When navigating from History (Edit), pre-load that day's entries
  useEffect(() => {
    const initialEntries = route.params?.entries;
    if (initialEntries?.length) {
      loadEntries(initialEntries);
      clearImages();
    }
  }, [route.params?.entries]);

  const isEditingFromHistory = !!route.params?.date;

  const [entryMode, setEntryMode] = useState<EntryMode>("scan");
  const [extracting, setExtracting] = useState(false);
  const [subtotal, setSubtotal] = useState("");
  const [tip, setTip] = useState("");
  const [total, setTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const [isTotalManual, setIsTotalManual] = useState(false);

  /* ---------------- SMART TOTAL ---------------- */
  useEffect(() => {
    const s = parseFloat(subtotal);
    const t = parseFloat(tip);

    if (!isTotalManual && (s || t)) {
      const next = (s || 0) + (t || 0);
      setTotal(next.toFixed(2));
    }

    if (!subtotal && !tip) {
      setTotal("");
      setIsTotalManual(false);
    }
  }, [subtotal, tip, isTotalManual]);
  /* --------------------------------------------- */

  const formatMoney = (s: string) => {
    const cleaned = s.replace(/^\s*\$?\s*/, "").trim();
    if (!cleaned) return "";
    const n = parseFloat(cleaned);
    if (isNaN(n)) return s;
    return n.toFixed(2);
  };

  const handleAddEntry = () => {
    if (!total) return;

    addEntry({
      subtotal: subtotal ? formatMoney(subtotal) : undefined,
      tip: tip ? formatMoney(tip) : undefined,
      total: formatMoney(total),
      paymentType: paymentMethod || undefined,
    });

    setSubtotal("");
    setTip("");
    setTotal("");
    setPaymentMethod("");
    setIsTotalManual(false);
  };

  const editEntry = (index: number) => {
    const entry = entries[index];
    if (!entry) return;

    setSheetExpanded(false);
    setEntryMode("manual");

    setSubtotal(entry.subtotal ?? "");
    setTip(entry.tip ?? "");
    setTotal(entry.total);
    setPaymentMethod(entry.paymentType ?? "");
    setIsTotalManual(true);

    removeEntry(index);
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Header title="cashOutAI" />

          <TouchableOpacity
            style={[styles.backButton, { top: HEADER_HEIGHT + insets.top + 8 }]}
            onPress={() => {
              if (isEditingFromHistory) {
                clearEntries();
                clearImages();
                navigation.navigate("History");
                return;
              }
              if (entries.length === 0 && selectedImages.length === 0) {
                navigation.navigate("Home");
                return;
              }

              Alert.alert("Go back", "All progress will be lost.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Leave",
                  style: "destructive",
                  onPress: () => {
                    clearEntries();
                    clearImages();
                    navigation.navigate("Home");
                  },
                },
              ]);
            }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>

          <View
            style={[
              styles.content,
              {
                paddingTop: HEADER_HEIGHT + insets.top + 16,
                paddingBottom: COLLAPSED_HEIGHT + insets.bottom + 8,
              },
            ]}
          >
            {/* Toggle */}
            <View style={styles.toggleWrapper}>
              <View style={styles.toggleTrack}>
                <TouchableOpacity
                  style={[
                    styles.toggleSegment,
                    entryMode === "scan" && styles.toggleSegmentActive,
                  ]}
                  onPress={() => setEntryMode("scan")}
                >
                  <Ionicons
                    name="scan-outline"
                    size={22}
                    color={
                      entryMode === "scan" ? colors.onPrimary : colors.primary
                    }
                  />
                  {extracting && (
                    <View
                      style={[
                        styles.extractingDot,
                        entryMode !== "scan" && styles.extractingDotInactive,
                      ]}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleSegment,
                    entryMode === "manual" && styles.toggleSegmentActive,
                  ]}
                  onPress={() => setEntryMode("manual")}
                >
                  <Ionicons
                    name="create"
                    size={22}
                    color={
                      entryMode === "manual" ? colors.onPrimary : colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            {entryMode === "scan" && (
              <ScanEntry
                selectedImages={selectedImages}
                onImageAdded={addImage}
                onImageRemoved={removeImage}
                extracting={extracting}
                onExtractingChange={setExtracting}
                onExtractedEntries={(entries) => {
                  entries.forEach(addEntry);
                  clearImages();
                  setSheetExpanded(true);
                }}
              />
            )}

            {entryMode === "manual" && (
              <ManualEntry
                subtotal={subtotal}
                tip={tip}
                total={total}
                paymentMethod={paymentMethod}
                setSubtotal={(v) => {
                  setSubtotal(v);
                  setIsTotalManual(false);
                }}
                setTip={(v) => {
                  setTip(v);
                  setIsTotalManual(false);
                }}
                setTotal={(v) => {
                  setTotal(v);
                  setIsTotalManual(true);
                }}
                setPaymentMethod={setPaymentMethod}
                onAddEntry={handleAddEntry}
              />
            )}

            <View style={styles.bottomSpacer} />

            <TouchableOpacity
              style={styles.cashoutButton}
              onPress={async () => {
                if (isEditingFromHistory) {
                  const editDate = route.params?.date;
                  if (editDate) {
                    await replaceSlipsForDate(editDate, entries);
                  }
                  clearEntries();
                  clearImages();
                  navigation.navigate("History", { fromFixChanges: true });
                } else {
                  if (entries.length === 0) {
                    Alert.alert("Oops! no entries found.");
                    return;
                  }
                  navigation.navigate("Summary", {
                    editDate: route.params?.date,
                  });
                }
              }}
            >
              <Text style={styles.cashoutButtonText}>
                {isEditingFromHistory ? "Fix changes" : "Cashout"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <EntrySheet
        entries={entries}
        expanded={sheetExpanded}
        onToggle={() => setSheetExpanded((v) => !v)}
        onEditEntry={editEntry}
        onRemoveEntry={removeEntry}
      />
    </View>
  );
}

export default function CountSlipsScreen(props: Props) {
  return <CountSlipsScreenContent {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backButton: { position: "absolute", left: spacing.xl },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  toggleWrapper: { marginTop: spacing.xl },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xs,
  },
  toggleSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radii.base,
    position: "relative",
  },
  toggleSegmentActive: { backgroundColor: colors.primary },
  extractingDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onPrimary,
    opacity: 0.9,
  },
  extractingDotInactive: { backgroundColor: colors.primary },
  bottomSpacer: { flex: 1 },
  cashoutButton: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  cashoutButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.onPrimary,
  },
});
