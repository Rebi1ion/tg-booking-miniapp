// ============================================================================
// SHOP CONFIGURATION - White Label Settings
// ============================================================================
// Edit this file to customize the MiniApp for your business.
// After editing, rebuild the frontend: npm run build
// ============================================================================

export interface ShopConfig {
  // Basic business info
  appName: string;
  timezone: string; // IANA timezone, e.g. "Europe/Moscow"

  // Admin access (Telegram User IDs)
  // Get your ID from @userinfobot in Telegram
  adminIds: number[];

  // Payment settings
  payment: {
    enabled: boolean;
    requirePrepayment: boolean;
  };

  // UI Branding
  branding: {
    welcomeMessage: string; // Greeting message on home screen
  };

  // API URL (your backend server)
  // For local development: "http://localhost:3000/api"
  // For production: "https://api.yourdomain.com/api"
  apiUrl: string;

  // Base URL for relative paths (e.g. uploads)
  baseUrl: string;

  // Default booking hours (fallback if master doesn't have custom hours)
  bookingDefaults: {
    startHour: number;      // e.g. 9 for 9:00
    endHour: number;        // e.g. 21 for 21:00
    intervalMinutes: number; // Time slot interval, e.g. 30
  };
}

// ============================================================================
// YOUR CONFIGURATION - Edit the values below
// ============================================================================

// Parse admin IDs from env (comma-separated string to number array)
const parseAdminIds = (envValue: string | undefined): number[] => {
  if (!envValue) return [];
  return envValue.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
};

export const shopConfig: ShopConfig = {
  // ----- BASIC INFO -----
  // Автоматически берётся из VITE_* при сборке
  appName: import.meta.env.VITE_APP_NAME || "Мой бизнес",
  timezone: import.meta.env.VITE_TIMEZONE || "Europe/Moscow",

  // ----- ADMINS -----
  // Автоматически берётся из VITE_ADMIN_IDS
  adminIds: parseAdminIds(import.meta.env.VITE_ADMIN_IDS),

  // ----- PAYMENT -----
  payment: {
    enabled: true,
    requirePrepayment: false,
  },

  // ----- BRANDING -----
  branding: {
    welcomeMessage: import.meta.env.VITE_WELCOME_MESSAGE || "Добро пожаловать! Выберите услугу для записи.",
  },

  // ----- API URL -----
  // Автоматически берётся из VITE_API_URL при сборке
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000/api",

  // Base URL for static assets (derived from API URL)
  baseUrl: (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api$/, ''),

  // ----- BOOKING DEFAULTS -----
  bookingDefaults: {
    startHour: 10,
    endHour: 20,
    intervalMinutes: 30,
  },
};
