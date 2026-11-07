# Google sign-in setup

BenEnglish AI uses Firebase Authentication with Google's OAuth provider.

## 1. Create or select a Firebase project
1. Open https://console.firebase.google.com/ and select the project for BenEnglish AI.
2. Add a Web app in Project settings.
3. Copy the Web app configuration values for API key, Auth domain, Project ID and App ID.

## 2. Enable Google authentication
1. Open Authentication → Sign-in method.
2. Enable the Google provider.
3. Select the support email and save.
4. In Authentication → Settings → Authorized domains, add the production domain `ben-english-ai.vercel.app` and the Preview domain you use for testing.

## 3. Configure Vercel
Add these variables to the BenEnglish AI project for Preview and Production:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Redeploy after saving the variables. Do not put service-account private keys or Admin SDK credentials in any `VITE_*` variable.

## Current progress storage behavior
After Google sign-in, the app uses a separate local browser storage namespace for each Firebase user ID. Guest progress remains under the existing guest keys and is not overwritten. This first authentication phase does not yet sync progress between devices; Firestore sync and explicit guest-progress migration should be a separately reviewed phase.
