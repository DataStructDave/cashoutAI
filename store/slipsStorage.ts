import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Entry } from "../screens/CountSlips/types";

const KEY = "cashOutAI_slipsByDate";

export type SlipsByDate = Record<string, Entry[]>;

export async function loadSlipsByDate(): Promise<SlipsByDate> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as SlipsByDate;
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

export async function saveSlipsByDate(data: SlipsByDate): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function appendSlipsForDate(date: string, entries: Entry[]): Promise<void> {
  const data = await loadSlipsByDate();
  const existing = data[date] ?? [];
  data[date] = [...existing, ...entries.map((e) => ({ ...e, date }))];
  await saveSlipsByDate(data);
}

export async function replaceSlipsForDate(date: string, entries: Entry[]): Promise<void> {
  const data = await loadSlipsByDate();
  if (entries.length === 0) {
    delete data[date];
  } else {
    data[date] = entries.map((e) => ({ ...e, date }));
  }
  await saveSlipsByDate(data);
}
