import Purchases from "react-native-purchases";
import { Platform } from "react-native";

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

let initialized = false;

export function initRevenueCat() {
  if (initialized) return;

  if (!IOS_API_KEY?.trim()) {
    if (__DEV__) {
      console.warn("[RevenueCat] API key missing — check EXPO_PUBLIC_REVENUECAT_IOS_KEY in .env");
    }
    initialized = true;
    return;
  }

  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    if (Platform.OS === "ios") {
      Purchases.configure({ apiKey: IOS_API_KEY });
    }
  } catch (error) {
    if (__DEV__) {
      console.error("[RevenueCat] Init failed:", error);
    }
  }

  initialized = true;
}
