import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Header, { HEADER_HEIGHT } from "./components/Header";
import { colors, fontSizes, radii, spacing } from "./theme";
import CountSlipsScreen from "./screens/CountSlipsScreen";
import SummaryScreen from "./screens/SummaryScreen";
import HistoryScreen from "./screens/HistoryScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import BoardingScreen from "./screens/BoardingScreen";
import PaywallScreen from "./screens/PaywallScreen";
import { EntryStoreProvider } from "./store/EntryStore";
import {
  getInitialRoute,
  resetOnboardingAndPaywall,
  setPaywallUnlocked,
  type AppGateRoute,
} from "./store/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import { initRevenueCat, logOfferingsDebug } from "./services/revenuecat";
import { initAnalytics } from "./utils/analytics";
import type { RootStackParamList } from "./navigationTypes";

export type { RootStackParamList } from "./navigationTypes";

const Stack = createNativeStackNavigator<RootStackParamList>();

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  // Ensure paywall-unlocked is persisted when user reaches Home (fixes cold start opening to Paywall)
  useEffect(() => {
    setPaywallUnlocked();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="CashoutAI" />

      {/* Main Content */}
      <View
        style={[
          styles.content,
          {
            paddingTop: HEADER_HEIGHT + insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Text style={styles.title}>CashoutAI</Text>
        <Text style={styles.subtitle}>The easy way to manage your slips</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("CountSlips")}
          >
            <Text style={styles.primaryButtonText}>Count slips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("History")}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.resetButton}
              activeOpacity={0.88}
              onPress={async () => {
                await resetOnboardingAndPaywall();
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Onboarding" }],
                });
              }}
            >
              <Text style={styles.resetButtonText}>
                Reset onboarding (temp)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <StatusBar style="dark" />
    </View>
  );
}

function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<AppGateRoute | null>(null);

  useEffect(() => {
    getInitialRoute().then(setInitialRoute);
  }, []);

  if (initialRoute == null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Boarding" component={BoardingScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CountSlips" component={CountSlipsScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initAnalytics();
    initRevenueCat();

    logOfferingsDebug();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <EntryStoreProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </EntryStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  /* ---------- Layout ---------- */
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },

  buttonGroup: {
    marginTop: spacing["4xl"],
    gap: spacing.lg,
  },

  /* ---------- Text ---------- */

  title: {
    fontSize: fontSizes.hero,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },

  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
  },

  /* ---------- Buttons ---------- */

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    minWidth: 290,
    alignItems: "center",
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

  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    minWidth: 290,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  secondaryButtonText: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.primary,
  },

  resetButton: {
    marginTop: spacing["2xl"],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resetButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
