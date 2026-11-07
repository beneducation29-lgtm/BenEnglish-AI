# BenEnglish AI — Cloud learner memory setup

Cloud memory is opt-in. Until it is enabled, the app continues to save progress in account-scoped browser storage exactly as before.

## Enable Firestore sync

1. In the Firebase project used by the BenEnglish web app, create or enable a Cloud Firestore database.
2. Review `firestore.rules` in this repository and deploy those rules to the same Firebase project. They allow a signed-in user to read and write only `learners/{their-own-uid}`.
3. In the Vercel project, add the environment variable `VITE_FIREBASE_ENABLE_CLOUD_SYNC=true` to the environments where you want sync enabled.
4. Confirm the existing Firebase web app variables are set: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.
5. Redeploy the Preview and test with two devices signed into the same Google account. Also verify that a second Google account cannot see the first account's learner document.

## What is synchronized

The signed-in learner's profile, placement assessment, progress and session history, vocabulary review state, and learner-created listening lessons are stored in that learner's own Firestore document. The app keeps local browser storage as a fallback if Firestore is unavailable.

The first sync merges record arrays by stable IDs/words and retains the higher numeric progress counters. Review the merged result before relying on it as the canonical record if the same account has been used on multiple devices.

## Privacy and operational notes

- Do not enable the feature until the owner-only Firestore rules have been deployed.
- Never put service-account credentials or private API keys in Vite environment variables.
- Firestore must be enabled and billing/quotas configured in the Firebase project.
- This client-side sync is not a substitute for server-side audit logging or a backup strategy.
