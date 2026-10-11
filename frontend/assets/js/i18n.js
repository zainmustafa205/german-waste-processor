/**
 * Internationalization (i18n)
 *
 * Supports German (default) and English.
 * Language preference saved in localStorage.
 */

const DEFAULT_LANGUAGE = "de";
const SUPPORTED_LANGUAGES = ["de", "en"];
const STORAGE_KEY = "waste_processor_language";

let translations = {};
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Load translations from JSON file.
 *
 * @param {string} lang - Language code ('de' or 'en')
 * @returns {Promise<object>} - Translations object
 */
async function loadTranslations(lang) {
  try {
    const response = await fetch(`./assets/translations/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return {};
  }
}

/**
 * Get current language from localStorage or default.
 *
 * @returns {string} - Language code
 */
function getStoredLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Set language and reload translations.
 *
 * @param {string} lang - Language code
 */
async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn(`Unsupported language: ${lang}`);
    return;
  }

  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  translations = await loadTranslations(lang);
  applyTranslations();

  // Update HTML lang attribute
  document.documentElement.lang = lang;

  // Dispatch event for other modules
  window.dispatchEvent(
    new CustomEvent("languageChanged", { detail: { lang } }),
  );
}

/**
 * Get translation for a key.
 *
 * @param {string} key - Translation key (supports dot notation, e.g., 'search.title')
 * @param {string} fallback - Fallback text
 * @returns {string} - Translated string
 */
function t(key, fallback = "") {
  const keys = key.split(".");
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return fallback || key;
    }
  }

  return typeof value === "string" ? value : fallback || key;
}

/**
 * Apply translations to elements with data-i18n attribute.
 */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const fallback = el.textContent.trim();
    el.textContent = t(key, fallback);
  });

  // Placeholder translations
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const fallback = el.getAttribute("placeholder") || "";
    el.setAttribute("placeholder", t(key, fallback));
  });
}

/**
 * Initialize i18n.
 */
async function initI18n() {
  currentLanguage = getStoredLanguage();
  translations = await loadTranslations(currentLanguage);
  applyTranslations();
  document.documentElement.lang = currentLanguage;
}

export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  initI18n,
  setLanguage,
  t,
  applyTranslations,
  getStoredLanguage,
};
