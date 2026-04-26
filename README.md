# Nobti Expo (Web + Mobile)

Cross-platform app built with Expo Router, designed from `nobti_v3.html` as a responsive app that runs on web and mobile.

## Run

```bash
npm install
npm run web
npm run android
npm run ios
```

## Supabase setup

1. Copy `.env.example` to `.env`
2. Fill these keys:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_API_BASE_URL=https://api.your-backend.com
EXPO_PUBLIC_WS_BASE_URL=wss://api.your-backend.com/ws
```

Expo loads these values through [app.config.ts](app.config.ts) using `dotenv/config`. Keep secret/service keys on backend only.

## Project structure

- `app/`: Expo Router routes (visitor + establishment flows)
- `src/screens/`: screen containers
- `src/components/`: reusable UI components
- `src/state/`: global app state/context (mock queue logic)
- `src/data/`: placeholder/mock data
- `src/theme/`: colors/tokens
- `assets/branding/`: extracted Nobti logo
- `assets/placeholders/`: extracted placeholder images from the HTML reference

## Notes

- Current data/flows are mock-only and ready to connect to backend APIs later.
- Routing is already separated by domain:
  - Visitor: `app/visitor/*`
  - Establishment: `app/establishment/*`
- UI is mobile-first and constrained responsively for web.
