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
 * Dispatches 'languageChanged' event so other modules can re-render.
 */
async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn(`Unsupported language: ${lang}`);
    return;
  }

  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  translations = await loadTranslations(lang);

  // Update HTML lang attribute
  document.documentElement.lang = lang;

  // Apply static translations (data-i18n attributes)
  applyTranslations();

  // Dispatch event so dynamic components can re-render
  window.dispatchEvent(
    new CustomEvent("languageChanged", { detail: { lang } }),
  );
}

/**
 * Get translation for a key (supports dot notation).
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
 * Also handles data-i18n-placeholder and data-i18n-title.
 */
function applyTranslations() {
  // Text content
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    // Use fallback from data-i18n-fallback attr, or existing text, or key
    const fallback =
      el.getAttribute("data-i18n-fallback") || el.textContent.trim() || key;
    const translated = t(key, fallback);
    if (translated) {
      el.textContent = translated;
    }
  });

  // Placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const fallback = el.getAttribute("placeholder") || "";
    el.setAttribute("placeholder", t(key, fallback));
  });

  // Title (tooltip)
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const fallback = el.getAttribute("title") || "";
    el.setAttribute("title", t(key, fallback));
  });

  // HTML content (for elements with markup)
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    const fallback = el.innerHTML;
    el.innerHTML = t(key, fallback);
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
