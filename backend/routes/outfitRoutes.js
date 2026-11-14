
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// All outfit endpoints require authentication.
router.use(authMiddleware);

// ======================================
// GET ALL SAVED OUTFITS
// GET /api/outfits
// ======================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const [outfits] = await db.query(
      `SELECT
         o.id,
         o.user_id,
         o.occasion,
         o.style,
         o.budget,
         o.gender,
         o.outfit_name,
         o.description,
         o.created_at,
         (f.id IS NOT NULL) AS is_favorite
       FROM outfits o
       LEFT JOIN favorites f
         ON f.outfit_id = o.id AND f.user_id = ?
       WHERE o.user_id = ?
       ORDER BY o.id DESC`,
      [userId, userId]
    );

    for (const outfit of outfits) {
      const [items] = await db.query(
        `SELECT
           id,
           wardrobe_item_id,
           product_name,
           category,
           color,
           image_url,
           store_name
         FROM outfit_items
         WHERE outfit_id = ?
         ORDER BY id ASC`,
        [outfit.id]
      );

      outfit.items = items;
    }

    return res.json({
      success: true,
      count: outfits.length,
      outfits
    });
  } catch (error) {
    console.error("Get outfits error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve saved outfits."
    });
  }
});

// ======================================
// GET FAVORITE OUTFITS
// GET /api/outfits/favorites
// ======================================
router.get("/favorites", async (req, res) => {
  try {
    const userId = req.user.id;

    const [favorites] = await db.query(
      `SELECT
         o.id,
         o.occasion,
         o.style,
         o.budget,
         o.gender,
         o.outfit_name,
         o.description,
         f.created_at AS favorited_at
       FROM favorites f
       INNER JOIN outfits o ON o.id = f.outfit_id
       WHERE f.user_id = ? AND o.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId, userId]
    );

    for (const outfit of favorites) {
      const [items] = await db.query(
        `SELECT
           id,
           wardrobe_item_id,
           product_name,
           category,
           color,
           image_url,
           store_name
         FROM outfit_items
         WHERE outfit_id = ?
         ORDER BY id ASC`,
        [outfit.id]
      );

      outfit.items = items;
    }

    return res.json({
      success: true,
      count: favorites.length,
      favorites
    });
  } catch (error) {
    console.error("Get favorites error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve favorites."
    });
  }
});

// ======================================
// GET SINGLE OUTFIT DETAILS
// GET /api/outfits/:id
// ======================================
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const outfitId = Number(req.params.id);

    if (!Number.isSafeInteger(outfitId) || outfitId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID."
      });
    }

    const [outfits] = await db.query(
      `SELECT
         o.id,
         o.user_id,
         o.occasion,
         o.style,
         o.budget,
         o.gender,
         o.outfit_name,
         o.description,
         o.created_at,
         (f.id IS NOT NULL) AS is_favorite
       FROM outfits o
       LEFT JOIN favorites f
         ON f.outfit_id = o.id AND f.user_id = ?
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
      [userId, outfitId, userId]
    );

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found."
      });
    }

    const outfit = outfits[0];

    const [items] = await db.query(
      `SELECT
         id,
         wardrobe_item_id,
         product_name,
         category,
         color,
         image_url,
         store_name,
         product_url,
         price
       FROM outfit_items
       WHERE outfit_id = ?
       ORDER BY id ASC`,
      [outfit.id]
    );

    outfit.items = items;

    return res.json({
      success: true,
      outfit
    });
  } catch (error) {
    console.error("Get outfit details error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve outfit details."
    });
  }
});

