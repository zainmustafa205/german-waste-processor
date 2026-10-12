/**
 * Admin Panel Logic
 *
 * Handles:
 * - Login/logout
 * - Dashboard rendering (table + mobile cards)
 * - Municipality CRUD (mock)
 * - Multi-method extraction + priority ordering
 * - Cache management
 * - Test connection integration
 * - Language switching
 */

import {
  initI18n,
  setLanguage,
  t,
  getStoredLanguage,
  applyTranslations,
} from "./i18n.js";
import {
  showToast,
  initTestConnectionButtons,
  testConnection,
} from "./test_connection.js";
import { healthCheck } from "./api.js";

// ============================================
// Configuration
// ============================================
const USE_MOCK_DATA = true;
const MOCK_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};
const MOCK_TOKEN = "mock_admin_token_" + Date.now();

const EXTRACTION_METHODS = [
  { id: "ics", label: "ICS", description: "iCalendar file (.ics)" },
  { id: "json", label: "JSON API", description: "REST/JSON endpoint" },
  { id: "html", label: "HTML", description: "HTML table scraping" },
  { id: "pdf", label: "PDF", description: "PDF document parsing" },
];

// ============================================
// DOM Elements
// ============================================
const elements = {
  loginScreen: document.getElementById("login-screen"),
  loadingScreen: document.getElementById("admin-loading"),
  dashboardScreen: document.getElementById("dashboard-screen"),

  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginBtn: document.getElementById("login-btn"),

  logoutBtn: document.getElementById("logout-btn"),

  statMunicipalities: document.getElementById("stat-municipalities"),
  statConfigurations: document.getElementById("stat-configurations"),
  statCache: document.getElementById("stat-cache"),
  statHitRate: document.getElementById("stat-hit-rate"),

  municipalitiesTable: document.getElementById("municipalities-table"),
  municipalitiesCards: document.getElementById("municipalities-cards"),
  addMunicipalityBtn: document.getElementById("add-municipality-btn"),
  clearCacheBtn: document.getElementById("clear-cache-btn"),

  modal: document.getElementById("municipality-modal"),
  modalTitle: document.getElementById("modal-title"),
  modalForm: document.getElementById("municipality-form"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn"),
  extractionMethodsList: document.getElementById("extraction-methods-list"),
  priorityPreviewText: document.getElementById("priority-preview-text"),

  // Detail panel
  detailPanel: document.getElementById("municipality-detail"),
  detailBody: document.getElementById("detail-body"),
  detailCloseBtn: document.getElementById("detail-close-btn"),

  apiStatus: document.getElementById("api-status"),
  apiStatusText: document.getElementById("api-status-text"),

  langDe: document.getElementById("lang-de"),
  langEn: document.getElementById("lang-en"),
};

// ============================================
// State
// ============================================
let mockMunicipalities = [];
let extractionMethods = EXTRACTION_METHODS.map((m, index) => ({
  ...m,
  enabled: index === 0,
  priority: index + 1,
}));

// ============================================
// Screen Management
// ============================================
function hideAllScreens() {
  elements.loginScreen.classList.add("hidden");
  elements.loadingScreen.classList.add("hidden");
  elements.dashboardScreen.classList.add("hidden");
}

function showScreen(screenName) {
  hideAllScreens();
  if (elements[screenName]) {
    elements[screenName].classList.remove("hidden");
  }
}

function isAuthenticated() {
  return !!sessionStorage.getItem("admin_token");
}

function setAuthenticated(token) {
  sessionStorage.setItem("admin_token", token);
  elements.logoutBtn.classList.remove("hidden");
}

function clearAuthentication() {
  sessionStorage.removeItem("admin_token");
  elements.logoutBtn.classList.add("hidden");
}

// ============================================
// Data Loading
// ============================================
async function loadMockMunicipalities() {
  if (!USE_MOCK_DATA) {
    return fetch(`${API_BASE_URL}/api/v1/admin/municipalities`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
      },
    }).then((r) => r.json());
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  const response = await fetch("./assets/data/mock_municipalities.json");
  return await response.json();
}

