import { useState, useEffect } from "react";
import { type Language, getTranslation } from "../lib/translations";

/**
 * Shared language + theme settings, backed by localStorage and applied globally
 * (the `dark` class on <html>). Each page calls this once and passes the values
 * into SiteHeader so the header and page body stay in sync.
 */
export function useAppSettings() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');

      return (saved as Language) || 'en';
    }

    return 'en';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');

      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'uk' : 'en';
      localStorage.setItem('language', next);

      return next;
    });
  };

  const t = getTranslation(language);

  return { language, toggleLanguage, isDarkMode, toggleTheme, t };
}
