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

export const shopConfig: ShopConfig = {
  // ----- BASIC INFO -----
  appName: "Elite Beauty Spa",
  timezone: "Europe/Moscow", // Change for your region

  // ----- ADMINS -----
  // Replace with your Telegram User IDs
  adminIds: [6850941390],

  // ----- PAYMENT -----
  payment: {
    enabled: true,
    requirePrepayment: false,
  },

  // ----- BRANDING -----
  branding: {
    welcomeMessage: "Добро пожаловать! Выберите услугу для записи.",
  },

  // ----- API URL -----
  // Change this to your production URL when deploying
  apiUrl: "https://api-tg-miniapp.mooo.com:9444/api",

  // ----- BOOKING DEFAULTS -----
  bookingDefaults: {
    startHour: 10,
    endHour: 20,
    intervalMinutes: 30,
  },
};