// ============================================
// Extraction Methods Rendering
// ============================================
function renderExtractionMethods() {
  if (!elements.extractionMethodsList) return;

  elements.extractionMethodsList.innerHTML = extractionMethods
    .map((method) => {
      const isEnabled = method.enabled;
      const enabledList = extractionMethods
        .filter((m) => m.enabled)
        .sort((a, b) => a.priority - b.priority);
      const currentIndex = enabledList.findIndex((m) => m.id === method.id);

      return `
      <div class="flex items-center gap-2 p-2 rounded-md border ${isEnabled ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"} transition-all">
        <input type="checkbox" id="method-${method.id}" data-method-id="${method.id}"
          class="method-checkbox w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" ${isEnabled ? "checked" : ""}>
        <label for="method-${method.id}" class="flex-1 cursor-pointer">
          <div class="text-sm font-medium text-slate-900">${method.label}</div>
          <div class="text-xs text-slate-500">${method.description}</div>
        </label>
        ${
          isEnabled
            ? `
          <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">#${currentIndex + 1}</span>
          <div class="flex flex-col gap-0.5">
            <button type="button" class="method-move-up text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-30" data-method-id="${method.id}" ${currentIndex === 0 ? "disabled" : ""}>
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
            </button>
            <button type="button" class="method-move-down text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-30" data-method-id="${method.id}" ${currentIndex === enabledList.length - 1 ? "disabled" : ""}>
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>
          </div>
        `
            : ""
        }
      </div>
      `;
    })
    .join("");

  updatePriorityPreview();

  document.querySelectorAll(".method-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) =>
      toggleMethod(e.target.dataset.methodId, e.target.checked),
    );
  });

  document.querySelectorAll(".method-move-up").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      moveMethod(btn.dataset.methodId, -1);
    });
  });

  document.querySelectorAll(".method-move-down").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      moveMethod(btn.dataset.methodId, 1);
    });
  });
}

function toggleMethod(methodId, enabled) {
  const method = extractionMethods.find((m) => m.id === methodId);
  if (!method) return;
  method.enabled = enabled;
  if (enabled) {
    const enabledMethods = extractionMethods.filter(
      (m) => m.enabled && m.id !== methodId,
    );
    const maxPriority =
      enabledMethods.length > 0
        ? Math.max(...enabledMethods.map((m) => m.priority))
        : 0;
    method.priority = maxPriority + 1;
  }
  renderExtractionMethods();
}

function moveMethod(methodId, direction) {
  const enabledMethods = extractionMethods
    .filter((m) => m.enabled)
    .sort((a, b) => a.priority - b.priority);
  const currentIndex = enabledMethods.findIndex((m) => m.id === methodId);
  if (currentIndex === -1) return;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= enabledMethods.length) return;
  const current = enabledMethods[currentIndex];
  const target = enabledMethods[targetIndex];
  const tempPriority = current.priority;
  current.priority = target.priority;
  target.priority = tempPriority;
  renderExtractionMethods();
}

function updatePriorityPreview() {
  if (!elements.priorityPreviewText) return;
  const enabledMethods = extractionMethods
    .filter((m) => m.enabled)
    .sort((a, b) => a.priority - b.priority);
  if (enabledMethods.length === 0) {
    elements.priorityPreviewText.textContent = t(
      "admin.form.no_methods",
      "No methods selected",
    );
    elements.priorityPreviewText.className = "font-medium text-red-600";
    return;
  }
  elements.priorityPreviewText.textContent = enabledMethods
    .map((m) => m.label)
    .join(" → ");
  elements.priorityPreviewText.className = "font-medium text-slate-900";
}

// ============================================
// Stats Rendering
// ============================================
function renderStats(stats) {
  elements.statMunicipalities.textContent = stats.total_municipalities || 0;
  elements.statConfigurations.textContent = stats.total_configurations || 0;
  elements.statCache.textContent = stats.cache_entries || 0;
  elements.statHitRate.textContent = `${Math.round((stats.cache_hit_rate || 0) * 100)}%`;
}

