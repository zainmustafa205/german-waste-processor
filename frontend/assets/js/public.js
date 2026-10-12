/**
 * Public UI Logic
 *
 * Handles:
 * - Address search form
 * - Results rendering (Today, Next 7 Days, Past 7 Days)
 * - Loading/Error/Empty states
 * - Language switching
 * - Toast notifications
 */

import { initI18n, setLanguage, t, getStoredLanguage } from "./i18n.js";
import { healthCheck, processAddress } from "./api.js";

// ============================================
// DOM Elements
// ============================================
const elements = {
  form: document.getElementById("search-form"),
  street: document.getElementById("street"),
  houseNumber: document.getElementById("house_number"),
  postcode: document.getElementById("postcode"),
  city: document.getElementById("city"),
  searchButton: document.getElementById("search-button"),
  exampleAddress: document.getElementById("example-address"),

  // States
  welcomeState: document.getElementById("welcome-state"),
  loadingState: document.getElementById("loading-state"),
  resultsSection: document.getElementById("results-section"),
  emptyState: document.getElementById("empty-state"),
  errorState: document.getElementById("error-state"),

  // Results
  todaySection: document.getElementById("today-section"),
  nextWeekGrid: document.getElementById("next-week-grid"),
  pastWeekTable: document.getElementById("past-week-table"),
  sourceUrl: document.getElementById("source-url"),

  // Footer
  apiStatus: document.getElementById("api-status"),
  apiStatusText: document.getElementById("api-status-text"),

  // Language
  langDe: document.getElementById("lang-de"),
  langEn: document.getElementById("lang-en"),

  // Toast
  toastContainer: document.getElementById("toast-container"),
};

// ============================================
// State Management
// ============================================
function hideAllStates() {
  elements.welcomeState.classList.add("hidden");
  elements.loadingState.classList.add("hidden");
  elements.resultsSection.classList.add("hidden");
  elements.emptyState.classList.add("hidden");
  elements.errorState.classList.add("hidden");
}

function showState(stateName) {
  hideAllStates();
  if (elements[stateName]) {
    elements[stateName].classList.remove("hidden");
  }
}

// ============================================
// Date Utilities
// ============================================
function formatGermanDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function getDayName(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
}

function getDayShort(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()];
}

// ============================================
// Waste Type Utilities
// ============================================
function getWasteTypeBadgeClass(wasteType) {
  const classes = {
    Organic: "badge-organic",
    Paper: "badge-paper",
    Plastic: "badge-plastic",
    Residual: "badge-residual",
    Bulky: "bg-slate-600 text-white px-2 py-1 rounded text-xs font-medium",
    "Green Waste":
      "bg-green-700 text-white px-2 py-1 rounded text-xs font-medium",
  };
  return (
    classes[wasteType] ||
    "bg-slate-400 text-white px-2 py-1 rounded text-xs font-medium"
  );
}

function getWasteTypeLabel(wasteType) {
  const key = {
    Organic: "organic",
    Paper: "paper",
    Plastic: "plastic",
    Residual: "residual",
    Bulky: "bulky",
    "Green Waste": "green_waste",
  }[wasteType];
  return key ? t(`waste_types.${key}`, wasteType) : wasteType;
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = "info") {
  const colors = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-slate-800 text-white",
    warning: "bg-amber-600 text-white",
  };

  const toast = document.createElement("div");
  toast.className = `px-4 py-3 rounded-md shadow-lg ${colors[type]} transition-all duration-300 flex items-center gap-2 min-w-[250px]`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// Render Functions
