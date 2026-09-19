/* ==========================================================================
   Theme manager — light / dark, persisted to localStorage
   ========================================================================== */

const THEME = (() => {
  const STORAGE_KEY = 'clinic.theme';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme } }));
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(saved || (prefersDark ? 'dark' : 'light'));
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  return { init, toggle, apply, getTheme };
})();
