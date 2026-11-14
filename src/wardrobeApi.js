
import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/wardrobe`;

const TOKEN_KEY = "fitroute-token";

// Get authentication headers for every API request
function getAuthHeaders(includeJson = false) {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`
  };
}

// Handle API responses safely
async function handleResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response received from FitRoute server.");
  }

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      throw new Error("Your session is invalid or expired. Please sign in again.");
    }

    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// GET all wardrobe items
export async function getWardrobe() {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: getAuthHeaders()
  });

  const data = await handleResponse(response);

  return data.items;
}

// ADD a clothing item
export async function addWardrobeItem(item) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(item)
  });

  const data = await handleResponse(response);

  return data.item;
}

// UPDATE a clothing item
export async function updateWardrobeItem(id, item) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(true),
    body: JSON.stringify(item)
  });

  const data = await handleResponse(response);

  return data.item;
}

// DELETE a clothing item
export async function deleteWardrobeItem(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  return handleResponse(response);
}
