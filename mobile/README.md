# Mobile App (Proposal & Starter Plan)

Goal: provide a mobile application for landlords, caretakers and tenants that reuses the existing backend APIs for auth, real-time updates and payments. The fastest path is to build an Expo (React Native) app that shares UI patterns and API client logic with the existing web frontend.

Why Expo?
- Fast to scaffold and iterate (managed workflow).
- Reuse much of the existing React code patterns and JS libraries (fetch/axios, JWT handling).
- Easy to run on device/emulator and produce builds for App Store / Play Store.

Minimum viable features for first mobile iteration:
- Auth (Sign in / Sign up) using existing endpoints (/api/auth/login etc.).
- Dashboard overview (stats, recent notices, quick actions) — reuse DashboardOverview design.
- Notices list and detail view.
- Payments: call existing payment endpoints; for MPESA integrate webview or deeplink flow if required.
- Realtime: use existing Socket.IO or SSE endpoint for updates. (Socket.IO works well with React Native via socket.io-client.)

Auth & API notes:
- Use same JWT token returned by backend. Store securely using `expo-secure-store` or `react-native-keychain`.
- Headers: `Authorization: Bearer <token>`.

Scaffold plan (I can run this if you want):
1. `npx create-expo-app mobile` (or `expo init mobile`)
2. `cd mobile` and install: `expo install axios expo-secure-store socket.io-client` and any UI libs (React Navigation, vector-icons)
3. Create `src/api.js` that wraps existing API endpoints and reuses the same shapes.
4. Create `src/screens/SignIn.js`, `src/screens/Dashboard.js`, `src/screens/Notices.js` and wire navigation.

Ask me to scaffold the initial Expo app and I'll create the basic files and a working SignIn -> Dashboard flow that hits your backend. Or, I can instead create a smaller PWA/mobile-first set of responsive views in the existing web app if you'd prefer to postpone native scaffolding.
