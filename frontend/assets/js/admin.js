/**
 * Admin Panel Logic
 *
 * Handles:
 * - Login/logout
 * - Dashboard rendering
 * - Municipality CRUD (mock)
 * - Cache management
 * - Test connection integration
 * - Language switching
 */

import { initI18n, setLanguage, t, getStoredLanguage } from "./i18n.js";
import { showToast, initTestConnectionButtons } from "./test_connection.js";
import { healthCheck } from "./api.js";

// ============================================
// Configuration
// ============================================
const USE_MOCK_DATA = true; // Set to false when backend is deployed
const MOCK_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};
const MOCK_TOKEN = "mock_admin_token_" + Date.now();

// ============================================
// DOM Elements
// ============================================
const elements = {
  // Screens
  loginScreen: document.getElementById("login-screen"),
  loadingScreen: document.getElementById("admin-loading"),
  dashboardScreen: document.getElementById("dashboard-screen"),

  // Login
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginBtn: document.getElementById("login-btn"),

  // Logout
  logoutBtn: document.getElementById("logout-btn"),

  // Stats
  statMunicipalities: document.getElementById("stat-municipalities"),
  statConfigurations: document.getElementById("stat-configurations"),
  statCache: document.getElementById("stat-cache"),
  statHitRate: document.getElementById("stat-hit-rate"),

  // Municipality Table
  municipalitiesTable: document.getElementById("municipalities-table"),
  addMunicipalityBtn: document.getElementById("add-municipality-btn"),
  clearCacheBtn: document.getElementById("clear-cache-btn"),

  // Modal
  modal: document.getElementById("municipality-modal"),
  modalTitle: document.getElementById("modal-title"),
  modalForm: document.getElementById("municipality-form"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn"),

  // Footer
  apiStatus: document.getElementById("api-status"),
  apiStatusText: document.getElementById("api-status-text"),

  // Language
  langDe: document.getElementById("lang-de"),
  langEn: document.getElementById("lang-en"),
};

// ============================================
// State
// ============================================
let mockMunicipalities = [];

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
    // Real API call
    return fetch(`${API_BASE_URL}/api/v1/admin/municipalities`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
      },
    }).then((r) => r.json());
  }

  // Mock data
  await new Promise((resolve) => setTimeout(resolve, 500));
  const response = await fetch("./assets/data/mock_municipalities.json");
  return await response.json();
}

// ============================================
// Rendering
// ============================================
function renderStats(stats) {
  elements.statMunicipalities.textContent = stats.total_municipalities || 0;
  elements.statConfigurations.textContent = stats.total_configurations || 0;
  elements.statCache.textContent = stats.cache_entries || 0;
  elements.statHitRate.textContent = `${Math.round((stats.cache_hit_rate || 0) * 100)}%`;
}

function renderMunicipalitiesTable(municipalities) {
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
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-6 py-4 text-sm text-slate-900 font-medium">${m.city}</td>
      <td class="px-6 py-4 text-sm text-slate-700">${m.postcode_coverage[0]}</td>
      <td class="px-6 py-4 text-sm text-slate-700">${m.name}</td>
      <td class="px-6 py-4 text-sm">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
          ${m.configurations_count} configs
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <a href="${m.test_url}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:underline">
          Visit
        </a>
      </td>
      <td class="px-6 py-4 text-sm">
        <div class="flex items-center gap-2">
          <button
            class="test-connection-btn bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-slate-200 transition-all duration-300"
            data-url="${m.test_url}"
          >
            ⚡ Test Connection
          </button>
          <button
            class="edit-municipality-btn text-slate-400 hover:text-emerald-600 transition-colors"
            data-id="${m.id}"
            title="Edit"
          >
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

  // Attach test connection handlers
  initTestConnectionButtons();

  // Attach edit handlers
  document.querySelectorAll(".edit-municipality-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const municipality = municipalities.find((m) => m.id === parseInt(id));
      if (municipality) {
        openMunicipalityModal(municipality);
      }
    });
  });
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

  // Loading state
  elements.loginBtn.disabled = true;
  elements.loginBtn.textContent = t("admin.login_loading", "Logging in...");

  try {
    if (USE_MOCK_DATA) {
      // Mock authentication
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (
        username !== MOCK_CREDENTIALS.username ||
        password !== MOCK_CREDENTIALS.password
      ) {
        throw new Error("Invalid credentials");
      }

      setAuthenticated(MOCK_TOKEN);
      showToast("Login successful", "success");
      await loadDashboard();
    } else {
      // Real API call
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email: username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      setAuthenticated(data.access_token);
      showToast("Login successful", "success");
      await loadDashboard();
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast("Invalid credentials. Try: admin / admin123", "error");
    elements.loginBtn.disabled = false;
    elements.loginBtn.textContent = t("admin.login_button", "Login");
  }
}

function handleLogout() {
  clearAuthentication();
  showScreen("loginScreen");
  elements.loginForm.reset();
  showToast("Logged out", "info");
}

// ============================================
// Municipality Modal
// ============================================
function openMunicipalityModal(municipality = null) {
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
  } else {
    elements.modalTitle.textContent = t(
      "admin.form.add_municipality",
      "Add Municipality",
    );
    elements.modalForm.reset();
  }

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
    .map((s) => s.trim());
  const type = document.getElementById("modal-type").value;
  const url = document.getElementById("modal-url").value.trim();

  if (!name || !city || postcodes.length === 0 || !url) {
    showToast(
      t("errors.validation_error", "Please check your inputs"),
      "error",
    );
    return;
  }

  // Mock save
  showToast("Municipality saved successfully", "success");
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

    // Reload dashboard
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

  // Close modal on backdrop click
  elements.modal.addEventListener("click", (e) => {
    if (e.target === elements.modal) {
      closeMunicipalityModal();
    }
  });

  // Initial screen
  if (isAuthenticated()) {
    await loadDashboard();
  } else {
    showScreen("loginScreen");
  }

  // API health check
  checkApiHealth();
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
