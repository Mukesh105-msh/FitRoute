// backend/routes/wearHistoryRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// ======================================
// LOG A WEAR EVENT
// POST /api/wear
// Body: { worn_date, outfit_id?, notes?, wardrobe_item_ids?: number[] }
// ======================================
router.post("/", async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.id;
    const { worn_date, outfit_id, notes, wardrobe_item_ids } = req.body;

    if (!worn_date || !/^\d{4}-\d{2}-\d{2}$/.test(worn_date)) {
      return res.status(400).json({
        success: false,
        message: "worn_date is required in YYYY-MM-DD format."
      });
    }

    const safeOutfitId =
      Number.isSafeInteger(Number(outfit_id)) && Number(outfit_id) > 0
        ? Number(outfit_id)
        : null;

    // Verify outfit ownership if provided
    if (safeOutfitId) {
      const [owned] = await db.query(
        "SELECT id FROM outfits WHERE id = ? AND user_id = ?",
        [safeOutfitId, userId]
      );
      if (owned.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Outfit does not belong to your account."
        });
      }
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO outfit_wear_history (user_id, outfit_id, worn_date, notes)
       VALUES (?, ?, ?, ?)`,
      [userId, safeOutfitId, worn_date, notes || null]
    );

    const wearId = result.insertId;

    // Link wardrobe items if provided
    if (Array.isArray(wardrobe_item_ids) && wardrobe_item_ids.length > 0) {
      const validIds = wardrobe_item_ids
        .map(Number)
        .filter((n) => Number.isSafeInteger(n) && n > 0);

      if (validIds.length > 0) {
        // Verify these items belong to the user
        const placeholders = validIds.map(() => "?").join(",");
        const [ownedItems] = await connection.query(
          `SELECT id FROM wardrobe_items WHERE id IN (${placeholders}) AND user_id = ?`,
          [...validIds, userId]
        );
        const ownedIds = ownedItems.map((r) => r.id);

        for (const itemId of ownedIds) {
          await connection.query(
            "INSERT INTO wear_log_items (wear_log_id, wardrobe_item_id) VALUES (?, ?)",
            [wearId, itemId]
          );
        }
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Wear event logged successfully.",
      wear_id: wearId
    });
  } catch (error) {
    await connection.rollback();
    console.error("Log wear event error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to log wear event."
    });
  } finally {
    connection.release();
  }
});

// ======================================
// LIST WEAR HISTORY
// GET /api/wear?page=1&limit=20
// ======================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT
         owh.id,
         owh.worn_date,
         owh.notes,
         owh.created_at,
         o.outfit_name,
         o.occasion,
         o.style
       FROM outfit_wear_history owh
       LEFT JOIN outfits o ON o.id = owh.outfit_id AND o.user_id = ?
       WHERE owh.user_id = ?
       ORDER BY owh.worn_date DESC, owh.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM outfit_wear_history WHERE user_id = ?",
      [userId]
    );

    return res.json({
      success: true,
      history: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Get wear history error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wear history."
    });
  }
});

// ======================================
// WEAR STATS
// GET /api/wear/stats
// ======================================
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;

    const [mostWorn] = await db.query(
      `SELECT
         wi.id,
         wi.name,
         wi.category,
         wi.color,
         wi.image_url,
         COUNT(wli.id) AS wear_count
       FROM wardrobe_items wi
       JOIN wear_log_items wli ON wli.wardrobe_item_id = wi.id
       JOIN outfit_wear_history owh ON owh.id = wli.wear_log_id
       WHERE wi.user_id = ? AND owh.user_id = ?
       GROUP BY wi.id, wi.name, wi.category, wi.color
       ORDER BY wear_count DESC
       LIMIT 10`,
      [userId, userId]
    );

    const [neverWorn] = await db.query(
      `SELECT
         wi.id,
         wi.name,
         wi.category,
         wi.color,
         wi.image_url
       FROM wardrobe_items wi
       WHERE wi.user_id = ?
         AND wi.id NOT IN (
           SELECT DISTINCT wli.wardrobe_item_id
           FROM wear_log_items wli
           JOIN outfit_wear_history owh ON owh.id = wli.wear_log_id
           WHERE owh.user_id = ?
         )
       ORDER BY wi.created_at ASC
       LIMIT 10`,
      [userId, userId]
    );

    const [[{ total_events }]] = await db.query(
      "SELECT COUNT(*) AS total_events FROM outfit_wear_history WHERE user_id = ?",
      [userId]
    );

    return res.json({
      success: true,
      stats: {
        total_wear_events: total_events,
        most_worn: mostWorn,
        never_worn: neverWorn
      }
    });
  } catch (error) {
    console.error("Wear stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wear statistics."
    });
  }
});

// ======================================
// DELETE WEAR LOG ENTRY
// DELETE /api/wear/:id
// ======================================
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const wearId = parseInt(req.params.id, 10);

    if (!Number.isSafeInteger(wearId) || wearId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid wear log ID."
      });
    }

    const [owned] = await db.query(
      "SELECT id FROM outfit_wear_history WHERE id = ? AND user_id = ?",
      [wearId, userId]
    );

    if (owned.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Wear log entry not found."
      });
    }

    // wear_log_items FK is CASCADE — deleted automatically
    await db.query(
      "DELETE FROM outfit_wear_history WHERE id = ? AND user_id = ?",
      [wearId, userId]
    );

    return res.json({
      success: true,
      message: "Wear log entry deleted."
    });
  } catch (error) {
    console.error("Delete wear log error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete wear log entry."
    });
  }
});

module.exports = router;
