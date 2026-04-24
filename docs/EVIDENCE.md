# Immortal — Clinical Evidence & Internal Guidelines

**Audience:** engineering, product, anyone tuning thresholds in `backend/app/engine/*`.
**Purpose:** pin every threshold, pattern, and recommendation the app surfaces to a
peer-reviewed source. If a number appears in code and isn't traceable to this
doc, it needs either a citation or a `# heuristic` comment.
**Review cadence:** quarterly. Owner rotates each cycle.
**Scope:** healthy adults, non-clinical. See §7 for exclusions.

---

## 1. Interpreting wearable metrics

### 1.1 HRV (heart-rate variability)

**Index.** Use **ln(RMSSD)** as the primary HRV index. Raw RMSSD is right-skewed;
log-transforming it stabilizes variance and is the convention in the monitoring
literature.¹

**Window.** Single-day HRV is noisy. A **7-day rolling mean of ln(RMSSD)** is
substantially more responsive to meaningful changes in training status than the
daily value, and is the recommended unit for trend detection.¹ ²

**Expected variability.** In trained adults, typical day-to-day CV of ln(RMSSD)
is ~3–10%.¹ Anything inside that band is noise; alerting on it will train users
to distrust the app.

**Meaningful drop.**
- 7-day rolling mean dropping **>1 SD below the 60-day baseline**, sustained
  ≥3 days → flag as *autonomic suppression*.
- Meta-analytic evidence shows HRV **decreases** in non-functional overreaching
  and overtraining, which distinguishes NFOR/OTS from functional overreaching
  (where HRV often rises).³ Code must therefore interpret HRV drops in the
  *context of training load*, not alone.

**Measurement hygiene (bake into check-ins).** Morning, post-void, supine or
seated, before caffeine, same posture each day.² Users who measure inconsistently
will generate garbage baselines.

**HRV-guided training works.** A randomized trial showed training volumes
prescribed daily from HRV outperformed pre-set periodization for VO₂max and
running performance.⁴ This is the mechanistic backing for the
`recommendations` engine's rest-day suggestions after sustained HRV drops.

### 1.2 Resting heart rate

**Baseline.** Maintain a 60-day rolling mean + SD per user.

**Alert threshold.** A sustained rise of **≥5 bpm above the 60-day baseline
for ≥3 days**, especially paired with an HRV drop, is a reasonable
illness/overreaching heuristic. It is *not* diagnostic.

**Why we bother.** Every 10 bpm increase in long-term RHR is associated with a
16–18% increase in all-cause and cardiovascular mortality in large prospective
cohorts.⁵ We do not surface this to users — it's motivational context for the
team. We surface *deviations from their own baseline*, not population risk.

### 1.3 Sleep duration

**Target.** **7–9 hours/night** for adults 18–64; ≥7 hours is the floor. These
are the AASM/SRS and National Sleep Foundation consensus recommendations.⁶ ⁷

**Chronic short sleep.** 6 h/night for 14 consecutive days produces
neurobehavioral impairment equivalent to 1–2 nights of total sleep
deprivation — and the subjects didn't perceive the decline.⁸ This is the
evidence behind pushing check-ins when users trend <6.5 h for a week.

**Sleep extension has performance upside.** Collegiate basketball players
extending sleep to ~10 h improved sprint and shooting performance measurably
over weeks.⁹ Use this as the evidence base for a `sleep_extension`
experiment template.

### 1.4 Sleep regularity

**Why it matters independently of duration.** Irregular sleep timing — large
night-to-night variance in sleep midpoint — is an **independent** cardiovascular
and metabolic risk factor even after controlling for duration.¹⁰ ¹¹ This is the
justification for tracking midpoint variance as a first-class metric, not just
total sleep hours.

**Operational thresholds.**
- Target: **sleep-midpoint SD < 30 min** over a 7-day window.
- Flag `circadian_drift` when SD exceeds **60 min**.
- "Social jetlag" (weekday vs weekend midpoint difference > 1 h) is itself
  associated with adverse metabolic markers and should be surfaced as its own
  sub-pattern.¹²

### 1.5 Training load

**Convention.** Compute an acute (7-day) and chronic (28-day) rolling load and
their ratio (ACWR).

**Heuristic band.** ACWR of **0.8–1.3** is the "sweet spot"; **>1.5** has
historically been associated with elevated injury risk in athletic
populations.¹³ ¹⁴

