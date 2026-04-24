import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  GOAL_LABELS,
  SOURCE_LABELS,
  useProfileStore,
  type ActivityLevel,
  type AlcoholBucket,
  type CaffeineBucket,
  type Condition,
  type DataSourceId,
  type Goal,
  type Sex,
  type SleepBucket,
  type Units,
} from "@/state/profileStore";
import { palette, radii, shadow, spacing } from "@/theme";

const STEP_TITLES = ["About you", "Body basics", "Your goals", "Lifestyle", "Health context", "Connect data"];

const TOTAL_STEPS = STEP_TITLES.length;

export function OnboardingFlow() {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const finishOnboarding = useProfileStore((s) => s.finishOnboarding);
  const sources = useProfileStore((s) => s.sources);
  const setSourceConnected = useProfileStore((s) => s.setSourceConnected);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return !!profile.firstName?.trim() && !!profile.birthYear && !!profile.sex;
      case 1:
        return !!profile.heightCm && !!profile.weightKg;
      case 2:
        return (profile.goals?.length ?? 0) >= 1;
      case 3:
        return (
          !!profile.activityLevel &&
          !!profile.averageSleep &&
          !!profile.caffeine &&
          !!profile.alcohol
        );
      case 4:
        return (profile.conditions?.length ?? 0) >= 1;
      case 5:
        return Object.values(sources).some((s) => s.connected);
      default:
        return true;
    }
  }, [step, profile, sources]);

  function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      setSubmitted(true);
      setTimeout(() => finishOnboarding(), 1400);
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneWrap}>
          <View style={styles.doneRing}>
            <View style={styles.doneRingInner}>
              <Text style={styles.doneCheck}>✓</Text>
            </View>
          </View>
          <Text style={styles.doneTitle}>You're all set,{"\n"}{profile.firstName}.</Text>
          <Text style={styles.doneSub}>
            We're calibrating your baselines from the seed dataset.{"\n"}
            One sec…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={back} disabled={step === 0} style={styles.backBtn}>
            <Text style={[styles.backGlyph, step === 0 && { opacity: 0.3 }]}>←</Text>
          </Pressable>
          <View style={styles.dotsRow}>
            {STEP_TITLES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepCount}>
            {step + 1}/{TOTAL_STEPS}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>{STEP_TITLES[step].toUpperCase()}</Text>
          {step === 0 ? <StepProfile profile={profile} setProfile={setProfile} /> : null}
          {step === 1 ? <StepBody profile={profile} setProfile={setProfile} /> : null}
          {step === 2 ? <StepGoals profile={profile} setProfile={setProfile} /> : null}
          {step === 3 ? <StepLifestyle profile={profile} setProfile={setProfile} /> : null}
          {step === 4 ? <StepHealth profile={profile} setProfile={setProfile} /> : null}
          {step === 5 ? (
            <StepConnect
              sources={sources}
              onToggle={(id) => setSourceConnected(id, !sources[id].connected)}
            />
          ) : null}
        </ScrollView>

        <View style={styles.cta}>
          <Button
            title={step === TOTAL_STEPS - 1 ? "Finish setup" : "Continue"}
            onPress={next}
            disabled={!canContinue}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepProfile({
  profile,
  setProfile,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  setProfile: ReturnType<typeof useProfileStore.getState>["setProfile"];
}) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => thisYear - 18 - i);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>What should{"\n"}we call you?</Text>
      <Text style={styles.sub}>Your name, age, and sex shape baseline ranges.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>FIRST NAME</Text>
        <TextInput
          value={profile.firstName ?? ""}
          onChangeText={(t) => setProfile({ firstName: t })}
          placeholder="e.g. Reyan"
          placeholderTextColor={palette.textSoft}
          style={styles.input}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>BIRTH YEAR</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearRow}
        >
          {years.map((y) => (
            <Pressable
              key={y}
              onPress={() => setProfile({ birthYear: y })}
              style={[styles.yearChip, profile.birthYear === y && styles.yearChipActive]}
            >
              <Text
                style={[
                  styles.yearChipText,
                  profile.birthYear === y && styles.yearChipTextActive,
                ]}
              >
                {y}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>SEX (USED FOR PHYSIOLOGICAL BASELINES)</Text>
        <View style={styles.row3}>
          {(["female", "male", "other"] as Sex[]).map((s) => (
            <OptionTile
              key={s}
              label={s === "female" ? "Female" : s === "male" ? "Male" : "Other"}
              active={profile.sex === s}
              onPress={() => setProfile({ sex: s })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function StepBody({
  profile,
  setProfile,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  setProfile: ReturnType<typeof useProfileStore.getState>["setProfile"];
}) {
  const units = profile.units ?? "metric";
  const heightDisplay =
    profile.heightCm != null
      ? units === "metric"
        ? `${profile.heightCm}`
        : `${(profile.heightCm / 2.54).toFixed(0)}`
      : "";
  const weightDisplay =
    profile.weightKg != null
      ? units === "metric"
        ? `${profile.weightKg}`
        : `${(profile.weightKg * 2.20462).toFixed(0)}`
      : "";

  function onHeightChange(v: string) {
    const n = parseFloat(v);
    if (Number.isFinite(n)) {
      setProfile({ heightCm: units === "metric" ? n : Math.round(n * 2.54) });
    } else if (v === "") {
      setProfile({ heightCm: undefined });
    }
  }
  function onWeightChange(v: string) {
    const n = parseFloat(v);
    if (Number.isFinite(n)) {
      setProfile({ weightKg: units === "metric" ? n : +(n / 2.20462).toFixed(1) });
    } else if (v === "") {
      setProfile({ weightKg: undefined });
    }
  }

  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Your basics</Text>
      <Text style={styles.sub}>
        Height and weight calibrate calories, training load, and recovery models.
      </Text>

      <View style={styles.unitsRow}>
        {(["metric", "imperial"] as Units[]).map((u) => (
          <Pressable
            key={u}
            onPress={() => setProfile({ units: u })}
            style={[styles.unitsChip, profile.units === u && styles.unitsChipActive]}
          >
            <Text
              style={[
                styles.unitsChipText,
                profile.units === u && styles.unitsChipTextActive,
              ]}
            >
              {u === "metric" ? "Metric (cm/kg)" : "Imperial (in/lb)"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>HEIGHT</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            value={heightDisplay}
            onChangeText={onHeightChange}
            keyboardType="numeric"
            placeholder={units === "metric" ? "175" : "69"}
            placeholderTextColor={palette.textSoft}
            style={[styles.input, { flex: 1 }]}
          />
          <View style={styles.unitTag}>
            <Text style={styles.unitTagText}>{units === "metric" ? "cm" : "in"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>WEIGHT</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            value={weightDisplay}
            onChangeText={onWeightChange}
            keyboardType="numeric"
            placeholder={units === "metric" ? "72" : "159"}
            placeholderTextColor={palette.textSoft}
            style={[styles.input, { flex: 1 }]}
          />
          <View style={styles.unitTag}>
            <Text style={styles.unitTagText}>{units === "metric" ? "kg" : "lb"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StepGoals({
  profile,
  setProfile,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  setProfile: ReturnType<typeof useProfileStore.getState>["setProfile"];
}) {
  const selected = profile.goals ?? [];
  function toggle(g: Goal) {
    const exists = selected.includes(g);
    if (exists) {
      setProfile({ goals: selected.filter((x) => x !== g) });
    } else if (selected.length < 3) {
      setProfile({ goals: [...selected, g] });
    }
  }

  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>What matters{"\n"}most to you?</Text>
      <Text style={styles.sub}>Pick up to three. We'll prioritize signals and recommendations around them.</Text>

      <View style={styles.goalGrid}>
        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => {
          const active = selected.includes(g);
          const meta = GOAL_LABELS[g];
          return (
            <Pressable
              key={g}
              onPress={() => toggle(g)}
              style={[styles.goalCard, active && styles.goalCardActive]}
            >
              <Text style={styles.goalEmoji}>{meta.emoji}</Text>
              <Text
                style={[styles.goalLabel, active && { color: palette.ink, fontWeight: "800" }]}
              >
                {meta.label}
              </Text>
              {active ? <View style={styles.goalCheck}><Text style={styles.goalCheckText}>✓</Text></View> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.helperText}>
        {selected.length}/3 selected
      </Text>
    </View>
  );
}

function StepLifestyle({
  profile,
  setProfile,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  setProfile: ReturnType<typeof useProfileStore.getState>["setProfile"];
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Your day-to-day</Text>
      <Text style={styles.sub}>
        Lifestyle inputs feed our pattern detector and recommendation engine.
      </Text>

      <Text style={styles.label}>ACTIVITY LEVEL</Text>
      <View style={styles.choiceCol}>
        {(
          [
            ["sedentary", "Sedentary", "Mostly sitting, ≤2k steps/day"],
            ["light", "Light", "Light walks, short workouts 1–2x/wk"],
            ["active", "Active", "Workouts 3–5x/wk"],
            ["very_active", "Very active", "Daily training or physical job"],
          ] as [ActivityLevel, string, string][]
        ).map(([v, label, desc]) => (
          <ListChoice
            key={v}
            active={profile.activityLevel === v}
            onPress={() => setProfile({ activityLevel: v })}
            label={label}
            desc={desc}
          />
        ))}
      </View>

      <View style={{ height: spacing.l }} />
      <Text style={styles.label}>AVERAGE SLEEP</Text>
      <View style={styles.row4}>
        {(["<6", "6-7", "7-8", "8+"] as SleepBucket[]).map((s) => (
          <OptionTile
            key={s}
            label={`${s}h`}
            active={profile.averageSleep === s}
            onPress={() => setProfile({ averageSleep: s })}
            small
          />
        ))}
      </View>

      <View style={{ height: spacing.l }} />
      <Text style={styles.label}>CAFFEINE PER DAY</Text>
      <View style={styles.row4}>
        {(["none", "1-2", "3-4", "5+"] as CaffeineBucket[]).map((s) => (
          <OptionTile
            key={s}
            label={s === "none" ? "None" : s}
            active={profile.caffeine === s}
            onPress={() => setProfile({ caffeine: s })}
            small
          />
        ))}
      </View>

      <View style={{ height: spacing.l }} />
      <Text style={styles.label}>ALCOHOL</Text>
      <View style={styles.row4}>
        {(
          [
            ["none", "None"],
            ["rarely", "Rarely"],
            ["weekly", "Weekly"],
            ["daily", "Daily"],
          ] as [AlcoholBucket, string][]
        ).map(([v, label]) => (
          <OptionTile
            key={v}
            label={label}
            active={profile.alcohol === v}
            onPress={() => setProfile({ alcohol: v })}
            small
          />
        ))}
      </View>
    </View>
  );
}

function StepHealth({
  profile,
  setProfile,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  setProfile: ReturnType<typeof useProfileStore.getState>["setProfile"];
}) {
  const selected = profile.conditions ?? [];

  function toggle(c: Condition) {
    if (c === "none") {
      setProfile({ conditions: ["none"] });
      return;
    }
    const without = selected.filter((x) => x !== "none");
    const exists = without.includes(c);
    setProfile({
      conditions: exists ? without.filter((x) => x !== c) : [...without, c],
    });
  }

  const conditions: { v: Condition; label: string }[] = [
    { v: "none", label: "None of these" },
    { v: "diabetes", label: "Diabetes (type 1 or 2)" },
    { v: "hypertension", label: "High blood pressure" },
    { v: "heart", label: "Heart condition" },
    { v: "sleep_apnea", label: "Sleep apnea" },
    { v: "pregnant", label: "Pregnant or postpartum" },
    { v: "other", label: "Other" },
  ];

  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Anything we{"\n"}should know?</Text>
      <Text style={styles.sub}>
        Optional. We use this to flag recommendations that might not apply to you.
      </Text>

      <View style={styles.choiceCol}>
        {conditions.map((c) => (
          <Pressable
            key={c.v}
            onPress={() => toggle(c.v)}
            style={[styles.checkRow, selected.includes(c.v) && styles.checkRowActive]}
          >
            <View style={[styles.checkbox, selected.includes(c.v) && styles.checkboxActive]}>
              {selected.includes(c.v) ? <Text style={styles.checkboxGlyph}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: spacing.l }} />
      <Text style={styles.label}>MEDICATIONS / SUPPLEMENTS (OPTIONAL)</Text>
      <TextInput
        value={profile.medications ?? ""}
        onChangeText={(t) => setProfile({ medications: t })}
        placeholder="e.g. metformin 500mg, vitamin D 2000IU"
        placeholderTextColor={palette.textSoft}
        multiline
        style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
      />

      <Card tone="sunken" style={{ marginTop: spacing.l }}>
        <Text style={styles.privacyKicker}>PRIVACY</Text>
        <Text style={styles.privacyBody}>
          Your health context is stored on-device and synced only to your private backend. We
          never share data with third parties.
        </Text>
      </Card>
    </View>
  );
}

function StepConnect({
  sources,
  onToggle,
}: {
  sources: ReturnType<typeof useProfileStore.getState>["sources"];
  onToggle: (id: DataSourceId) => void;
}) {
  const order: DataSourceId[] = ["apple_health", "fitbit", "oura", "garmin", "whoop", "manual"];

  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Connect your{"\n"}data sources</Text>
      <Text style={styles.sub}>
        We need at least one source to learn your baselines. You can change these later.
      </Text>

      <View style={{ gap: spacing.s }}>
        {order.map((id) => (
          <SourceRow
            key={id}
            id={id}
            connected={sources[id].connected}
            onToggle={() => onToggle(id)}
          />
        ))}
      </View>

      <Card tone="sunken" style={{ marginTop: spacing.l }}>
        <Text style={styles.privacyKicker}>HOW IT WORKS</Text>
        <Text style={styles.privacyBody}>
          Apple Health pulls real HRV, sleep, steps and workouts on demand. Other integrations
          require OAuth in production — for the demo, tapping connect simulates the link.
        </Text>
      </Card>
    </View>
  );
}

function SourceRow({
  id,
  connected,
  onToggle,
}: {
  id: DataSourceId;
  connected: boolean;
  onToggle: () => void;
}) {
  const meta = SOURCE_LABELS[id];
  const tone =
    meta.tone === "mint"
      ? palette.mint
      : meta.tone === "lavender"
        ? palette.lavenderSoft
        : meta.tone === "peach"
          ? palette.peachSoft
          : meta.tone === "sage"
            ? palette.sageSoft
            : meta.tone === "coral"
              ? palette.coralSoft
              : palette.surfaceAlt;
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.sourceRow, connected && styles.sourceRowConnected]}
    >
      <View style={[styles.sourceIcon, { backgroundColor: tone }]}>
        <Text style={styles.sourceGlyph}>{meta.glyph}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceLabel}>{meta.label}</Text>
        <Text style={styles.sourceSub}>
          {connected ? "Connected · pulling data" : "Tap to connect"}
        </Text>
      </View>
      <View style={[styles.connectBtn, connected && styles.connectBtnActive]}>
        <Text style={[styles.connectBtnText, connected && styles.connectBtnTextActive]}>
          {connected ? "Connected" : "Connect"}
        </Text>
      </View>
    </Pressable>
  );
}

function OptionTile({
  label,
  active,
  onPress,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionTile,
        active && styles.optionTileActive,
        small && { paddingVertical: spacing.m },
      ]}
    >
      <Text style={[styles.optionTileText, active && styles.optionTileTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ListChoice({
  active,
  onPress,
  label,
  desc,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  desc: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listChoice, active && styles.listChoiceActive]}
    >
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listChoiceLabel, active && { color: palette.ink, fontWeight: "800" }]}>
          {label}
        </Text>
        <Text style={styles.listChoiceDesc}>{desc}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    gap: spacing.m,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  backGlyph: { fontSize: 18, fontWeight: "800", color: palette.text },
  dotsRow: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center" },
  dot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.surfaceAlt,
  },
  dotActive: { backgroundColor: palette.accent },
  dotDone: { backgroundColor: palette.ink },
  stepCount: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 32,
    textAlign: "right",
  },

  scroll: { padding: spacing.l, paddingBottom: spacing.xxl * 2 },
  kicker: {
    color: palette.accentDeep,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  stepBody: { gap: spacing.s, marginTop: spacing.s },
  title: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginTop: spacing.s,
  },
  sub: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.l,
  },

  field: { marginBottom: spacing.s },
  label: {
    color: palette.textSoft,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    padding: spacing.m + 2,
    fontSize: 15,
    color: palette.text,
    ...shadow.card,
  },
  inputWithUnit: { flexDirection: "row", gap: spacing.s, alignItems: "stretch" },
  unitTag: {
    paddingHorizontal: spacing.l,
    justifyContent: "center",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.m,
  },
  unitTagText: { color: palette.textMuted, fontWeight: "800", fontSize: 14 },

  yearRow: { gap: spacing.s, paddingVertical: 4, paddingRight: spacing.l },
  yearChip: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    ...shadow.card,
  },
  yearChipActive: { backgroundColor: palette.ink },
  yearChipText: { color: palette.text, fontWeight: "700", fontSize: 14 },
  yearChipTextActive: { color: palette.accent },

  row3: { flexDirection: "row", gap: spacing.s },
  row4: { flexDirection: "row", gap: spacing.s },
  optionTile: {
    flex: 1,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.m,
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    alignItems: "center",
    ...shadow.card,
  },
  optionTileActive: { backgroundColor: palette.ink },
  optionTileText: { color: palette.text, fontWeight: "700", fontSize: 14 },
  optionTileTextActive: { color: palette.accent },

  unitsRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.l,
  },
  unitsChip: {
    flex: 1,
    paddingVertical: spacing.s + 2,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  unitsChipActive: { backgroundColor: palette.surface, ...shadow.card },
  unitsChipText: { color: palette.textMuted, fontSize: 13, fontWeight: "700" },
  unitsChipTextActive: { color: palette.text },

  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  goalCard: {
    width: "48%",
    backgroundColor: palette.surface,
    borderRadius: radii.l,
    padding: spacing.l,
    gap: 6,
    minHeight: 100,
    ...shadow.card,
  },
  goalCardActive: {
    backgroundColor: palette.peachSoft,
    borderWidth: 2,
    borderColor: palette.accent,
  },
  goalEmoji: { fontSize: 22 },
  goalLabel: { color: palette.text, fontSize: 14, fontWeight: "700" },
  goalCheck: {
    position: "absolute",
    top: spacing.m,
    right: spacing.m,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCheckText: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  helperText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.s,
  },

  choiceCol: { gap: spacing.s },
  listChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    padding: spacing.l,
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    ...shadow.card,
  },
  listChoiceActive: { backgroundColor: palette.peachSoft, borderWidth: 1.5, borderColor: palette.accent },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: palette.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent },
  listChoiceLabel: { color: palette.text, fontSize: 15, fontWeight: "700" },
  listChoiceDesc: { color: palette.textMuted, fontSize: 12, marginTop: 2 },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    padding: spacing.l,
    backgroundColor: palette.surface,
    borderRadius: radii.m,
    ...shadow.card,
  },
  checkRowActive: { backgroundColor: palette.peachSoft },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  checkboxGlyph: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  checkLabel: { color: palette.text, fontSize: 14, fontWeight: "700", flex: 1 },

  privacyKicker: {
    color: palette.accentDeep,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  privacyBody: { color: palette.text, fontSize: 13, lineHeight: 19 },

  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    padding: spacing.l,
    backgroundColor: palette.surface,
    borderRadius: radii.l,
    ...shadow.card,
  },
  sourceRowConnected: {
    borderWidth: 2,
    borderColor: palette.accent,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceGlyph: { fontSize: 18, color: palette.ink, fontWeight: "900" },
  sourceLabel: { color: palette.text, fontSize: 15, fontWeight: "800" },
  sourceSub: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  connectBtn: {
    paddingHorizontal: spacing.l,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
  },
  connectBtnActive: { backgroundColor: palette.ink },
  connectBtnText: { color: palette.text, fontSize: 12, fontWeight: "800" },
  connectBtnTextActive: { color: palette.accent },

  cta: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    paddingBottom: spacing.l,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: palette.borderSoft,
  },

  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.l,
  },
  doneRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  doneRingInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.floating,
  },
  doneCheck: { color: palette.ink, fontSize: 56, fontWeight: "900" },
  doneTitle: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  doneSub: {
    color: palette.textMuted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
