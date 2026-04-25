# Apple HealthKit setup

Immortal pulls HRV, sleep, resting heart rate, steps and workouts from Apple Health via [`@kingstinct/react-native-healthkit`]. The wiring is already done:

- `mobile/src/services/healthkit.ts` — request permissions + pull recent samples + POST to `/health/sync`.
- `mobile/src/hooks/useHealthKit.ts` — React Query mutation.
- `mobile/src/components/HealthSyncCard.tsx` — card on the Dashboard with a "Sync now" button (or setup steps when HealthKit isn't available).
- `mobile/app.json` — config plugin registered with `NSHealthShareUsageDescription` + background-delivery entitlement.

HealthKit is iOS-only and **cannot run in Expo Go** — the native Nitro module isn't bundled there. The card on the Dashboard detects this and shows setup instructions instead.

## What you need to do

You don't have Xcode locally, so build the dev client in Expo's cloud (EAS Build).

### 1. Apple ID
A free Apple ID works. Apple will tie the build to your team.

### 2. Expo account + CLI
```bash
npm install -g eas-cli            # or:  npx eas-cli ...
npx eas-cli login                 # creates/logs into your Expo account
```

### 3. Tell EAS about this project
From `mobile/`:
```bash
npx eas-cli init --id-auto        # creates an Expo project slug, writes it into app.json
```

### 4. Build the dev client
```bash
npx eas-cli build --platform ios --profile development
```

EAS will:
- prompt for your Apple ID
- register your device's UDID (it'll walk you through a QR to do it)
- provision a signing certificate + profile
- produce an installable `.ipa` and give you a QR + link

Install the dev client on your iPhone from the link EAS prints.

### 5. Point the dev client at your Metro dev server
Start Metro with a tunnel (same as the current setup):
```bash
cd mobile
npx expo start --dev-client --tunnel
```
Open the dev client on your phone; it'll auto-find the tunnel.

### 6. Grant HealthKit permissions
First time you tap **Sync now** on the Dashboard the system prompt appears — toggle on the categories you care about (HRV, sleep, resting HR, steps, workouts). The sync card turns green and hits `POST /health/sync`.

## Backend URL

The app reads `expo.extra.apiBaseUrl` from `app.json`. Right now it points at the Cloudflare tunnel we started (`https://…trycloudflare.com`). For a production build swap it for your real API host.

## Troubleshooting

- **"HealthKit native module not found"** — you opened the app in Expo Go instead of the dev client, or the build didn't include the module. Rebuild with `eas build`.
- **Permission prompt doesn't appear** — you already denied it; go to iOS Settings → Privacy & Security → Health → Immortal → enable categories.
- **Sync returns 0 metrics** — HealthKit has no data for the window. Wear your watch for a day and retry.
- **Android** — HealthKit is iOS-only. For Android, add `react-native-health-connect` with a parallel `syncRecent()` — the backend schema already accepts whatever `source` field you pass.
