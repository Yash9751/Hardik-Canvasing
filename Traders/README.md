## Traders (Standalone Product)

This folder is a **separate product** from `Good_luck_Traders/`. It contains:

- **`frontend/`**: Expo (same UI, rebranded to **Traders**)  
- **`backend/`**: Node + Express + **Postgres** (deploy to **Railway**)  
- **`desktop/`**: Electron wrapper to build a **Windows installer (.exe)**  

### Backend (Railway + Postgres)

- **Deploy**: create a new Railway service from `Traders/backend/`
- **Add Postgres**: attach a Railway Postgres database to the backend service
- **Set variables** (Railway Variables tab):
  - `NODE_ENV=production`
  - `ENABLE_DEBUG_ROUTES=false`
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Railway provides these)
- **Health check**: `/api/health`

To initialize tables, call the init logic via your normal startup (recommended).  
If you want to manually initialize for debugging, set `ENABLE_DEBUG_ROUTES=true` and hit `/api/init-db` once, then turn it back off.

### Frontend (Expo)

In `Traders/frontend/`, create an env file from `env.example` and set:

- `EXPO_PUBLIC_API_BASE_URL=https://<your-railway-backend>.up.railway.app/api`

### Windows Desktop (Electron)

From `Traders/desktop/`:

1. Install dependencies:
   - `npm install`
2. Build Windows installer:
   - `npm run build:win`

Notes:
- The build exports the Expo web app into `Traders/desktop/renderer/` and packages it.
- For best results, run the Windows build **on Windows** (so `electron-builder` can produce `.exe`/NSIS cleanly).