**Important caveat — read this before shipping load-based alerts.**
The ACWR framework has a well-documented methodological critique: mathematical
coupling between numerator and denominator, sensitivity to the chronic window
length, and overstated effect sizes in early papers.¹⁵ Implications for the
product:

1. Treat ACWR as a **signal**, never a **prescription**.
2. Never phrase recommendations as "you *will* get injured." Phrase as
   "your load has climbed faster than your 4-week average — consider an easier
   day."
3. Pair load spikes with HRV and sleep context before recommending rest.
   Isolated load signals alone are weak.

### 1.6 Composite readiness

A weighted blend of (HRV z-score, sleep z-score, RHR z-score, load z-score)
is a reasonable UX simplification, but it hides the inputs. **Always expose the
sub-scores on tap-through** — users need to see which component is driving a
low day so they can act on it. This is a product constraint, not a
scientific one; stated here so it survives refactors.

---

## 2. Pattern detector rationale

Mapped to `backend/app/engine/patterns.py`.

### `recovery_deficit`

**Trigger.** Any 2 of the last 3 days meet:
- HRV z < −1 (vs 60-day baseline), **and**
- sleep_hours < user's 30-day mean − 1 h, **and/or**
- RHR z > +1.

**Why this combination.** The ECSS/ACSM consensus on overtraining lists
reduced HRV, elevated resting HR, and disturbed sleep among the earliest
monitorable signs of non-functional overreaching.¹⁶ Requiring co-occurrence
across two days reduces false positives from a single bad night.

**Action surface.** Low-intensity recommendation set; defer hard sessions;
raise anomaly-driven check-in asking about illness, travel, alcohol, stress.

### `overreaching`

**Trigger.** 7-day rolling ln(RMSSD) mean < 60-day baseline − 1 SD, sustained
≥4 days, **combined with** elevated acute load (ACWR ≥ 1.3).

**Why the combination is required.** HRV alone falling is ambiguous — it can
indicate illness, travel, alcohol, or stress. Pairing the HRV decline with
an elevated load makes *training-induced* overreaching the most parsimonious
explanation, consistent with the Bellenger meta-analysis findings that
distinguished NFOR (HRV ↓) from functional overreaching (HRV ↑ or unchanged).³

**Action surface.** Recommend reduced-intensity week; surface the pattern in
the insights feed with the load context visible.

### `circadian_drift`

**Trigger.** Sleep-midpoint SD > 60 min over the trailing 7 nights, or
weekday-weekend midpoint delta > 1 h.

**Why.** See §1.4; irregular sleep timing is independently predictive of
cardiometabolic risk.¹⁰ ¹¹ ¹²

**Action surface.** Recommend a fixed wake time (more effective than a fixed
bedtime for anchoring circadian phase); surface social-jetlag-specific
messaging if the weekday/weekend delta is the driver.

---

## 3. Recommendation evidence base

Every action surfaced by `engine/recommendations.py` needs a citation. The ones
currently supported:

### Caffeine cutoff

> "Avoid caffeine after ~2 pm on days following poor sleep."

**Evidence.** In a controlled study, 400 mg caffeine taken **6 hours before
bed** reduced total sleep time by more than 1 hour, with users frequently
unaware of the impact.¹⁷ The 2 pm default assumes ~10 pm target bedtime and a
conservative margin.

**Confidence:** high. **When to suppress:** users who report no caffeine
sensitivity across multiple n=1 trials.

### Alcohol

> "Alcohol within 3 hours of bedtime measurably suppresses HRV and REM."

**Evidence.** Alcohol shortens sleep-onset latency but fragments the second
half of the night, suppresses REM, and reduces HRV during sleep — especially
parasympathetic indices.¹⁸ This is the mechanistic rationale behind tagging
"drinks last night" as a primary confounder in check-ins.

**Confidence:** high.

### Evening light / screen use

> "Dim screens and avoid bright light 1–2 hours before target bedtime."

**Evidence.** Evening use of light-emitting e-readers delayed circadian
timing, suppressed melatonin, and impaired next-morning alertness relative
to print reading in a crossover study.¹⁹ Effect sizes were modest per
session but compound with consistent exposure.

**Confidence:** moderate. Individual variance is high; this is a good
candidate for an n=1 experiment rather than a blanket recommendation after
the first low-HRV night.

### Fixed wake time

> "Pick one wake time, including weekends."

