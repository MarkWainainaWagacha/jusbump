# BumpShare

Tap two phones together to exchange phone numbers — no NFC required. Detects a
physical "bump" via the accelerometer, then matches it against other bumps
happening in the same 2-second window and (roughly) the same location, using
Firestore as the matching server.

## How it works

1. Both people open the app and enter the number they want to share.
2. Both physically tap/bump their phones together (edge or back — not screen
   glass, which has no touch sensor for this).
3. Each phone's accelerometer detects the jolt and publishes a "bump" doc to
   Firestore with a timestamp + GPS coordinates.
4. The app looks for another unmatched bump within ~2 seconds and ~50m and
   pairs the two docs together.
5. Both phones display the other person's number.

This is the same technique the old "Bump" app (Google, discontinued) used —
not NFC, not screen-touch detection (no sensor can detect that), but genuinely
requires zero special hardware beyond a standard accelerometer, which every
Android and iOS phone has.

## Setup

```bash
npm install
```

1. Create a Firebase project (or reuse your AttendEase one) at
   https://console.firebase.google.com
2. Enable **Firestore Database** and **Authentication → Anonymous sign-in**.
3. Paste your Firebase config into `src/firebase.ts`.
4. Deploy the security rules:
   ```bash
   npx firebase deploy --only firestore:rules
   ```
   (or paste `firestore.rules` into the Firestore Rules tab in console)

## Run in browser (fastest way to test the UI, not the sensor)

```bash
npm run dev
```

Note: bump detection needs a real device — desktop browsers don't have an
accelerometer. Use Chrome DevTools' device toolbar for basic sensor
simulation, or just build to Android and test on two real phones.

## Build to Android (same flow as AttendEase — no Android Studio needed)

```bash
npm run build
npx cap add android
npm run cap:sync
```

Then build the APK via GitHub Actions CI/CD, the same pipeline you already
have set up for AttendEase — copy that workflow file over and point it at
this repo.

## Tuning the bump sensitivity

`src/lib/bumpDetector.ts` has two constants worth adjusting once you test on
your actual device:

- `BUMP_THRESHOLD` — raise it if the app triggers on normal handling/walking;
  lower it if a real bump isn't being detected.
- `DEBOUNCE_MS` — how long to ignore repeat spikes right after a bump.

Log the raw `magnitude` value during testing to calibrate — every phone's
accelerometer noise floor is slightly different.

## Known limitations

- **False matches in crowds**: if two unrelated people bump their phones in
  the same second nearby, they could get matched with each other instead of
  their intended partner. Fine for demo/personal use; would need a
  confirmation step (e.g. "confirm the person facing you") for production.
- **Needs internet at the moment of bump** — matching happens through
  Firestore, so there's no offline peer discovery.
- **GPS accuracy indoors** can be poor; the matching logic falls back to
  time-only matching if location is unavailable, which is looser.
- **No stale-bump cleanup job included** — add a scheduled Cloud Function to
  delete `bumps` docs past their `expiresAt`, or they'll accumulate.
