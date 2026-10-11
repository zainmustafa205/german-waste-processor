/**
 * API Configuration
 *
 * Automatically switches between local development and production.
 */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://german-waste-processor.koyeb.app";

/**
 * Generic fetch wrapper with error handling.
 *
 * @param {string} endpoint - API endpoint (e.g., '/health')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Parsed JSON response
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
 *
 * @returns {Promise<object>}
 */
async function healthCheck() {
  return apiFetch("/health");
}

// Export for use in other modules
export { API_BASE_URL, apiFetch, healthCheck };
