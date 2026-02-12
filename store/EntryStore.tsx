import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Entry } from "../screens/CountSlips/types";

type EntryStoreValue = {
  entries: Entry[];
  addEntry: (entry: Entry) => void;
  removeEntry: (index: number) => void;
  clearEntries: () => void;
  loadEntries: (entries: Entry[]) => void;
  selectedImages: string[];
  addImage: (uri: string) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
};

const EntryStoreContext = createContext<EntryStoreValue | null>(null);

export function EntryStoreProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const addEntry = useCallback((entry: Entry) => {
    const today = new Date().toISOString().slice(0, 10);
    setEntries((prev) => [...prev, { ...entry, date: entry.date ?? today }]);
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const loadEntries = useCallback((entries: Entry[]) => {
    setEntries(entries);
  }, []);

  const addImage = useCallback((uri: string) => {
    setSelectedImages((prev) => [...prev, uri]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  return (
    <EntryStoreContext.Provider
      value={{
        entries,
        addEntry,
        removeEntry,
        clearEntries,
        loadEntries,
        selectedImages,
        addImage,
        removeImage,
        clearImages,
      }}
    >
      {children}
    </EntryStoreContext.Provider>
  );
}

export function useEntryStore(): EntryStoreValue {
  const value = useContext(EntryStoreContext);
  if (!value) {
    throw new Error("useEntryStore must be used within EntryStoreProvider");
  }
  return value;
}