// ============================================
function renderTodaySection(collections) {
  const todayCollection = collections.find((c) => c.next_collection.is_today);

  if (todayCollection) {
    elements.todaySection.innerHTML = `
      <div class="bg-emerald-50 border-2 border-emerald-500 rounded-lg p-6 animate-pulse-slow">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <div class="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-block w-3 h-3 bg-emerald-600 rounded-full animate-pulse"></span>
              <h3 class="text-lg font-bold text-emerald-900" data-i18n="results.today_collection">
                Heute wird abgeholt!
              </h3>
            </div>
            <div class="flex items-center gap-3">
              <span class="${getWasteTypeBadgeClass(todayCollection.waste_type)} text-base px-3 py-1.5">
                ${getWasteTypeLabel(todayCollection.waste_type)}
              </span>
              ${
                todayCollection.next_collection.time
                  ? `
                <span class="text-sm text-emerald-800">
                  <strong>${t("results.collection_at", "Abholung um")}:</strong> ${todayCollection.next_collection.time}
                </span>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    elements.todaySection.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-lg p-6">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900" data-i18n="results.today_no_collection">
              Keine Abholung heute
            </h3>
            <p class="text-sm text-slate-600" data-i18n="results.today_no_collection_subtitle">
              Alles erledigt! Die nächste Abholung ist bald.
            </p>
          </div>
        </div>
      </div>
    `;
  }
}

function renderNextWeekGrid(collections) {
  // Filter upcoming collections (next 7 days)
  const upcoming = collections
    .filter(
      (c) =>
        !c.next_collection.is_today &&
        c.next_collection.days_until !== null &&
        c.next_collection.days_until <= 7,
    )
    .sort(
      (a, b) => a.next_collection.days_until - b.next_collection.days_until,
    );

  if (upcoming.length === 0) {
    elements.nextWeekGrid.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-500 text-sm">
        ${t("results.no_results", "Keine Abholtermine gefunden")}
      </div>
    `;
    return;
  }

  // Take first 7 items
  const items = upcoming.slice(0, 7);

  elements.nextWeekGrid.innerHTML = items
    .map((item) => {
      const nc = item.next_collection;
      const dayLabel = t(`days.${getDayName(nc.date)}`, getDayName(nc.date));
      const dayShort = t(
        `days.short.${getDayName(nc.date)}`,
        getDayName(nc.date).slice(0, 3),
      );

      return `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-emerald-500 transition-colors">
        <div class="text-center mb-2">
          <div class="text-xs text-slate-500 uppercase font-semibold">${dayShort}</div>
          <div class="text-lg font-bold text-slate-900">${formatGermanDate(nc.date).slice(0, 5)}</div>
        </div>
        <div class="text-center">
          <span class="${getWasteTypeBadgeClass(item.waste_type)} block mb-1">
            ${getWasteTypeLabel(item.waste_type)}
          </span>
          ${nc.time ? `<div class="text-xs text-slate-600 mt-1">${nc.time}</div>` : ""}
        </div>
      </div>
    `;
    })
    .join("");
}

function renderPastWeekTable(collections) {
  // Filter past collections
  const past = collections
    .filter(
      (c) =>
        c.next_collection.days_until !== null &&
        c.next_collection.days_until < 0,
    )
    .sort(
      (a, b) => b.next_collection.days_until - a.next_collection.days_until,
    );

  if (past.length === 0) {
    elements.pastWeekTable.innerHTML = `
      <tr>
        <td colspan="3" class="px-4 py-4 text-center text-sm text-slate-500">
          ${t("results.no_results", "Keine Abholtermine gefunden")}
        </td>
      </tr>
    `;
    return;
  }

  elements.pastWeekTable.innerHTML = past
    .map((item) => {
      const nc = item.next_collection;
      return `
      <tr class="border-b border-slate-100">
        <td class="px-4 py-2 text-sm text-slate-700">${formatGermanDate(nc.date)}</td>
        <td class="px-4 py-2">
          <span class="${getWasteTypeBadgeClass(item.waste_type)}">
            ${getWasteTypeLabel(item.waste_type)}
          </span>
        </td>
        <td class="px-4 py-2 text-sm text-slate-700">${nc.time || "-"}</td>
      </tr>
    `;
    })
    .join("");
}

function renderResults(data) {
  // Store last results for re-rendering on language change
  window.__lastResults = data;
  // Render Today section
  renderTodaySection(data.results);

  // Render Next 7 Days
  renderNextWeekGrid(data.results);

  // Render Past 7 Days
  renderPastWeekTable(data.results);

  // Source URL
  if (data.source_url) {
    elements.sourceUrl.textContent = `Quelle: ${data.source_url}`;
  }

  // Show results
  showState("resultsSection");
}