// ======================================
// SAVE NEW OUTFIT
// POST /api/outfits
// ======================================
router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;

    const {
      occasion,
      style,
      budget,
      gender,
      outfit_name,
      description,
      items
    } = req.body;

    if (
      typeof occasion !== "string" ||
      !occasion.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Occasion and at least one outfit item are required."
      });
    }

    if (items.length > 30) {
      return res.status(400).json({
        success: false,
        message: "An outfit cannot contain more than 30 items."
      });
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.category !== "string" ||
        !item.category.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Every outfit item must have a category."
        });
      }

      if (
        item.wardrobe_item_id != null &&
        (!Number.isSafeInteger(Number(item.wardrobe_item_id)) ||
          Number(item.wardrobe_item_id) <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid wardrobe item ID."
        });
      }
    }

    await connection.beginTransaction();

    // Confirm that every linked wardrobe item belongs to this user.
    const wardrobeIds = [
      ...new Set(
        items
          .filter((item) => item.wardrobe_item_id != null)
          .map((item) => Number(item.wardrobe_item_id))
      )
    ];

    if (wardrobeIds.length > 0) {
      const placeholders = wardrobeIds.map(() => "?").join(",");

      const [ownedItems] = await connection.query(
        `SELECT id
         FROM wardrobe_items
         WHERE user_id = ?
           AND id IN (${placeholders})`,
        [userId, ...wardrobeIds]
      );

      if (ownedItems.length !== wardrobeIds.length) {
        await connection.rollback();

        return res.status(403).json({
          success: false,
          message: "One or more wardrobe items do not belong to your account."
        });
      }
    }

    const cleanBudget =
      budget === "" || budget == null ? null : Number(budget);

    if (
      cleanBudget !== null &&
      (!Number.isFinite(cleanBudget) || cleanBudget < 0)
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Budget must be a valid non-negative number."
      });
    }

    const [result] = await connection.query(
      `INSERT INTO outfits
       (user_id, occasion, style, budget, gender, outfit_name, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        occasion.trim(),
        typeof style === "string" ? style.trim() : null,
        cleanBudget,
        typeof gender === "string" ? gender.trim() : null,
        typeof outfit_name === "string" && outfit_name.trim()
          ? outfit_name.trim()
          : "My Outfit",
        typeof description === "string" ? description.trim() : null
      ]
    );

    const outfitId = result.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO outfit_items
         (outfit_id, wardrobe_item_id, product_name,
          category, color, image_url, store_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          outfitId,
          item.wardrobe_item_id == null
            ? null
            : Number(item.wardrobe_item_id),
          typeof item.product_name === "string"
            ? item.product_name.trim()
            : null,
          item.category.trim(),
          typeof item.color === "string" ? item.color.trim() : null,
          typeof item.image_url === "string" ? item.image_url : null,
          typeof item.store_name === "string" ? item.store_name.trim() : null
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Outfit saved successfully.",
      outfitId
    });
  } catch (error) {
    await connection.rollback();

    console.error("Save outfit error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save outfit."
    });
  } finally {
    connection.release();
  }
});

// ======================================
// DELETE SAVED OUTFIT
// DELETE /api/outfits/:id
// ======================================
router.delete("/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const outfitId = Number(req.params.id);

    if (!Number.isSafeInteger(outfitId) || outfitId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID."
      });
    }

    await connection.beginTransaction();

    const [outfits] = await connection.query(
      `SELECT id
       FROM outfits
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [outfitId, userId]
    );

    if (outfits.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Outfit not found."
      });
    }

    await connection.query(
      "DELETE FROM favorites WHERE outfit_id = ? AND user_id = ?",
      [outfitId, userId]
    );

    await connection.query(
      "DELETE FROM outfit_items WHERE outfit_id = ?",
      [outfitId]
    );

    await connection.query(
      "DELETE FROM outfits WHERE id = ? AND user_id = ?",
      [outfitId, userId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Outfit deleted successfully."
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete outfit error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete outfit."
    });
  } finally {
    connection.release();
  }
});

// ======================================
// ADD OUTFIT TO FAVORITES
// POST /api/outfits/:id/favorite
// ======================================
router.post("/:id/favorite", async (req, res) => {
  try {
    const userId = req.user.id;
    const outfitId = Number(req.params.id);

    if (!Number.isSafeInteger(outfitId) || outfitId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID."
      });
    }

    const [outfits] = await db.query(
      "SELECT id FROM outfits WHERE id = ? AND user_id = ?",
      [outfitId, userId]
    );

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found."
      });
    }

    await db.query(
      `INSERT INTO favorites (user_id, outfit_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
      [userId, outfitId]
    );

    return res.json({
      success: true,
      message: "Outfit added to favorites."
    });
  } catch (error) {
    console.error("Add favorite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add favorite."
    });
  }
});

// ======================================
// REMOVE OUTFIT FROM FAVORITES
// DELETE /api/outfits/:id/favorite
// ======================================
router.delete("/:id/favorite", async (req, res) => {
  try {
    const userId = req.user.id;
    const outfitId = Number(req.params.id);

    if (!Number.isSafeInteger(outfitId) || outfitId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID."
      });
    }

    const [result] = await db.query(
      `DELETE FROM favorites
       WHERE user_id = ? AND outfit_id = ?`,
      [userId, outfitId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Favorite outfit not found."
      });
    }

    return res.json({
      success: true,
      message: "Outfit removed from favorites."
    });
  } catch (error) {
    console.error("Remove favorite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to remove favorite."
    });
  }
});

module.exports = router;