// ============================================
// DESKTOP: Table Rendering
// ============================================
function renderMunicipalitiesTable(municipalities) {
  if (!elements.municipalitiesTable) return;

  if (!municipalities || municipalities.length === 0) {
    elements.municipalitiesTable.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-sm text-slate-500">
          No municipalities found
        </td>
      </tr>
    `;
    return;
  }

  elements.municipalitiesTable.innerHTML = municipalities
    .map(
      (m) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" data-municipality-id="${m.id}">
      <td class="px-6 py-4 text-sm text-slate-900 font-medium">${m.city}</td>
      <td class="px-6 py-4 text-sm text-slate-700">${m.postcode_coverage[0]}</td>
      <td class="px-6 py-4 text-sm text-slate-700">${m.name}</td>
      <td class="px-6 py-4 text-sm">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
          ${m.configurations_count} configs
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <a href="${m.test_url}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:underline" onclick="event.stopPropagation()">
          Visit
        </a>
      </td>
      <td class="px-6 py-4 text-sm">
        <div class="flex items-center gap-2">
          <button class="test-connection-btn bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-slate-200 transition-all duration-300" data-url="${m.test_url}" onclick="event.stopPropagation()">
            ⚡ ${t("test_connection.button", "Test Connection")}
          </button>
          <button class="edit-municipality-btn text-slate-400 hover:text-emerald-600 transition-colors" data-id="${m.id}" title="Edit" onclick="event.stopPropagation()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");

  initTestConnectionButtons();
  attachTableEventListeners(municipalities);
}

// ============================================
// MOBILE: Card List Rendering
// ============================================
function renderMunicipalitiesCards(municipalities) {
  if (!elements.municipalitiesCards) return;

  if (!municipalities || municipalities.length === 0) {
    elements.municipalitiesCards.innerHTML = `
      <div class="px-4 py-8 text-center text-sm text-slate-500">
        ${t("admin.no_municipalities", "No municipalities found")}
      </div>
    `;
    return;
  }

  elements.municipalitiesCards.innerHTML = municipalities
    .map(
      (m) => `
    <div class="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer municipality-card" data-municipality-id="${m.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-bold text-slate-900 truncate">${m.city}</h3>
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 flex-shrink-0">
              ${m.configurations_count} ${t("admin.configs_short", "configs")}
            </span>
          </div>
          <p class="text-xs text-slate-600 truncate">${m.name}</p>
          <p class="text-xs text-slate-500 mt-1">${m.postcode_coverage.slice(0, 3).join(", ")}${m.postcode_coverage.length > 3 ? "..." : ""}</p>
        </div>
        <svg class="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  `,
    )
    .join("");

  document.querySelectorAll(".municipality-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.dataset.municipalityId);
      const municipality = municipalities.find((m) => m.id === id);
      if (municipality) openMunicipalityDetail(municipality);
    });
  });
}

// ============================================
// Table Event Listeners (Desktop)
// ============================================
function attachTableEventListeners(municipalities) {
  document
    .querySelectorAll("#municipalities-table tr[data-municipality-id]")
    .forEach((row) => {
      row.addEventListener("click", () => {
        const id = parseInt(row.dataset.municipalityId);
        const municipality = municipalities.find((m) => m.id === id);
        if (municipality) openMunicipalityDetail(municipality);
      });
    });

  document.querySelectorAll(".edit-municipality-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const municipality = municipalities.find((m) => m.id === parseInt(id));
      if (municipality) openMunicipalityModal(municipality);
    });
  });
}

// ============================================
// Municipality Detail Panel
// ============================================
function openMunicipalityDetail(municipality) {
  if (!elements.detailPanel || !elements.detailBody) return;

  const postcodesList = municipality.postcode_coverage
    .map(
      (pc) =>
        `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 mr-1 mb-1">${pc}</span>`,
    )
    .join("");

  elements.detailBody.innerHTML = `
    <div>
      <h3 class="text-lg font-bold text-slate-900">${municipality.name}</h3>
      <p class="text-sm text-slate-600">${municipality.city}</p>
    </div>

    <div class="space-y-3 pt-2 border-t border-slate-100">
      <div class="flex items-start justify-between gap-3">
        <span class="text-xs text-slate-500 uppercase font-semibold">${t("admin.table.postcode", "PLZ")}</span>
        <div class="flex flex-wrap justify-end">${postcodesList}</div>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-xs text-slate-500 uppercase font-semibold">${t("admin.table.type", "Typ")}</span>
        <span class="text-sm text-slate-700">${municipality.configurations_count} ${t("admin.configs_short", "configs")}</span>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-xs text-slate-500 uppercase font-semibold">${t("admin.table.website", "Webseite")}</span>
        <a href="${municipality.test_url}" target="_blank" rel="noopener noreferrer" class="text-sm text-emerald-600 hover:underline break-all text-right max-w-[60%]">
          ${municipality.test_url}
        </a>
      </div>
    </div>

    <div class="pt-4 border-t border-slate-100 space-y-2">
      <button
        id="detail-test-connection-btn"
        class="test-connection-btn w-full bg-slate-100 text-slate-700 px-4 py-3 rounded-md text-sm font-medium hover:bg-slate-200 transition-all duration-300 flex items-center justify-center gap-2"
        data-url="${municipality.test_url}"
      >
        ⚡ ${t("test_connection.button", "Test Connection")}
      </button>

      <button
        id="detail-edit-btn"
        class="w-full bg-emerald-600 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        ${t("admin.form.edit_municipality", "Edit Municipality")}
      </button>
    </div>
  `;

  initTestConnectionButtons();

  document.getElementById("detail-edit-btn")?.addEventListener("click", () => {
    closeMunicipalityDetail();
    openMunicipalityModal(municipality);
  });

  elements.detailPanel.classList.remove("hidden");
}