// ============================================
// Form Handling
// ============================================
async function handleFormSubmit(event) {
  event.preventDefault();

  // Get form values
  const address = {
    street: elements.street.value.trim(),
    house_number: elements.houseNumber.value.trim(),
    postcode: elements.postcode.value.trim(),
    city: elements.city.value.trim(),
  };

  // Validate
  if (
    !address.street ||
    !address.house_number ||
    !address.postcode ||
    !address.city
  ) {
    showToast(
      t("errors.validation_error", "Bitte überprüfen Sie Ihre Eingaben."),
      "error",
    );
    return;
  }

  if (!/^\d{5}$/.test(address.postcode)) {
    showToast(
      t("errors.invalid_postcode", "Ungültige PLZ. Muss 5 Ziffern haben."),
      "error",
    );
    return;
  }

  // Disable button + show loading
  elements.searchButton.disabled = true;
  elements.searchButton.classList.add("opacity-50", "cursor-not-allowed");

  showState("loadingState");

  try {
    const data = await processAddress(address);

    if (!data || !data.results || data.results.length === 0) {
      showState("emptyState");
      return;
    }

    renderResults(data);
    showToast(t("app.success", "Erfolg"), "success");
  } catch (error) {
    console.error("Error processing address:", error);
    document.getElementById("error-message").textContent = t(
      "errors.network_error",
      "Netzwerkfehler. Bitte versuchen Sie es erneut.",
    );
    showState("errorState");
    showToast(
      t(
        "errors.network_error",
        "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      ),
      "error",
    );
  } finally {
    elements.searchButton.disabled = false;
    elements.searchButton.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

// ============================================
// Example Address
// ============================================
function fillExampleAddress() {
  elements.street.value = "Musterstrasse";
  elements.houseNumber.value = "12a";
  elements.postcode.value = "10115";
  elements.city.value = "Berlin";
  elements.street.focus();
}

// ============================================
// Language Switch
// ============================================
function updateLanguageButtons(active) {
  if (active === "de") {
    elements.langDe.className =
      "px-3 py-1 text-sm rounded-md bg-emerald-600 text-white font-medium transition-all";
    elements.langEn.className =
      "px-3 py-1 text-sm rounded-md text-slate-700 font-medium hover:bg-slate-200 transition-all";
  } else {
    elements.langDe.className =
      "px-3 py-1 text-sm rounded-md text-slate-700 font-medium hover:bg-slate-200 transition-all";
    elements.langEn.className =
      "px-3 py-1 text-sm rounded-md bg-emerald-600 text-white font-medium transition-all";
  }
}

async function handleLanguageChange(lang) {
  await setLanguage(lang);
  updateLanguageButtons(lang);
  // Re-render results if they exist
  if (!elements.resultsSection.classList.contains("hidden")) {
    // Optionally re-render if we have data
  }
}

// ============================================
// API Health Check
// ============================================
async function checkApiHealth() {
  try {
    const health = await healthCheck();
    elements.apiStatus.className = "text-emerald-600";
    elements.apiStatusText.textContent = `API connected (v${health.version})`;
  } catch (error) {
    elements.apiStatus.className = "text-red-600";
    elements.apiStatusText.textContent = "API not reachable";
  }
}

// ============================================
// Initialization
// ============================================
async function init() {
  // Initialize i18n
  await initI18n();
  const currentLang = getStoredLanguage();
  updateLanguageButtons(currentLang);

  // Setup form submit
  elements.form.addEventListener("submit", handleFormSubmit);

  // Setup example address
  elements.exampleAddress.addEventListener("click", fillExampleAddress);

  // Setup language switch
  elements.langDe.addEventListener("click", () => handleLanguageChange("de"));
  elements.langEn.addEventListener("click", () => handleLanguageChange("en"));

  // ⚡ CRITICAL: Re-render results when language changes
  window.addEventListener("languageChanged", () => {
    // If results are shown, re-render them
    if (
      !elements.resultsSection.classList.contains("hidden") &&
      window.__lastResults
    ) {
      renderResults(window.__lastResults);
    }
  });

  // Show welcome state initially
  showState("welcomeState");

  // Check API health
  checkApiHealth();
}
// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for testing
export { showToast, formatGermanDate, getWasteTypeLabel };
