
import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/outfits`;

function getAuthHeaders() {
  const token = localStorage.getItem("fitroute-token");

  if (!token) {
    throw new Error("Please log in to use FitRoute outfits.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

// SAVE AN OUTFIT
export async function saveOutfitToDatabase(outfit) {
  const pieces = outfit.pieces.map((piece) => ({
    wardrobe_item_id: Number(piece.id),
    product_name: piece.name || "Wardrobe item",
    category: piece.category,
    color: piece.color || "",
    image_url: piece.image || null,
    store_name: null
  }));

  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      occasion: outfit.occasion,
      style: outfit.style,
      outfit_name: `${outfit.occasion} ${outfit.style} Look`,
      description: Array.isArray(outfit.reasons)
        ? outfit.reasons.join(" ")
        : "",
      items: pieces
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to save outfit.");
  }

  // Return the complete response, including outfitId
  return data;
}

// ADD AN OUTFIT TO FAVORITES
export async function addOutfitToFavorites(outfitId) {
  const response = await fetch(
    `${API_URL}/${outfitId}/favorite`,
    {
      method: "POST",
      headers: getAuthHeaders()
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to add favorite.");
  }

  return data;
}

// GET SINGLE OUTFIT DETAILS
export async function getOutfitDetails(outfitId) {
  const response = await fetch(`${API_URL}/${outfitId}`, {
    headers: getAuthHeaders()
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load outfit details.");
  }

  return data.outfit;
}

// GET SAVED OUTFITS
export async function getSavedOutfits() {
  const response = await fetch(API_URL, {
    headers: getAuthHeaders()
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load saved outfits.");
  }

  return data.outfits;
}

// GET FAVORITES
export async function getFavoriteOutfits() {
  const response = await fetch(`${API_URL}/favorites`, {
    headers: getAuthHeaders()
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load favorites.");
  }

  return data.favorites;
}

// DELETE AN OUTFIT
export async function deleteSavedOutfit(outfitId) {
  const response = await fetch(`${API_URL}/${outfitId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to delete outfit.");
  }

  return data;
}

// REMOVE AN OUTFIT FROM FAVORITES
export async function removeOutfitFromFavorites(outfitId) {
  const response = await fetch(
    `${API_URL}/${outfitId}/favorite`,
    {
      method: "DELETE",
      headers: getAuthHeaders()
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to remove favorite.");
  }

  return data;
}