function closeMunicipalityDetail() {
  if (elements.detailPanel) {
    elements.detailPanel.classList.add("hidden");
  }
}

// ============================================
// Dashboard
// ============================================
async function loadDashboard() {
  showScreen("loadingScreen");

  try {
    const data = await loadMockMunicipalities();
    mockMunicipalities = data.municipalities || [];

    renderStats(data.stats || {});
    renderMunicipalitiesTable(mockMunicipalities);
    renderMunicipalitiesCards(mockMunicipalities);

    showScreen("dashboardScreen");
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    showToast("Failed to load dashboard", "error");
    showScreen("dashboardScreen");
  }
}

// ============================================
// Login / Logout
// ============================================
async function handleLogin(event) {
  event.preventDefault();

  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;

  if (!username || !password) {
    showToast(
      t("errors.validation_error", "Please check your inputs"),
      "error",
    );
    return;
  }

  elements.loginBtn.disabled = true;
  elements.loginBtn.textContent = t("admin.login_loading", "Logging in...");

  try {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (
        username !== MOCK_CREDENTIALS.username ||
        password !== MOCK_CREDENTIALS.password
      ) {
        throw new Error("Invalid credentials");
      }

      setAuthenticated(MOCK_TOKEN);
      showToast(t("app.success", "Login successful"), "success");
      await loadDashboard();
    } else {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email: username, password }),
      });

      if (!response.ok) throw new Error("Invalid credentials");

      const data = await response.json();
      setAuthenticated(data.access_token);
      showToast(t("app.success", "Login successful"), "success");
      await loadDashboard();
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast(
      t(
        "errors.invalid_credentials",
        "Invalid credentials. Try: admin / admin123",
      ),
      "error",
    );
    elements.loginBtn.disabled = false;
    elements.loginBtn.textContent = t("admin.login_button", "Login");
  }
}

function handleLogout() {
  clearAuthentication();
  showScreen("loginScreen");
  elements.loginForm.reset();
  showToast(t("app.info", "Logged out"), "info");
}

// ============================================
// Municipality Modal
// ============================================
function openMunicipalityModal(municipality = null) {
  extractionMethods = EXTRACTION_METHODS.map((m, index) => ({
    ...m,
    enabled: index === 0,
    priority: index + 1,
  }));

  if (municipality) {
    elements.modalTitle.textContent = t(
      "admin.form.edit_municipality",
      "Edit Municipality",
    );
    document.getElementById("modal-name").value = municipality.name;
    document.getElementById("modal-city").value = municipality.city;
    document.getElementById("modal-postcodes").value =
      municipality.postcode_coverage.join(", ");
    document.getElementById("modal-url").value = municipality.test_url;

    if (municipality.extraction_methods) {
      extractionMethods = municipality.extraction_methods.map((em, index) => {
        const base = EXTRACTION_METHODS.find((m) => m.id === em.id) || {
          id: em.id,
          label: em.label || em.id,
          description: em.description || "",
        };
        return {
          ...base,
          enabled: em.enabled !== false,
          priority: em.priority || index + 1,
        };
      });
    }
  } else {
    elements.modalTitle.textContent = t(
      "admin.form.add_municipality",
      "Add Municipality",
    );
    elements.modalForm.reset();
  }

  renderExtractionMethods();
  applyTranslations();

  elements.modal.classList.remove("hidden");
}

