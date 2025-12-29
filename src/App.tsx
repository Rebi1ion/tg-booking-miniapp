import { useEffect, useState } from 'react'
// Обратите внимание на точки в путях - это важно для вашей структуры
import { BookingWizard } from './components/booking/BookingWizard'
import { MyBookings } from './components/booking/MyBookings'
import { BirthdayForm } from './components/booking/BirthdayForm'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { MasterDashboard } from './components/master/MasterDashboard'
import { useAppStore } from './store/useAppStore'
import { Loader2, Calendar, User, Settings } from 'lucide-react'
import { ToastProvider } from './components/ui/toast'

// Helper function to determine if a hex color is dark
const isColorDark = (hexColor: string): boolean => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
};

// Convert HEX to HSL (for shadcn CSS variables)
const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Мок для разработки в браузере (используется ТОЛЬКО когда нет Telegram WebApp)
// При запуске через Telegram Mini App — имя берётся из реального Telegram аккаунта
const mockTelegram = {
    initDataUnsafe: {
        user: {
            id: 6850941390, // ID для теста (должен совпадать с админским в конфиге, чтобы видеть админку)
            first_name: "Тест (браузер)", // Это имя видно ТОЛЬКО в браузере, не в Telegram
            username: "dev_test"
        }
    },
    ready: () => { console.log("TG Ready"); },
    expand: () => { console.log("TG Expanded"); },
    themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000'
    },
    MainButton: {
        isVisible: false,
        show: () => console.log("MainButton Show"),
        hide: () => console.log("MainButton Hide"),
        onClick: () => { },
        offClick: () => { },
        setText: () => { },
    }
};

