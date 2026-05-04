# Running Fayage Locally

Backend is hosted on Railway. Database is on Supabase.
You only need to run the **mobile app** locally.

## Requirements

- [Node.js 18+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation) — `npm install -g pnpm`
- [Expo Go](https://expo.dev/go) app on your phone (iOS or Android)

## Steps

**1. Clone the repo**
```bash
git clone https://github.com/ashrefkarim/fayage.git
cd fayage
```

**2. Install dependencies**
```bash
pnpm install
```

**3. Create the mobile environment file**
```bash
cp artifacts/mobile/.env.example artifacts/mobile/.env
```
The `.env` file already points to the live Railway backend — no changes needed.

**4. Start the mobile app**
```bash
cd artifacts/mobile
npx expo start
```

**5. Open on your phone**
- Scan the QR code shown in the terminal with the **Expo Go** app
- The app connects automatically to the Railway backend and Supabase database

## Environment Variables

| File | Variable | Value |
|---|---|---|
| `artifacts/mobile/.env` | `EXPO_PUBLIC_DOMAIN` | `https://workspaceapi-server-production-23f6.up.railway.app` |

No other environment variables are needed locally — the backend and database run on Railway/Supabase.
