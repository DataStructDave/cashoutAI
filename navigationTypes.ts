import type { Entry } from "./screens/CountSlips/types";

export type RootStackParamList = {
  Onboarding: undefined;
  Boarding: undefined;
  Paywall: undefined;
  Home: undefined;
  CountSlips: { entries?: Entry[]; date?: string } | undefined;
  Summary: { editDate?: string } | undefined;
  History: { fromFixChanges?: boolean } | undefined;
  Analytics: { date: string; entries: Entry[] };
};
