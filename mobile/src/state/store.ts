import { create } from "zustand";

type UIStore = {
  selectedTrend: string;
  setSelectedTrend: (metric: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  selectedTrend: "hrv",
  setSelectedTrend: (metric) => set({ selectedTrend: metric }),
}));
