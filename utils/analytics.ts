const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

let posthog: any = null;
let initialized = false;

/** Initialize PostHog analytics. Call once at app startup. */
export function initAnalytics() {
  if (initialized || !POSTHOG_API_KEY) {
    if (__DEV__ && !POSTHOG_API_KEY) {
      console.log("[Analytics] PostHog API key not set - analytics disabled");
    }
    return;
  }
  
  try {
    // Lazy load PostHog to prevent crashes if not installed
    const PostHogModule = require("posthog-react-native");
    const PostHog = PostHogModule.default || PostHogModule;
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: false,
    });
    initialized = true;
    
    if (__DEV__) {
      console.log("[Analytics] PostHog initialized");
    }
  } catch (err) {
    if (__DEV__) {
      console.warn("[Analytics] PostHog initialization failed:", err);
    }
  }
}

/** Track an analytics event. Safe to call even if PostHog isn't initialized. */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!POSTHOG_API_KEY || !initialized || !posthog) {
    if (__DEV__) {
      console.log("[Analytics]", eventName, properties);
    }
    return;
  }
  
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    if (__DEV__) {
      console.warn("[Analytics] PostHog track failed:", err);
    }
  }
}
