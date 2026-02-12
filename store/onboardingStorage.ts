import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ONBOARDING_SEEN = "@cashoutai/onboarding_seen";
const KEY_PAYWALL_UNLOCKED = "@cashoutai/paywall_unlocked";

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_ONBOARDING_SEEN);
  return v === "true";
}

export async function setOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_SEEN, "true");
}

export async function hasUnlockedPaywall(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_PAYWALL_UNLOCKED);
  return v === "true";
}

export async function setPaywallUnlocked(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PAYWALL_UNLOCKED, "true");
  } catch (e) {
    if (__DEV__) console.warn("setPaywallUnlocked failed", e);
  }
}

export type AppGateRoute = "Onboarding" | "Paywall" | "Home";

export async function getInitialRoute(): Promise<AppGateRoute> {
  const [seenOnboarding, unlockedPaywall] = await Promise.all([
    hasSeenOnboarding(),
    hasUnlockedPaywall(),
  ]);
  if (!seenOnboarding) return "Onboarding";
  // In development, skip paywall after onboarding so app opens to Home (AsyncStorage can be flaky in Expo Go/simulator)
  if (__DEV__ && seenOnboarding) return "Home";
  if (!unlockedPaywall) return "Paywall";
  return "Home";
}

/** Temp: clear onboarding + paywall so user sees onboarding/paywall again. */
export async function resetOnboardingAndPaywall(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ONBOARDING_SEEN, KEY_PAYWALL_UNLOCKED]);
}
