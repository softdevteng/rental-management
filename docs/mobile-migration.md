# Mobile migration proposal (Expo React Native)

This document outlines a pragmatic plan to create a mobile client (Expo-managed React Native) that reuses the existing backend API, auth, and data models.

Goals
- Reuse backend APIs (auth, tenants, payments, tickets, notices) with same JWT-based auth flow.
- Provide offline-friendly UX for viewing payments and tickets (read caching + sync).
- Deliver a minimal v1 in ~2-3 sprints (2-4 weeks depending on team size).

Architecture
- Expo (managed) app using React Navigation, Axios (or fetch wrapper), and SecureStore for token storage.
- Share UI primitives and API contracts via documented JSON shapes. Consider extracting shared validation logic into a small npm package later.

Auth & Session
- Use the same /api/auth endpoints. After login/register, store JWT in SecureStore and include Authorization: Bearer <token> header.
- Expose a small `auth.js` helper in the mobile app with functions: login, logout, getToken, setToken, with a React context for easy access.

Offline strategy (optional for v1)
- Cache important read endpoints (tenants, payments, tickets) using AsyncStorage with strategy: stale-while-revalidate.
- Queue writes (e.g., ticket creation) when offline and sync when online.

File scaffold (suggested)
- mobile/
  - App.js (entry)
  - package.json
  - src/
    - api.js (wrapper, uses fetch/axios)
    - auth.js (SecureStore helpers + context)
    - navigation/ (stacks: Auth, Tenant, Landlord, Caretaker)
    - screens/ (Signin, Register, Dashboard, Tenants, Tickets, Payments, MPesa)
    - components/ (form fields, lists)

Timeline & milestones (example)
- Week 1: Scaffold project, auth flow, Signin/Register, basic Dashboard screen.
- Week 2: Tenants list, ticket creation, payments view, integrate MPesa initiation screen.
- Week 3: Offline caching + sync, polish, E2E test, beta release.

Acceptance criteria for v1
- Users can sign in and view the same data as web dashboards (tenants, payments, tickets).
- Landlords can initiate MPesa push (calls backend) from mobile.
- Basic navigation and responsive layouts across iOS/Android.

Next steps
- Confirm whether to scaffold the Expo project here in the repo (adds mobile/ folder) or create a separate repository.
- If proceeding here, I can scaffold the initial Expo project and implement the auth flow next.
