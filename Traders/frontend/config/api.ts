// API Configuration
export const API_CONFIG = {
  // Configure at runtime/build time:
  // - Expo: set `EXPO_PUBLIC_API_BASE_URL` (recommended)
  // Example: EXPO_PUBLIC_API_BASE_URL=https://your-traders-backend.up.railway.app/api
  BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    'https://YOUR-TRADERS-BACKEND.up.railway.app/api',
  TIMEOUT: 10000,
};

// Note:
// - For local dev, you can set EXPO_PUBLIC_API_BASE_URL to your LAN IP.
// - For Railway, set EXPO_PUBLIC_API_BASE_URL to your Railway backend URL.