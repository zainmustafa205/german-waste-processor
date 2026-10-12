/**
 * Test Connection Module
 *
 * Handles the "Test Connection" button state management.
 *
 * 4 States:
 * 1. Initial — ⚡ Test Connection
 * 2. Loading — 🔄 Testing...
 * 3. Success — 🟢 Online
 * 4. Failure — 🔴 Offline
 *
 * Anti-flicker: Button size fixed (140px × 32px)
 */

import { t } from "./i18n.js";

const USE_MOCK_DATA = true; // Set to false when backend is deployed

/**
 * Test a website connection.
 *
 * @param {string} url - URL to test
 * @returns {Promise<object>} - Test result
 */
async function testConnection(url) {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1000),
    );

    // 90% success rate for demo
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        status: "up",
        message: "Website is online and accessible.",
        method: Math.random() > 0.5 ? "HTTP" : "Browser",
      };
    } else {
      return {
        status: "down",
        message: "Connection timed out or failed",
        method: "Browser",
      };
    }
  }

  // Real API call (Phase 2+)
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/test-connection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify({ url }),
  });

  return await response.json();
}

/**
 * Get admin token from session storage.
 *
 * @returns {string}
 */
function getAdminToken() {
  return sessionStorage.getItem("admin_token") || "";
}

/**
 * Update button to loading state.
 */
function setButtonLoading(button) {
  button.disabled = true;
  button.className =
    "test-connection-btn bg-slate-100 text-slate-500 px-3 py-1 rounded-md text-sm font-medium cursor-wait";
  button.innerHTML =
    '<span class="inline-block animate-spin">🔄</span> <span>Testing...</span>';
}

/**
 * Update button to success state.
 */
function setButtonSuccess(button, message) {
  button.disabled = false;
  button.className =
    "test-connection-btn bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-md text-sm font-medium";
  button.innerHTML = "🟢 Online";
  button.title = message;
}

/**
 * Update button to failure state.
 */
function setButtonFailure(button, message) {
  button.disabled = false;
  button.className =
    "test-connection-btn bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-md text-sm font-medium";
  button.innerHTML = "🔴 Offline";
  button.title = message;
}

/**
 * Reset button to initial state.
 */
function resetButton(button, url) {
  button.disabled = false;
  button.className =
    "test-connection-btn bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-slate-200 transition-all duration-300";
  button.innerHTML = "⚡ Test Connection";
  button.title = "";
  button.dataset.url = url;
}

/**
 * Show toast notification.
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colors = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-slate-800 text-white",
    warning: "bg-amber-600 text-white",
  };

  const toast = document.createElement("div");
  toast.className = `px-4 py-3 rounded-md shadow-lg ${colors[type]} transition-all duration-300 flex items-center gap-2 min-w-[250px]`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Initialize test connection buttons.
 *
 * Attaches click handlers to all `.test-connection-btn` elements.
 */
function initTestConnectionButtons() {
  const buttons = document.querySelectorAll(".test-connection-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const url = button.dataset.url;
      if (!url) {
        console.warn("Test connection button has no URL");
        return;
      }

      // Set loading
      setButtonLoading(button);

      try {
        const result = await testConnection(url);

        if (result.status === "up") {
          setButtonSuccess(button, result.message);
          showToast(
            t("test_connection.success", "Connection Successful"),
            "success",
          );
        } else {
          setButtonFailure(button, result.message);
          showToast(t("test_connection.failure", "Connection Failed"), "error");
        }

        // Auto-reset after 10 seconds
        setTimeout(() => {
          resetButton(button, url);
        }, 10000);
      } catch (error) {
        console.error("Test connection error:", error);
        setButtonFailure(button, "Network error");
        showToast(t("test_connection.network_error", "Network error"), "error");

        // Auto-reset after 5 seconds
        setTimeout(() => {
          resetButton(button, url);
        }, 5000);
      }
    });
  });
}

export {
  initTestConnectionButtons,
  testConnection,
  showToast,
  setButtonLoading,
  setButtonSuccess,
  setButtonFailure,
  resetButton,
};
