// backend/routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// ======================================
// GET PROFILE + PREFERENCES
// GET /api/profile
// ======================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const [[user]] = await db.query(
      "SELECT id, name, email, gender, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const [prefRows] = await db.query(
      "SELECT * FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    const formatPrefs = (row) => {
      if (!row) return null;
      return {
        ...row,
        preferred_styles: row.style_preferences,
        preferred_occasions: row.favorite_occasions,
        default_size: row.size_preference
      };
    };

    const preferences = prefRows.length > 0 ? formatPrefs(prefRows[0]) : null;

    return res.json({ success: true, user, preferences });
  } catch (error) {
    console.error("Get profile error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to retrieve profile." });
  }
});

// ======================================
// UPDATE BASIC PROFILE
// PUT /api/profile
// Body: { name?, gender? }
// ======================================
router.put("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, gender } = req.body;

    const fields = [];
    const values = [];

    if (typeof name === "string" && name.trim()) {
      fields.push("name = ?");
      values.push(name.trim().slice(0, 100));
    }

    const allowedGenders = ["Male", "Female", "Non-binary", "Prefer not to say"];
    if (typeof gender === "string" && allowedGenders.includes(gender)) {
      fields.push("gender = ?");
      values.push(gender);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    values.push(userId);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const [[updated]] = await db.query(
      "SELECT id, name, email, gender, created_at FROM users WHERE id = ?",
      [userId]
    );

    return res.json({ success: true, message: "Profile updated.", user: updated });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update profile." });
  }
});

// ======================================
// GET PREFERENCES
// GET /api/profile/preferences
// ======================================
router.get("/preferences", async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    const row = rows.length > 0 ? rows[0] : null;
    const preferences = row
      ? {
          ...row,
          preferred_styles: row.style_preferences,
          preferred_occasions: row.favorite_occasions,
          default_size: row.size_preference
        }
      : null;
    return res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error("Get preferences error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to retrieve preferences." });
  }
});

// ======================================
// UPSERT PREFERENCES
// PUT /api/profile/preferences
// Body: { preferred_styles?, style_preferences?, preferred_colors?, preferred_occasions?, favorite_occasions?, preferred_categories?, default_size?, size_preference? }
// ======================================
router.put("/preferences", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      preferred_styles,
      style_preferences,
      preferred_colors,
      preferred_occasions,
      favorite_occasions,
      preferred_categories,
      default_size,
      size_preference
    } = req.body;

    const stylesVal = preferred_styles !== undefined ? preferred_styles : style_preferences;
    const occasionsVal = preferred_occasions !== undefined ? preferred_occasions : favorite_occasions;
    const sizeVal = default_size !== undefined ? default_size : size_preference;

    const toJson = (val) => {
      if (!val) return null;
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return null;
    };

    await db.query(
      `INSERT INTO user_preferences
         (user_id, style_preferences, preferred_colors, favorite_occasions, preferred_categories, size_preference)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         style_preferences = VALUES(style_preferences),
         preferred_colors = VALUES(preferred_colors),
         favorite_occasions = VALUES(favorite_occasions),
         preferred_categories = VALUES(preferred_categories),
         size_preference = VALUES(size_preference)`,
      [
        userId,
        toJson(stylesVal),
        toJson(preferred_colors),
        toJson(occasionsVal),
        toJson(preferred_categories),
        typeof sizeVal === "string" ? sizeVal.trim().slice(0, 50) : null
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    const row = rows[0];
    const preferences = row
      ? {
          ...row,
          preferred_styles: row.style_preferences,
          preferred_occasions: row.favorite_occasions,
          default_size: row.size_preference
        }
      : null;

    return res.json({
      success: true,
      message: "Preferences saved.",
      preferences
    });
  } catch (error) {
    console.error("Save preferences error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save preferences." });
  }
});

module.exports = router;
