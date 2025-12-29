// ============================================================================
// SHOP CONFIGURATION - White Label Settings
// ============================================================================
// Edit this file to customize the MiniApp for your business.
// After editing, rebuild the frontend: npm run build
// ============================================================================

export interface ShopConfig {
  // Basic business info
  appName: string;
  businessType: 'barbershop' | 'beauty_salon' | 'spa' | 'nail_studio' | 'other';
  description: string;
  currency: string;
  timezone: string; // IANA timezone, e.g. "Europe/Moscow"

  // Admin access (Telegram User IDs)
  // Get your ID from @userinfobot in Telegram
  adminIds: number[];

  // Contact information (shown in app)
  contacts: {
    phone?: string;
    website?: string;
    telegramChannel?: string;
    address?: string;
  };

  // Payment settings
  payment: {
    enabled: boolean;
    providerToken: string;  // From BotFather -> Payments
    requirePrepayment: boolean;
  };

  // UI Branding
  branding: {
    primaryColor: string;   // Hex color, e.g. "#007AFF"
    logoUrl: string;        // Path to logo in /public folder
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

  // Security settings
  security: {
    maxPendingBookingsPerUser: number; // Max unpaid bookings per user (0 = unlimited)
    autoCancelUnpaidMinutes: number;   // Auto-cancel unpaid after N minutes (0 = disabled)
  };
}

// ============================================================================
// YOUR CONFIGURATION - Edit the values below
// ============================================================================

export const shopConfig: ShopConfig = {
  // ----- BASIC INFO -----
  appName: "Elite Beauty Spa",
  businessType: "beauty_salon",
  description: "Премиальные услуги красоты и релаксации",
  currency: "RUB",
  timezone: "Europe/Moscow", // Change for your region

  // ----- ADMINS -----
  // Replace with your Telegram User IDs
  adminIds: [6850941390],

  // ----- CONTACTS -----
  contacts: {
    phone: "+7 (999) 123-45-67",
    website: "https://yoursalon.com",
    telegramChannel: "@yoursalon",
    address: "г. Москва, ул. Примерная, д. 1",
  },

  // ----- PAYMENT -----
  payment: {
    enabled: true,
    providerToken: "381764678:TEST:0000",  // Get from BotFather
    requirePrepayment: false,
  },

  // ----- BRANDING -----
  branding: {
    primaryColor: "#007AFF",
    logoUrl: "/logo.png",
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

  // ----- SECURITY -----
  security: {
    maxPendingBookingsPerUser: 3,  // Max 3 unpaid bookings per user
    autoCancelUnpaidMinutes: 30,   // Cancel unpaid bookings after 30 min
  },
};
