import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import { colors, fontSizes, radii, spacing } from "../theme";
import { setOnboardingSeen } from "../store/onboardingStorage";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const SLIDES = [
  {
    id: "1",
    icon: "receipt-outline" as const,
    title: "Count slips in seconds",
    subtitle:
      "Scan receipts and let AI extract totals, tips, and card types—no typing.",
  },
  {
    id: "2",
    icon: "calendar-outline" as const,
    title: "History at a glance",
    subtitle:
      "View past days, edit slips, and see analytics by card type and tip %.",
  },
  {
    id: "3",
    icon: "flash-outline" as const,
    title: "Ready to cash out",
    subtitle: "Get accurate totals fast so you can close out and go home.",
  },
];

function Slide({ item, width }: { item: (typeof SLIDES)[0]; width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={64} color={colors.primary} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );
}

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
    }
  ).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const next = async () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      await setOnboardingSeen();
      navigation.replace("Boarding");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={({ item }) => <Slide item={item} width={width} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.88}
          onPress={next}
        >
          <Text style={styles.buttonText}>
            {index === SLIDES.length - 1 ? "Get started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["3xl"],
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  slideTitle: {
    fontSize: fontSizes["2xl"],
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  slideSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.onPrimary,
  },
});
