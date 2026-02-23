import Purchases from "react-native-purchases";
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

// Entitlement identifier
export const ENTITLEMENT_ID = "pro";

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
    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN);
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

export function hasPremiumAccess(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    if (__DEV__) console.warn("[RevenueCat] getOfferings failed", e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    if (__DEV__) console.warn("[RevenueCat] getCustomerInfo failed", e);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases();
}

export async function logOfferingsDebug() {
  try {
    const offerings = await Purchases.getOfferings();
    console.log("[RevenueCat DEBUG] Offerings fetched:", offerings);

    if (offerings.current) {
      console.log("[RevenueCat DEBUG] Current offering:", offerings.current.identifier);
      offerings.current.availablePackages.forEach((pkg) => {
        console.log(
          `[RevenueCat DEBUG] Package: ${pkg.identifier}, ProductID: ${pkg.product.identifier}, Price: ${pkg.product.priceString}`
        );
      });
    } else {
      console.warn("[RevenueCat DEBUG] No current offering available");
    }
  } catch (error) {
    console.error("[RevenueCat DEBUG] Failed to fetch offerings:", error);
  }
}