**Evidence.** A fixed wake time anchors circadian phase more reliably than a
fixed bedtime. The sleep-regularity literature shows benefit independent of
duration.¹⁰ ¹¹

**Confidence:** high for the principle; individual effect size varies.

### Sleep extension

> "Try adding 60 min to sleep opportunity for 2 weeks."

**Evidence.** Mah et al. showed material performance gains from sleep
extension in an athletic cohort.⁹ Mechanistic extrapolation to general
cognition/mood is reasonable but not definitive.

**Confidence:** moderate. Strong candidate for n=1.

### Back-off day after HRV drop

> "Replace today's planned hard session with Zone-2 or rest."

**Evidence.** HRV-guided training groups outperformed fixed-periodization
groups on running performance and VO₂max.⁴ The mechanism is exactly what this
recommendation executes: add easy days when parasympathetic tone is
suppressed, retain hard days when it's recovered.

**Confidence:** high.

---

## 4. n-of-1 experiment standards

Mapped to `backend/app/engine/experiments.py`.

### Design

- **Minimum arm length: 7 days.** Physiological carryover (caffeine,
  alcohol, sleep debt) extends multiple days; shorter arms conflate the arms.
- **Preferred design: ABAB crossover** with randomized order where feasible,
  per the n-of-1 literature framework.²⁰
- **Primary metric pre-registered** at experiment creation. No post-hoc
  primary-metric switching.
- **Pre-period baseline: 14 days minimum** so the pre-mean is stable.

### Analysis

- Report **Cohen's d** (standardized mean difference) with an explicit
  interpretation band: 0.2 small, 0.5 medium, 0.8 large.
- Report **95% CI** on the difference, not just the point estimate.
- **Do not declare a winner if the CI crosses zero** — surface the result
  as "inconclusive" and offer to extend.
- Flag confounders during the window: travel, illness, menstrual-cycle
  phase, major life stress. Exclude or annotate those days.

### When to stop early

Only if the user's safety signal regresses materially (HRV crashes,
prolonged illness). Stopping for "it's working!" before the pre-registered
window closes is standard p-hacking and must be blocked in the UI.

---

## 5. Confidence & messaging rules

1. **Never diagnose.** No endpoint response should contain "you have X."
   Use "your data suggests" or "this pattern often indicates."
2. **Confidence tiers.** Every recommendation carries a confidence score
   derived from:
   - Baseline data sufficiency (days of history).
   - Recent data completeness (no >20% missing days in the trailing 30).
   - Pattern-detector agreement (single signal vs multi-signal convergence).
3. **Low-N mode.** First 21 days: do not emit pattern-based recommendations.
   Surface "still learning your baselines" and prioritize data completeness.
4. **Causal language is banned** unless derived from a completed, adequately
   powered n=1 experiment for that specific user.

---

## 6. Baseline hygiene

- **Minimum baseline: 21 days** of data before any z-score-based pattern
  fires. This is a heuristic — shorter windows produce unstable SDs and
  false-positive anomalies.
- **Rebuild cadence.** Nightly background job recomputes 7/30/60/90-day
  rolling stats per user per metric.
- **Reset triggers.** Offer a baseline-reset flow after: illness >7 days,
  international travel >3 time zones, major life event (user-triggered),
  menstrual cycle phase annotation. Do not auto-reset without user consent —
  it discards information the correlation learner (V3) will eventually need.

---

## 7. Out-of-scope populations / when to suppress recommendations

The evidence base behind the thresholds in this document is drawn from
studies of healthy adults and trained athletes. The app should **not**
surface load/HRV recommendations, and should downgrade messaging to generic
wellness content, for users who indicate any of:

- Known arrhythmia (especially atrial fibrillation — HRV metrics are
  meaningless under AF).
- Pregnancy (baselines shift dramatically; different reference literature
  applies).
- Active cardiovascular disease or under cardiology care.
- Age <18.
- Eating disorder history (exercise/sleep recommendations can be harmful).

These are onboarding gates, not runtime inferences. Runtime inference of
clinical conditions is out of scope for this product and probably for this
decade.

---

## 8. Open questions for next review

- How much of the ACWR framework survives the Impellizzeri critique when
  replicated on non-athletic populations? We may need to drop it entirely
  and replace with a simpler acute-deviation signal.
- Can we validate the 5-bpm RHR threshold against user-reported illness
  data once we have >1000 users × 90 days?
