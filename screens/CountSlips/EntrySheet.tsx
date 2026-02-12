import { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header, { HEADER_HEIGHT } from "../../components/Header";
import type { Entry } from "./types";
import { colors, fontSizes, radii, spacing } from "../../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
export const COLLAPSED_HEIGHT = 100;

type EntrySheetProps = {
  entries: Entry[];
  expanded: boolean;
  onToggle: () => void;
  onEditEntry: (index: number) => void;
  onRemoveEntry: (index: number) => void;
};

export default function EntrySheet({
  entries,
  expanded,
  onToggle,
  onEditEntry,
  onRemoveEntry,
}: EntrySheetProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const expandedHeight = SCREEN_HEIGHT - (HEADER_HEIGHT + insets.top);
  const handleAreaHeight = 38 + insets.bottom;
  const scrollAreaHeight = expandedHeight - handleAreaHeight;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [expanded, anim]);

  // When sheet is closed, scroll content back to top
  useEffect(() => {
    if (!expanded) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [expanded]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEIGHT + insets.bottom, expandedHeight],
  });

  return (
    <Animated.View style={[styles.sheet, { height }]}>
      {/* Empty state: centered in entire sheet (closed and open) */}
      {entries.length === 0 && (
        <View style={styles.placeholderOverlay} pointerEvents="none">
          <View style={styles.placeholderWrapper}>
            <Text style={styles.sheetPlaceholder}>No entries yet</Text>
          </View>
        </View>
      )}

      {/* Handle */}
      <TouchableOpacity
        style={[
          styles.sheetHandle,
          { paddingTop: 8, paddingBottom: 8 + insets.bottom },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8 }}
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-up"}
          size={28}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.sheetContent}>
        {entries.length === 0 ? null : (
          <ScrollView
            ref={scrollRef}
            style={[styles.sheetScrollView, { maxHeight: scrollAreaHeight }]}
            contentContainerStyle={styles.sheetListContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {entries.map((entry, index) => (
              <View key={index} style={styles.entryCard}>
                {/* Entry Info */}
                <View style={styles.entryCardContent}>
                  <Text style={styles.entryRow}>
                    Subtotal: {entry.subtotal ? `$${entry.subtotal}` : "—"}
                  </Text>
                  <Text style={styles.entryRow}>
                    Tip: {entry.tip ? `$${entry.tip}` : "—"}
                  </Text>
                  <Text style={styles.entryRow}>Total: ${entry.total}</Text>
                  <Text style={styles.entryRow}>
                    Payment: {entry.paymentType || "—"}
                  </Text>
                </View>

                {/* Inline Actions */}
                <View style={styles.entryActions}>
                  <TouchableOpacity
                    onPress={() => onEditEntry(index)}
                    hitSlop={12}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onRemoveEntry(index)}
                    hitSlop={12}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* ---------- Sheet ---------- */

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 20,
    overflow: "hidden",
  },

  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  sheetHandle: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 48,
    zIndex: 1,
  },

  sheetContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing["2xl"],
    paddingTop: 0,
  },

  placeholderWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },

  sheetPlaceholder: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  sheetScrollView: {
    flex: 1,
    minHeight: 0,
  },

  sheetListContent: {
    paddingBottom: spacing["3xl"],
  },

  /* ---------- Entry ---------- */

  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  entryCardContent: {
    flex: 1,
    minWidth: 0,
  },

  entryRow: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: 2,
  },

  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    marginLeft: spacing.base,
  },
});
