import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useProfileStore } from "@/state/profileStore";
import { palette, radii, shadow, spacing } from "@/theme";

/**
 * Single-screen onboarding. Captures the only field the app actually uses
 * (first name, for the dashboard greeting) and finishes. Apple Health is
 * connected on first sync from the dashboard via HealthSyncCard.
 */
export function OnboardingFlow() {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const finishOnboarding = useProfileStore((s) => s.finishOnboarding);
  const [name, setName] = useState(profile.firstName ?? "");

  function handleContinue() {
    const trimmed = name.trim();
    setProfile({ firstName: trimmed || undefined });
    finishOnboarding();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.title}>
              Live{"\n"}longer.{"\n"}
              <Text style={{ color: palette.accentDeep }}>Live better.</Text>
            </Text>
            <Text style={styles.sub}>
              A closed-loop health intelligence system. Learns your baselines from
              Apple Health, flags anomalies, and recommends actions that move
              HRV, sleep, and readiness.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WHAT SHOULD WE CALL YOU?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="First name"
              placeholderTextColor={palette.textSoft}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>
        </ScrollView>

        <View style={styles.cta}>
          <Button
            title="Get started"
            onPress={handleContinue}
            disabled={!name.trim()}
            size="lg"
          />
          <Text style={styles.legal}>
            You'll connect Apple Health on the dashboard. Data stays on your
            device and your private backend.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  hero: { marginBottom: spacing.xxl },
  title: {
    color: palette.text,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 60,
  },
  sub: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.l,
    maxWidth: 360,
  },
  field: { marginBottom: spacing.l },
  label: {
    color: palette.textSoft,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginBottom: spacing.s,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    padding: spacing.m + 2,
    fontSize: 16,
    color: palette.text,
    ...shadow.card,
  },
  cta: {
    padding: spacing.xl,
    paddingTop: spacing.s,
  },
  legal: {
    color: palette.textSoft,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.m,
  },
});