function App() {
    const { loadInitialData, upsertUser, isAdmin, checkIsAdmin, checkIsMaster, masterInfo, user } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'client' | 'admin' | 'master'>('client');
    const [clientTab, setClientTab] = useState<'booking' | 'my-bookings'>('booking');
    const [userBirthday, setUserBirthday] = useState<string | null>(null);
    const [showBirthdayForm, setShowBirthdayForm] = useState(false);

    useEffect(() => {
        // ... existing init logic ...
        const init = async () => {
            // Пытаемся получить объект Telegram, иначе берем мок
            // @ts-ignore
            const telegramWebApp = window.Telegram?.WebApp;

            // Если мы в браузере (не в Телеграме), telegramWebApp.initDataUnsafe обычно пустой {}
            // Мы считаем, что это "реальный" Телеграм только если есть данные пользователя
            const hasUserData = !!telegramWebApp?.initDataUnsafe?.user;
            const tg = hasUserData ? telegramWebApp : mockTelegram;
            const isRealTelegram = hasUserData;

            // Debug logging
            console.log("=== Telegram WebApp Debug ===");
            console.log("Is Real Telegram:", isRealTelegram);
            console.log("initDataUnsafe:", tg.initDataUnsafe);
            console.log("User data:", tg.initDataUnsafe?.user);

            tg.ready();
            tg.expand();

            // Функция для применения темы
            const applyTheme = (themeParams: any, colorScheme: string) => {
                const root = document.documentElement;
                const theme = themeParams || {};

                console.log("Applying theme:", { theme, colorScheme });

                // Проверяем системную тему как fallback
                const systemPrefersDark = window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;

                // Определяем тёмную тему (приоритет: colorScheme > bg_color > system)
                const isDark = colorScheme === 'dark' ||
                    (theme.bg_color && isColorDark(theme.bg_color)) ||
                    (!colorScheme && !theme.bg_color && systemPrefersDark);

                console.log("Theme detection:", { colorScheme, systemPrefersDark, isDark });

                // Если themeParams пустой — используем предустановленные цвета по теме
                const hasThemeColors = theme.bg_color || theme.text_color;

                if (!hasThemeColors && isDark) {
                    // Тёмная тема по умолчанию
                    const darkTheme = {
                        bg_color: '#1c1c1e',
                        text_color: '#ffffff',
                        hint_color: '#8e8e93',
                        link_color: '#0a84ff',
                        button_color: '#0a84ff',
                        button_text_color: '#ffffff',
                        secondary_bg_color: '#2c2c2e'
                    };
                    Object.assign(theme, darkTheme);
                } else if (!hasThemeColors && !isDark) {
                    // Светлая тема по умолчанию
                    const lightTheme = {
                        bg_color: '#ffffff',
                        text_color: '#000000',
                        hint_color: '#8e8e93',
                        link_color: '#007aff',
                        button_color: '#007aff',
                        button_text_color: '#ffffff',
                        secondary_bg_color: '#f2f2f7'
                    };
                    Object.assign(theme, lightTheme);
                }

                // Применяем цвета
                if (theme.bg_color) {
                    root.style.setProperty('--tg-bg-color', theme.bg_color);
                    document.body.style.backgroundColor = theme.bg_color;
                    root.style.setProperty('--background', hexToHsl(theme.bg_color));
                }
                if (theme.text_color) {
                    root.style.setProperty('--tg-text-color', theme.text_color);
                    document.body.style.color = theme.text_color;
                    root.style.setProperty('--foreground', hexToHsl(theme.text_color));
                    root.style.setProperty('--card-foreground', hexToHsl(theme.text_color));
                    root.style.setProperty('--popover-foreground', hexToHsl(theme.text_color));
                }
                if (theme.hint_color) {
                    root.style.setProperty('--tg-hint-color', theme.hint_color);
                    root.style.setProperty('--muted-foreground', hexToHsl(theme.hint_color));
                }
                if (theme.link_color) {
                    root.style.setProperty('--tg-link-color', theme.link_color);
                }
                if (theme.button_color) {
                    root.style.setProperty('--tg-button-color', theme.button_color);
                    root.style.setProperty('--primary', hexToHsl(theme.button_color));
                }
                if (theme.button_text_color) {
                    root.style.setProperty('--tg-button-text-color', theme.button_text_color);
                    root.style.setProperty('--primary-foreground', hexToHsl(theme.button_text_color));
                }
                if (theme.secondary_bg_color) {
                    root.style.setProperty('--tg-secondary-bg-color', theme.secondary_bg_color);
                    root.style.setProperty('--card', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--popover', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--muted', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--accent', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--secondary', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--input', hexToHsl(theme.secondary_bg_color));
                    root.style.setProperty('--border', hexToHsl(theme.secondary_bg_color));
                }

                // Добавляем/удаляем класс dark
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                console.log("Theme applied:", { isDark, colorScheme });
            };

            // Применяем тему сразу
            applyTheme(tg.themeParams, tg.colorScheme || 'light');

            // Слушаем изменения темы
            if (isRealTelegram && tg.onEvent) {
                tg.onEvent('themeChanged', () => {
                    console.log("Theme changed event received");
                    applyTheme(tg.themeParams, tg.colorScheme);
                });
            }

            // Устанавливаем пользователя - создаём или находим в базе
            if (tg.initDataUnsafe?.user) {
                const tgUser = tg.initDataUnsafe.user;

                console.log("Creating/updating user:", tgUser.first_name, "@" + tgUser.username);

                // Создаём/находим пользователя в базе данных
                const userData = await upsertUser({
                    id: tgUser.id,
                    first_name: tgUser.first_name,
                    username: tgUser.username
                });

                // Сохраняем дату рождения если она есть
                if (userData?.birthday) {
                    setUserBirthday(userData.birthday);
                }

                // Проверка: Если это админ, сразу переключаем вью на админку
                if (userData && checkIsAdmin(userData.telegram_id)) {
                    console.log("Admin detected!");
                    setViewMode('admin');
                } else {
                    // Проверяем, является ли пользователь мастером
                    const master = await checkIsMaster(userData?.telegram_id || tgUser.id);
                    if (master) {
                        console.log("Master detected!", master.name);
                        setViewMode('master');
                    }
                }
            } else {
                console.warn("No user data available in initDataUnsafe!");
            }

            // Загружаем услуги и мастеров (персонализированные если есть userId)
            const user = useAppStore.getState().user;
            await loadInitialData(user?.id);
            setLoading(false);
        };

        init();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <ToastProvider>
            <div className="min-h-screen antialiased font-sans bg-background">
                {viewMode === 'admin' ? (
                    <AdminDashboard />
                ) : viewMode === 'master' && masterInfo ? (
                    <MasterDashboard masterId={masterInfo.id} masterName={masterInfo.name} />
                ) : (
                    <div className="relative pb-24">
                        {/* Birthday Button - shows if user hasn't set birthday */}
                        {user && !userBirthday && clientTab === 'booking' && !showBirthdayForm && (
                            <div className="p-4 container max-w-md mx-auto">
                                <button
                                    onClick={() => setShowBirthdayForm(true)}
                                    className="w-full p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-primary"
                                >
                                    <span className="text-xl">🎂</span>
                                    <span className="font-medium">Укажите дату рождения и получите подарок!</span>
                                </button>
                            </div>
                        )}

                        {/* Birthday Form - shows when button clicked */}
                        {user && !userBirthday && clientTab === 'booking' && showBirthdayForm && (
                            <div className="p-4 container max-w-md mx-auto mb-4">
                                <BirthdayForm
                                    userId={user.id}
                                    onBirthdaySet={(birthday) => {
                                        setUserBirthday(birthday);
                                        setShowBirthdayForm(false);
                                    }}
                                />
                            </div>
                        )}

                        {clientTab === 'booking' ? <BookingWizard /> : <div className="p-4 container max-w-md mx-auto"><MyBookings /></div>}

                        {/* Bottom Navigation for Clients */}
                        <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40 px-6">
                            <button
                                onClick={() => setClientTab('booking')}
                                className={`flex flex-col items-center gap-1 transition-colors ${clientTab === 'booking' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                <Calendar className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase">Запись</span>
                            </button>

                            <button
                                onClick={() => setClientTab('my-bookings')}
                                className={`flex flex-col items-center gap-1 transition-colors ${clientTab === 'my-bookings' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                <User className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase">Мои записи</span>
                            </button>

                            {isAdmin && (
                                <button
                                    onClick={() => setViewMode('admin')}
                                    className="flex flex-col items-center gap-1 text-red-500"
                                >
                                    <Settings className="h-5 w-5" />
                                    <span className="text-[10px] font-bold uppercase">Админ</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ToastProvider>
    )
}

export default App