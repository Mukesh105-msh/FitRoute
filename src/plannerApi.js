// src/plannerApi.js
// API helper for the Weekly Planner — persists plans to MySQL via the backend.

import { API_BASE_URL } from "./apiConfig";

function getAuthHeaders() {
  const token =
    localStorage.getItem("fitroute-token") ||
    localStorage.getItem("fitroute_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch the full 7-day plan for the authenticated user.
 * Returns { success, week } where week is an array of 7 day objects.
 */
export async function getWeeklyPlan() {
  const res = await fetch(`${API_BASE_URL}/api/planner`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error(`Failed to load weekly plan (${res.status})`);
  }
  return res.json();
}

/**
 * Update a single day's plan.
 * @param {string} day - e.g. "Monday"
 * @param {{ occasion: string, style: string, outfit_id?: number, outfit?: object }} data
 */
export async function updateDayPlan(day, data) {
  const res = await fetch(`${API_BASE_URL}/api/planner/${day}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Failed to save ${day}'s plan (${res.status})`);
  }
  return res.json();
}

/**
 * Bulk-save the full week at once (used by the Save button).
 * @param {Array} week - array of 7 day plan objects
 */
export async function saveBulkPlan(week) {
  const res = await fetch(`${API_BASE_URL}/api/planner/bulk`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ week })
  });
  if (!res.ok) {
    throw new Error(`Failed to save weekly plan (${res.status})`);
  }
  return res.json();
}

/**
 * Delete all 7 days from the user's weekly plan in the database.
 */
export async function clearWeeklyPlan() {
  const res = await fetch(`${API_BASE_URL}/api/planner`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error(`Failed to clear weekly plan (${res.status})`);
  }
  return res.json();
}

