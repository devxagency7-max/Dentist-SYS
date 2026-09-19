/* ==========================================================================
   i18n — simple translation engine
   Usage: <span data-i18n="dashboard.title"></span>
          <input data-i18n-placeholder="search.placeholder">
   ========================================================================== */

const I18N = (() => {
  const STORAGE_KEY = 'clinic.lang';
  const DEFAULT_LANG = 'en';
  let currentLang = DEFAULT_LANG;
  let dict = {};

  function resolveKey(key, table) {
    return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), table);
  }

  function t(key, fallback) {
    const value = resolveKey(key, dict[currentLang]) ?? resolveKey(key, dict[DEFAULT_LANG]);
    return value !== undefined ? value : (fallback || key);
  }

  function applyToDOM(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', t(key));
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      el.setAttribute('aria-label', t(key));
    });
  }

  function setLang(lang) {
    if (!dict[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    applyToDOM();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
  }

  function init(translations) {
    dict = translations;
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved && dict[saved] ? saved : DEFAULT_LANG;
    setLang(initial);
  }

  function getLang() {
    return currentLang;
  }

  return { init, t, setLang, getLang, applyToDOM };
})();