- When does the correlation learner (V3) have enough per-user data to
  override population-level recommendations? Pre-register that threshold
  before we build it.

---

## References

1. Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. Training
   adaptation and heart rate variability in elite endurance athletes:
   opening the door to effective monitoring. *Sports Med.* 2013;43(9):773–781.
2. Buchheit M. Monitoring training status with HR measures: do all roads
   lead to Rome? *Front Physiol.* 2014;5:73.
3. Bellenger CR, Fuller JT, Thomson RL, Davison K, Robertson EY, Buckley JD.
   Monitoring athletic training status through autonomic heart rate
   regulation: a systematic review and meta-analysis.
   *Sports Med.* 2016;46(10):1461–1486.
4. Kiviniemi AM, Hautala AJ, Kinnunen H, Tulppo MP. Endurance training
   guided individually by daily heart rate variability measurements.
   *Eur J Appl Physiol.* 2007;101(6):743–751.
5. Nauman J, Janszky I, Vatten LJ, Wisløff U. Temporal changes in resting
   heart rate and deaths from ischemic heart disease.
   *JAMA.* 2011;306(23):2579–2587.
6. Hirshkowitz M, Whiton K, Albert SM, et al. National Sleep Foundation's
   sleep time duration recommendations: methodology and results summary.
   *Sleep Health.* 2015;1(1):40–43.
7. Watson NF, Badr MS, Belenky G, et al. Recommended amount of sleep for a
   healthy adult: a joint consensus statement of the American Academy of
   Sleep Medicine and Sleep Research Society. *Sleep.* 2015;38(6):843–844.
8. Van Dongen HPA, Maislin G, Mullington JM, Dinges DF. The cumulative
   cost of additional wakefulness: dose-response effects on neurobehavioral
   functions and sleep physiology from chronic sleep restriction and total
   sleep deprivation. *Sleep.* 2003;26(2):117–126.
9. Mah CD, Mah KE, Kezirian EJ, Dement WC. The effects of sleep extension
   on the athletic performance of collegiate basketball players.
   *Sleep.* 2011;34(7):943–950.
10. Lunsford-Avery JR, Engelhard MM, Navar AM, Kollins SH. Validation of
    the Sleep Regularity Index in older adults and associations with
    cardiometabolic risk. *Sci Rep.* 2018;8(1):14158.
11. Huang T, Mariani S, Redline S. Sleep irregularity and risk of
    cardiovascular events: the Multi-Ethnic Study of Atherosclerosis.
    *J Am Coll Cardiol.* 2020;75(9):991–999.
12. Wittmann M, Dinich J, Merrow M, Roenneberg T. Social jetlag:
    misalignment of biological and social time.
    *Chronobiol Int.* 2006;23(1–2):497–509.
13. Gabbett TJ. The training-injury prevention paradox: should athletes be
    training smarter and harder? *Br J Sports Med.* 2016;50(5):273–280.
14. Hulin BT, Gabbett TJ, Lawson DW, Caputi P, Sampson JA. The
    acute:chronic workload ratio predicts injury: high chronic workload may
    decrease injury risk in elite rugby league players.
    *Br J Sports Med.* 2016;50(4):231–236.
15. Impellizzeri FM, Woodcock S, Coutts AJ, Fanchini M, McCall A,
    Vigotsky AD. What role do chronic workloads play in the acute to chronic
    workload ratio? Time to dismiss ACWR and its underlying theory.
    *Sports Med.* 2021;51(3):581–592.
16. Meeusen R, Duclos M, Foster C, et al. Prevention, diagnosis, and
    treatment of the overtraining syndrome: joint consensus statement of
    the European College of Sport Science and the American College of
    Sports Medicine. *Med Sci Sports Exerc.* 2013;45(1):186–205.
17. Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken
    0, 3, or 6 hours before going to bed.
    *J Clin Sleep Med.* 2013;9(11):1195–1200.
18. Ebrahim IO, Shapiro CM, Williams AJ, Fenwick PB. Alcohol and sleep I:
    effects on normal sleep. *Alcohol Clin Exp Res.* 2013;37(4):539–549.
19. Chang AM, Aeschbach D, Duffy JF, Czeisler CA. Evening use of
    light-emitting eReaders negatively affects sleep, circadian timing, and
    next-morning alertness. *PNAS.* 2015;112(4):1232–1237.
20. Schork NJ. Personalized medicine: time for one-person trials.
    *Nature.* 2015;520(7549):609–611.
