const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// All planner endpoints require authentication
router.use(authMiddleware);

const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

// ======================================
// GET WEEKLY PLAN FOR AUTHENTICATED USER
// GET /api/planner
// ======================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
         wp.id,
         wp.day_of_week AS day,
         wp.occasion,
         wp.style,
         wp.outfit_id,
         wp.custom_outfit_data,
         o.outfit_name,
         o.description AS outfit_description
       FROM weekly_plans wp
       LEFT JOIN outfits o
         ON o.id = wp.outfit_id AND o.user_id = ?
       WHERE wp.user_id = ?
       ORDER BY FIELD(wp.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
      [userId, userId]
    );

    // Build complete 7-day array
    const dayMap = new Map();
    rows.forEach((row) => {
      let parsedOutfit = null;
      if (row.custom_outfit_data) {
        try {
          parsedOutfit = JSON.parse(row.custom_outfit_data);
        } catch {
          parsedOutfit = null;
        }
      }

      dayMap.set(row.day, {
        id: row.id,
        day: row.day,
        occasion: row.occasion || (row.day === "Saturday" || row.day === "Sunday" ? "Casual" : "College"),
        style: row.style || "Smart Casual",
        outfit_id: row.outfit_id || null,
        outfit: parsedOutfit
      });
    });

    const fullWeek = VALID_DAYS.map((day) => {
      if (dayMap.has(day)) {
        return dayMap.get(day);
      }
      return {
        id: null,
        day,
        occasion: day === "Saturday" || day === "Sunday" ? "Casual" : "College",
        style: "Smart Casual",
        outfit_id: null,
        outfit: null
      };
    });

    return res.json({
      success: true,
      week: fullWeek
    });
  } catch (error) {
    console.error("Get weekly plan error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve weekly plan."
    });
  }
});

// ======================================
// UPDATE SINGLE DAY IN PLAN
// PUT /api/planner/:day
// ======================================
router.put("/:day", async (req, res) => {
  try {
    const userId = req.user.id;
    const dayParam = req.params.day;

    const matchedDay = VALID_DAYS.find(
      (d) => d.toLowerCase() === String(dayParam).toLowerCase()
    );

    if (!matchedDay) {
      return res.status(400).json({
        success: false,
        message: "Invalid day of week. Must be Monday through Sunday."
      });
    }

    const { occasion, style, outfit_id, outfit } = req.body;

    const safeOccasion = typeof occasion === "string" && occasion.trim() ? occasion.trim() : "Casual";
    const safeStyle = typeof style === "string" && style.trim() ? style.trim() : "Smart Casual";
    const safeOutfitId = Number.isSafeInteger(Number(outfit_id)) && Number(outfit_id) > 0 ? Number(outfit_id) : null;
    const outfitJson = outfit ? JSON.stringify(outfit) : null;

    // Verify outfit ownership if linked
    if (safeOutfitId) {
      const [owned] = await db.query(
        "SELECT id FROM outfits WHERE id = ? AND user_id = ?",
        [safeOutfitId, userId]
      );
      if (owned.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Linked outfit does not belong to your account."
        });
      }
    }

    await db.query(
      `INSERT INTO weekly_plans (user_id, day_of_week, occasion, style, outfit_id, custom_outfit_data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         occasion = VALUES(occasion),
         style = VALUES(style),
         outfit_id = VALUES(outfit_id),
         custom_outfit_data = VALUES(custom_outfit_data)`,
      [userId, matchedDay, safeOccasion, safeStyle, safeOutfitId, outfitJson]
    );

    return res.json({
      success: true,
      message: `${matchedDay}'s outfit plan saved successfully.`,
      day: {
        day: matchedDay,
        occasion: safeOccasion,
        style: safeStyle,
        outfit_id: safeOutfitId,
        outfit: outfit || null
      }
    });
  } catch (error) {
    console.error("Update day plan error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to save day plan."
    });
  }
});

// ======================================
// BULK SAVE FULL WEEK
// POST /api/planner/bulk
// ======================================
router.post("/bulk", async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.id;
    const { week } = req.body;

    if (!Array.isArray(week) || week.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Week must be an array of day plans."
      });
    }

    await connection.beginTransaction();

    for (const item of week) {
      const dayName = VALID_DAYS.find(
        (d) => d.toLowerCase() === String(item.day).toLowerCase()
      );
      if (!dayName) continue;

      const safeOccasion = typeof item.occasion === "string" && item.occasion.trim() ? item.occasion.trim() : "Casual";
      const safeStyle = typeof item.style === "string" && item.style.trim() ? item.style.trim() : "Smart Casual";
      const safeOutfitId = Number.isSafeInteger(Number(item.outfit_id)) && Number(item.outfit_id) > 0 ? Number(item.outfit_id) : null;
      const outfitJson = item.outfit ? JSON.stringify(item.outfit) : null;

      await connection.query(
        `INSERT INTO weekly_plans (user_id, day_of_week, occasion, style, outfit_id, custom_outfit_data)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           occasion = VALUES(occasion),
           style = VALUES(style),
           outfit_id = VALUES(outfit_id),
           custom_outfit_data = VALUES(custom_outfit_data)`,
        [userId, dayName, safeOccasion, safeStyle, safeOutfitId, outfitJson]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Full weekly outfit plan saved to your account."
    });
  } catch (error) {
    await connection.rollback();
    console.error("Bulk save weekly plan error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to save weekly plan."
    });
  } finally {
    connection.release();
  }
});

// ======================================
// CLEAR FULL WEEK
// DELETE /api/planner
// ======================================
router.delete("/", async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      "DELETE FROM weekly_plans WHERE user_id = ?",
      [userId]
    );

    return res.json({
      success: true,
      message: "Weekly plan cleared successfully."
    });
  } catch (error) {
    console.error("Clear weekly plan error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to clear weekly plan."
    });
  }
});

module.exports = router;