function closeMunicipalityModal() {
  elements.modal.classList.add("hidden");
}

function handleMunicipalitySubmit(event) {
  event.preventDefault();

  const name = document.getElementById("modal-name").value.trim();
  const city = document.getElementById("modal-city").value.trim();
  const postcodes = document
    .getElementById("modal-postcodes")
    .value.split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  const url = document.getElementById("modal-url").value.trim();

  const enabledMethods = extractionMethods
    .filter((m) => m.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (
    !name ||
    !city ||
    postcodes.length === 0 ||
    !url ||
    enabledMethods.length === 0
  ) {
    showToast(
      t("errors.validation_error", "Please check your inputs"),
      "error",
    );
    return;
  }

  const payload = {
    name,
    city,
    postcode_coverage: postcodes,
    extraction_methods: enabledMethods.map((m, index) => ({
      id: m.id,
      label: m.label,
      enabled: true,
      priority: index + 1,
    })),
    target_url: url,
  };

  console.log("Municipality payload:", payload);

  showToast(
    t("admin.form.saved", "Municipality saved successfully"),
    "success",
  );
  closeMunicipalityModal();
}

// ============================================
// Cache Management
// ============================================
async function handleClearCache() {
  const confirmed = confirm(
    t("admin.cache_clear.confirm", "Are you sure you want to clear the cache?"),
  );
  if (!confirmed) return;

  try {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      showToast(
        t("admin.cache_clear.success", "Cache cleared successfully"),
        "success",
      );
    } else {
      await fetch(`${API_BASE_URL}/api/v1/admin/cache`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
        },
      });
      showToast(
        t("admin.cache_clear.success", "Cache cleared successfully"),
        "success",
      );
    }
    await loadDashboard();
  } catch (error) {
    console.error("Cache clear error:", error);
    showToast("Failed to clear cache", "error");
  }
}

// ============================================
// Language Switch
// ============================================
function updateLanguageButtons(active) {
  if (active === "de") {
    elements.langDe.className =
      "px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-emerald-600 text-white font-medium transition-all";
    elements.langEn.className =
      "px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md text-slate-700 font-medium hover:bg-slate-200 transition-all";
  } else {
    elements.langDe.className =
      "px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md text-slate-700 font-medium hover:bg-slate-200 transition-all";
    elements.langEn.className =
      "px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-emerald-600 text-white font-medium transition-all";
  }
}

async function handleLanguageChange(lang) {
  await setLanguage(lang);
  updateLanguageButtons(lang);

  if (mockMunicipalities.length > 0) {
    renderMunicipalitiesTable(mockMunicipalities);
    renderMunicipalitiesCards(mockMunicipalities);
  }
  if (!elements.modal.classList.contains("hidden")) {
    renderExtractionMethods();
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
  await initI18n();
  const currentLang = getStoredLanguage();
  updateLanguageButtons(currentLang);

  // Event listeners
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutBtn.addEventListener("click", handleLogout);
  elements.addMunicipalityBtn.addEventListener("click", () =>
    openMunicipalityModal(),
  );
  elements.clearCacheBtn.addEventListener("click", handleClearCache);
  elements.modalCloseBtn.addEventListener("click", closeMunicipalityModal);
  elements.modalCancelBtn.addEventListener("click", closeMunicipalityModal);
  elements.modalForm.addEventListener("submit", handleMunicipalitySubmit);
  elements.langDe.addEventListener("click", () => handleLanguageChange("de"));
  elements.langEn.addEventListener("click", () => handleLanguageChange("en"));

  // Detail panel close
  if (elements.detailCloseBtn) {
    elements.detailCloseBtn.addEventListener("click", closeMunicipalityDetail);
  }

  // Close modal on backdrop click
  elements.modal.addEventListener("click", (e) => {
    if (e.target === elements.modal) closeMunicipalityModal();
  });

  // Close detail panel on backdrop click
  if (elements.detailPanel) {
    elements.detailPanel.addEventListener("click", (e) => {
      if (e.target === elements.detailPanel) closeMunicipalityDetail();
    });
  }

  // Initial screen
  if (isAuthenticated()) {
    await loadDashboard();
  } else {
    showScreen("loginScreen");
  }

  checkApiHealth();
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
