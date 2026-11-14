
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Protect every wardrobe endpoint
router.use(authMiddleware);

// =====================================================
// WARDROBE ANALYTICS
// GET /api/wardrobe/analytics
// =====================================================
router.get("/analytics", async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total wardrobe items
    const [totalResult] = await db.query(
      `SELECT COUNT(*) AS totalItems
       FROM wardrobe_items
       WHERE user_id = ?`,
      [userId]
    );

    // 2. Clothing category distribution
    const [categories] = await db.query(
      `SELECT category, COUNT(*) AS itemCount
       FROM wardrobe_items
       WHERE user_id = ?
       GROUP BY category
       ORDER BY itemCount DESC`,
      [userId]
    );

    // 3. Total saved outfits
    const [outfitResult] = await db.query(
      `SELECT COUNT(*) AS totalOutfits
       FROM outfits
       WHERE user_id = ?`,
      [userId]
    );

    // 4. Total favorite outfits
    const [favoriteResult] = await db.query(
      `SELECT COUNT(*) AS totalFavorites
       FROM favorites f
       INNER JOIN outfits o ON o.id = f.outfit_id
       WHERE f.user_id = ?
       AND o.user_id = ?`,
      [userId, userId]
    );

    // 5. Clothing usage in saved outfit combinations
    const [clothingUsage] = await db.query(
      `SELECT
         wi.id,
         wi.name,
         wi.category,
         wi.color,
         wi.image_url AS image,
         COUNT(DISTINCT
           CASE
             WHEN o.user_id = ? THEN oi.outfit_id
             ELSE NULL
           END
         ) AS usageCount
       FROM wardrobe_items wi
       LEFT JOIN outfit_items oi
         ON oi.wardrobe_item_id = wi.id
       LEFT JOIN outfits o
         ON o.id = oi.outfit_id
       WHERE wi.user_id = ?
       GROUP BY
         wi.id
       ORDER BY usageCount DESC, wi.id DESC`,
      [userId, userId]
    );

    // 6. Most frequently included clothing
    const mostUsedItems = clothingUsage
      .filter((item) => Number(item.usageCount) > 0)
      .slice(0, 5);

    // 7. Clothing not yet included in saved outfits
    const unusedItems = clothingUsage
      .filter((item) => Number(item.usageCount) === 0)
      .slice(0, 5);

    // 8. Calculate wardrobe utilization
    const totalItems = Number(totalResult[0].totalItems);
    const usedItems = clothingUsage.filter(
      (item) => Number(item.usageCount) > 0
    ).length;

    const utilizationPercentage =
      totalItems > 0
        ? Math.round((usedItems / totalItems) * 100)
        : 0;

    return res.json({
      success: true,
      analytics: {
        overview: {
          totalItems,
          totalCategories: categories.length,
          totalOutfits: Number(outfitResult[0].totalOutfits),
          totalFavorites: Number(favoriteResult[0].totalFavorites),
          usedItems,
          unusedItems: totalItems - usedItems,
          utilizationPercentage
        },
        categories,
        mostUsedItems,
        unusedItems
      }
    });
  } catch (error) {
    console.error("Wardrobe analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wardrobe analytics."
    });
  }
});

// =====================================================
// GET ALL WARDROBE ITEMS
// =====================================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const [items] = await db.query(
      `SELECT id, user_id, name, category, color, image_url AS image, created_at
       FROM wardrobe_items
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error("Get wardrobe error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wardrobe."
    });
  }
});

// =====================================================
// ADD CLOTHING ITEM
// =====================================================
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, category, color, image } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO wardrobe_items
       (user_id, name, category, color, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        category.trim(),
        typeof color === "string" ? color.trim() : "Not specified",
        typeof image === "string" && image ? image : null
      ]
    );

    const [items] = await db.query(
      `SELECT id, user_id, name, category, color, image_url AS image, created_at
       FROM wardrobe_items
       WHERE id = ? AND user_id = ?`,
      [result.insertId, userId]
    );

    return res.status(201).json({
      success: true,
      item: items[0]
    });
  } catch (error) {
    console.error("Add wardrobe item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add clothing."
    });
  }
});

// =====================================================
// UPDATE CLOTHING ITEM
// =====================================================
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { name, category, color, image } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid clothing item ID."
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required."
      });
    }

    const [result] = await db.query(
      `UPDATE wardrobe_items
       SET name = ?, category = ?, color = ?, image_url = ?
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        category.trim(),
        typeof color === "string" ? color.trim() : "Not specified",
        typeof image === "string" && image ? image : null,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Clothing item not found."
      });
    }

    const [items] = await db.query(
      `SELECT id, user_id, name, category, color, image_url AS image, created_at
       FROM wardrobe_items
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    return res.json({
      success: true,
      item: items[0]
    });
  } catch (error) {
    console.error("Update wardrobe item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update clothing."
    });
  }
});

// =====================================================
// DELETE CLOTHING ITEM
// =====================================================
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid clothing item ID."
      });
    }

    const [result] = await db.query(
      `DELETE FROM wardrobe_items
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Clothing item not found."
      });
    }

    return res.json({
      success: true,
      message: "Clothing deleted successfully."
    });
  } catch (error) {
    console.error("Delete wardrobe item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete clothing."
    });
  }
});

module.exports = router;
