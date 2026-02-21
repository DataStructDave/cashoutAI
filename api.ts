import { Platform } from "react-native";

// Optional: when backend uses API_SECRET, set this (e.g. via app.config.js extra.apiSecret or EAS env EXPO_PUBLIC_API_SECRET)
const API_KEY = process.env.EXPO_PUBLIC_API_SECRET ?? undefined;

function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

// Mac LAN IP for physical devices
const LAN_IP = "192.168.2.204";
//`http://${LAN_IP}:3000`

export const API_BASE_URL = "https://cashoutai-production.up.railway.app";


export type Entry = {
  subtotal?: string;
  tip?: string;
  total: string;
  paymentType?: string;
};

export const api = {
  test: () => fetch(`${API_BASE_URL}/api/test`).then((r) => r.json()),

  /** Test: send images to /api/test-raw-text; raw text logged on server, returns { item1, item2, ... } */
  testRawText: async (imageUris: string[]) => {
    const formData = new FormData();
    imageUris.forEach((uri, i) => {
      formData.append("images", {
        uri,
        type: "image/jpeg",
        name: `receipt_${i}.jpg`,
      } as unknown as Blob);
    });
    const r = await fetch(`${API_BASE_URL}/api/test-raw-text`, {
      method: "POST",
      body: formData,
      headers: apiHeaders(),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error((data as { error?: string }).error || r.statusText || "Test failed");
    }
    return data as Record<string, string>;
  },

  /** Send image URIs via FormData; returns { entries: Entry[] } */
  extractReceipts: async (imageUris: string[]): Promise<{ entries: Entry[] }> => {
    const formData = new FormData();
    imageUris.forEach((uri, i) => {
      formData.append("images", {
        uri,
        type: "image/jpeg",
        name: `receipt_${i}.jpg`,
      } as unknown as Blob);
    });
    const r = await fetch(`${API_BASE_URL}/api/extract-text`, {
      method: "POST",
      body: formData,
      headers: apiHeaders(),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error((data as { error?: string }).error || r.statusText || "Extract failed");
    }
    const entries = Array.isArray((data as { entries?: Entry[] }).entries)
      ? (data as { entries: Entry[] }).entries
      : [];
    return { entries };
  },

  
};
