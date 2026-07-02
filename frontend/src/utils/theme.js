const THEME_STORAGE_KEY = 'job-tracker-theme';

const resolveThemeMode = (settings) => {
  if (!settings) return 'light';

  if (settings.theme === 'auto') {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  if (settings.theme === 'dark' || settings.dark_mode) {
    return 'dark';
  }

  return 'light';
};

export const applyThemeSettings = (settings) => {
  if (typeof document === 'undefined') return;

  const themeMode = resolveThemeMode(settings);
  document.documentElement.classList.toggle('dark', themeMode === 'dark');

  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      theme: settings?.theme || 'light',
      dark_mode: !!settings?.dark_mode,
    }));
  } catch {
    // Ignore storage failures and continue applying the theme.
  }
};

export const restoreThemeFromStorage = () => {
  if (typeof document === 'undefined') return;

  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (!savedTheme) return;

    const parsedTheme = JSON.parse(savedTheme);
    applyThemeSettings(parsedTheme);
  } catch {
    // Ignore invalid persisted values.
  }
};