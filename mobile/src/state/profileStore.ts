import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Local profile state. Persisted to AsyncStorage.
 *
 * We only persist what the app actually uses. The previous version captured a
 * dozen fields (height, weight, goals, lifestyle buckets, conditions,
 * medications, fake source toggles) — none were read by the backend or engine,
 * so they were removed. Apple Health is the only data source we actually
 * support; its connection is managed by HealthKit, not this store.
 */
export type Profile = {
  firstName?: string;
};

type State = {
  onboarded: boolean;
  profile: Profile;
};

type Actions = {
  setProfile: (patch: Partial<Profile>) => void;
  finishOnboarding: () => void;
  resetOnboarding: () => void;
};

export const useProfileStore = create<State & Actions>()(
  persist(
    (set) => ({
      onboarded: false,
      profile: {},

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      finishOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () => set({ onboarded: false, profile: {} }),
    }),
    {
      name: "immortal.profile.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ onboarded: s.onboarded, profile: s.profile }),
    },
  ),
);
