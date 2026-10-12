/**
 * API Configuration and Utilities
 *
 * Automatically switches between local development and production.
 * Supports mock data mode when backend is not available.
 */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://german-waste-processor.koyeb.app";

/**
 * Check if we're in mock mode (backend not available).
 */
const USE_MOCK_DATA = true; // Set to false when backend is deployed

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Health check.
 */
async function healthCheck() {
  return apiFetch("/health");
}

/**
 * Load mock schedule for a given address.
 *
 * @param {object} address - Address object
 * @returns {Promise<object>} - Mock schedule data
 */
async function loadMockSchedule(address) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Load mock data
  const response = await fetch("./assets/data/mock_schedules.json");
  const mockData = await response.json();

  // Build key from address
  const key = `${address.street}_${address.house_number}_${address.postcode}_${address.city}`;

  // Try exact match
  if (mockData[key]) {
    return mockData[key];
  }

  // Return first mock entry as fallback (for demo purposes)
  const firstKey = Object.keys(mockData)[0];
  if (firstKey) {
    return mockData[firstKey];
  }

  throw new Error("No mock data available");
}

/**
 * Process address - main function.
 *
 * @param {object} address - Address object
 * @returns {Promise<object>} - Processed schedule
 */
async function processAddress(address) {
  if (USE_MOCK_DATA) {
    return loadMockSchedule(address);
  }

  return apiFetch("/api/v1/process", {
    method: "POST",
    body: JSON.stringify(address),
  });
}

export { API_BASE_URL, USE_MOCK_DATA, apiFetch, healthCheck, processAddress };
