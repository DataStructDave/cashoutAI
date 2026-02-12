import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Entry } from "./types";
import { colors, fontSizes, radii, spacing } from "../../theme";

/** Format numeric input to 2 decimals (e.g. "3" -> "3.00", "$3.5" -> "3.50"). */
function formatMoney(s: string): string {
  const cleaned = s.replace(/^\s*\$?\s*/, "").trim();
  if (!cleaned) return "";
  const n = parseFloat(cleaned);
  if (isNaN(n)) return s;
  return n.toFixed(2);
}

const PAYMENT_OPTIONS = [
  "Mastercard",
  "Debit",
  "Visa",
  "Amex",
  "Cash",
  "Other",
] as const;

type ManualEntryProps = {
  subtotal: string;
  tip: string;
  total: string;
  paymentMethod: string;
  setSubtotal: (v: string) => void;
  setTip: (v: string) => void;
  setTotal: (v: string) => void;
  setPaymentMethod: (v: string) => void;
  onAddEntry: () => void;
};

export default function ManualEntry({
  subtotal,
  tip,
  total,
  paymentMethod,
  setSubtotal,
  setTip,
  setTotal,
  setPaymentMethod,
  onAddEntry,
}: ManualEntryProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <View style={styles.manualEntryBlock}>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Subtotal</Text>
        <TextInput
          style={styles.input}
          value={subtotal}
          onChangeText={setSubtotal}
          onBlur={() => setSubtotal((v) => formatMoney(v))}
          placeholder="0.00"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Tip</Text>
        <TextInput
          style={styles.input}
          value={tip}
          onChangeText={setTip}
          onBlur={() => setTip((v) => formatMoney(v))}
          placeholder="0.00"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Total</Text>
        <TextInput
          style={styles.input}
          value={total}
          onChangeText={setTotal}
          onBlur={() => setTotal((v) => formatMoney(v))}
          placeholder="0.00"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen((o) => !o)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.dropdownText,
              !paymentMethod && styles.dropdownPlaceholder,
            ]}
          >
            {paymentMethod || "Select payment type"}
          </Text>
          <Ionicons
            name={dropdownOpen ? "chevron-up" : "chevron-down"}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
        {dropdownOpen && (
          <View style={styles.dropdownOptions}>
            {PAYMENT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownOption}
                onPress={() => {
                  setPaymentMethod(opt);
                  setDropdownOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.previewBox}>
        <Text style={styles.previewRow}>
          Subtotal: {subtotal ? `$${subtotal}` : "—"}
        </Text>
        <Text style={styles.previewRow}>Tip: {tip ? `$${tip}` : "—"}</Text>
        <Text style={styles.previewRow}>
          Total: {total ? `$${total}` : "—"}
        </Text>
        <Text style={styles.previewRow}>Payment: {paymentMethod || "—"}</Text>
      </View>
      <TouchableOpacity
        style={styles.addEntryButton}
        onPress={onAddEntry}
        activeOpacity={0.8}
      >
        <Text style={styles.addEntryButtonText}>Add entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  manualEntryBlock: {
    width: "100%",
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.primaryDark,
    minWidth: 72,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  dropdownWrapper: {
    width: "100%",
    marginTop: spacing.sm,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownText: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: colors.placeholder,
  },
  dropdownOptions: {
    marginTop: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dropdownOption: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  dropdownOptionText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
  previewBox: {
    width: "100%",
    marginTop: spacing.lg,
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewRow: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  addEntryButton: {
    width: "100%",
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addEntryButtonText: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.primary,
  },
});
