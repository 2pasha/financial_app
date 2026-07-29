import { useSyncExternalStore } from "react";
import { type Language, getTranslation } from "../lib/translations";

/**
 * Shared language + theme settings, backed by localStorage and applied globally
 * (the `dark` class on <html>).
 *
 * This is a module-level store rather than per-component `useState`, and that is
 * load-bearing rather than a style choice. Every caller of this hook has to observe
 * the *same* language: with local state, a component that called the hook for itself
 * (TransactionDrawer and CreateTransactionDialog both do) initialised from
 * localStorage once and then never heard about a toggle in the header, so it kept
 * rendering the previous language until it happened to remount. Any component may
 * call this hook directly and stay in sync.
 */

type Settings = { language: Language; isDarkMode: boolean };

const listeners = new Set<() => void>();

function readLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  return localStorage.getItem('language') === 'uk' ? 'uk' : 'en';
}

function readDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('theme');

  return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/*
 * The snapshot is cached and only replaced when something actually changes.
 * `useSyncExternalStore` compares snapshots by identity and would loop forever if
 * this built a fresh object on every read.
 */
let snapshot: Settings = { language: readLanguage(), isDarkMode: readDarkMode() };

/** The `dark` class is applied here rather than in an effect, so it stays correct
 *  even when no component has mounted yet, and is applied once instead of once per
 *  consumer. */
function applyTheme(isDarkMode: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDarkMode);
}

applyTheme(snapshot.isDarkMode);

function emit(next: Settings) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function toggleLanguage() {
  const next = snapshot.language === 'en' ? 'uk' : 'en';

  localStorage.setItem('language', next);
  emit({ ...snapshot, language: next });
}

function toggleTheme() {
  const next = !snapshot.isDarkMode;

  localStorage.setItem('theme', next ? 'dark' : 'light');
  applyTheme(next);
  emit({ ...snapshot, isDarkMode: next });
}

export function useAppSettings() {
  const { language, isDarkMode } = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );

  return { language, toggleLanguage, isDarkMode, toggleTheme, t: getTranslation(language) };
}
