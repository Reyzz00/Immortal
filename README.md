# Longevity OS

A closed-loop personal-health intelligence system. Ingests wearable data, learns
your baselines, flags anomalies, recommends actions, adapts its own questions,
and runs self-experiments to figure out what actually moves your HRV / sleep /
readiness.

```
 Wearables → App → API → Intelligence → DB → Recommendation engine → App
```

## Repo layout

```
backend/    FastAPI · SQLAlchemy · baseline/state/pattern/recommendation engines · seed script
mobile/     Expo + React Native + TypeScript · 5 screens · React Query · Zustand
```

## Run the backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed              # 30 days of synthetic data, one active experiment
uvicorn app.main:app --reload       # http://localhost:8000
```

Smoke test:

```bash
curl -s localhost:8000/user/state            | python -m json.tool
curl -s localhost:8000/recommendations/today | python -m json.tool
curl -s localhost:8000/checkin/prompt        | python -m json.tool
curl -s localhost:8000/insights/feed         | python -m json.tool
curl -s localhost:8000/experiments           | python -m json.tool
curl -s "localhost:8000/trends/hrv?days=30"  | python -m json.tool
```

The seeded dataset is crafted so the pattern detector fires `recovery_deficit` +
`overreaching` today — you'll see non-trivial recommendations and anomaly-driven
check-in questions on first run.

## Run the app

```bash
cd mobile
npm install                                     # or: npm install --cache /tmp/npm-cache
npx expo start                                  # then press i / a / w
```

The app reads `apiBaseUrl` from `app.json > expo.extra`. Defaults to
`localhost:8000` (iOS simulator / web) and auto-rewrites to `10.0.2.2:8000` on
Android emulator.

## What's inside the intelligence layer

| Module                  | Does                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `engine/baselines.py`   | 7 / 30 / 90d rolling mean + σ per metric, z-score helper           |
| `engine/state.py`       | Daily sleep / stress / recovery / load / composite readiness       |
| `engine/patterns.py`    | Rule + z-score hybrid: recovery deficit, overreaching, circadian   |
| `engine/recommendations.py` | Patterns → ranked, confidence-scored actions with reasoning   |
| `engine/checkin.py`     | Adaptive question set: anomaly-triggered follow-ups                |
| `engine/experiments.py` | Pre/post means, effect size, automatic evaluation on window close  |
| `engine/insights.py`    | Human-readable feed: patterns + 7v7 readiness trend                |

## Endpoints

```
POST /health/sync                 # ingest metrics (normalizes + triggers re-compute)
GET  /user/state                  # today's composite + anomalies
GET  /recommendations/today
POST /recommendations/{id}/accept
POST /recommendations/{id}/ignore
GET  /checkin/prompt              # adaptive, changes with detected patterns
POST /checkin/submit              # stores answers + infers structured context
GET  /experiments
POST /experiments/start
GET  /insights/feed
GET  /trends/{metric}?days=30     # hrv | sleep_hours | resting_hr | readiness | load_score
```

## MVP → V3 roadmap

* **MVP (this repo):** RN app, live Apple HealthKit ingest with anchored
  incremental sync, dashboard, basic scoring, rule-based recommendations,
  adaptive check-ins, experiment framework. See
  [`docs/HEALTHKIT.md`](./docs/HEALTHKIT.md) for the integration contract and
  [`docs/EVIDENCE.md`](./docs/EVIDENCE.md) for the clinical guidelines that
  back the engine thresholds.
* **V2:** Fitbit / Oura OAuth, Celery worker for nightly baseline rebuild,
  push notifications, deleted-sample propagation, source allowlist UI.
* **V3:** Per-user correlation learner (caffeine/screens/load → HRV/sleep
  quality), causal inference on experiment outcomes, predictive health
  trajectories, automatic experiment proposals.

## Moving off SQLite for prod

The schema is Postgres-compatible. To flip to TimescaleDB:

1. `DATABASE_URL=postgresql+psycopg://user:pass@host/db`
2. Turn `health_metrics` into a hypertable:
   `SELECT create_hypertable('health_metrics', 'timestamp');`
3. Everything else (SQLAlchemy, indexes, queries) is unchanged.

## Auth

Stubbed via `app/api/deps.py::current_user_id` returning a demo user. Drop in
Firebase Auth / Auth0 by replacing that dependency and adding a bearer-token
middleware — no endpoint code changes needed.
