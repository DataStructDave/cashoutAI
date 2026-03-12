import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigationTypes";
import { colors, fontSizes, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Boarding">;

export default function BoardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const goToPaywall = () => {
    navigation.replace("Paywall");
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.top}>
        <Text style={styles.title}>We want you try CashoutAI for free</Text>
        <View style={styles.imageWrap}>
          <Image
            source={require("../assets/IMG_0064.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.checkRow}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          <Text style={styles.checkLabel}>No payment due now</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={goToPaywall}
        >
          <Text style={styles.primaryButtonText}>Try for $0.00</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing["4xl"],
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "space-between",
  },
  top: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: fontSizes["4xl"],
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: -spacing.md,
    paddingHorizontal: spacing.lg,
  },
  imageWrap: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: 440,
    marginTop: -spacing.sm,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bottom: {
    width: "100%",
    alignItems: "stretch",
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  checkLabel: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: "500",
  },
  primaryButton: {
    marginTop: spacing["2xl"],
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.onPrimary,
  },
});
