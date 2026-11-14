
const express = require("express");
const passport = require("../config/passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");

// Create JWT token
function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from backend .env");
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name || "FitRoute User"
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ======================================
// EMAIL SIGNUP
// POST /api/auth/signup
// ======================================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name."
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const allowedGenders = ["Male", "Female", "Other"];

    const selectedGender = allowedGenders.includes(gender)
      ? gender
      : "Other";

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please sign in."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      `INSERT INTO users (name, email, password_hash, gender)
       VALUES (?, ?, ?, ?)`,
      [cleanName, cleanEmail, passwordHash, selectedGender]
    );

    const user = {
      id: result.insertId,
      name: cleanName,
      email: cleanEmail,
      gender: selectedGender
    };

    return res.status(201).json({
      success: true,
      message: "Your FitRoute account has been created!",
      token: createToken(user),
      user
    });

  } catch (error) {
    console.error("Signup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create your account. Please try again."
    });
  }
});

// ======================================
// EMAIL LOGIN
// POST /api/auth/login
// ======================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.query(
      `SELECT id, name, email, password_hash, gender
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      gender: user.gender
    };

    return res.json({
      success: true,
      message: "Login successful!",
      token: createToken(safeUser),
      user: safeUser
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to sign in. Please try again."
    });
  }
});

// ======================================
// GET CURRENT AUTHENTICATED USER
// GET /api/auth/me
// ======================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email, gender, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found."
      });
    }

    return res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error("Fetch current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile."
    });
  }
});

// ======================================
// GOOGLE LOGIN
// GET /api/auth/google
// ======================================
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

// ======================================
// GOOGLE CALLBACK
// GET /api/auth/google/callback
// ======================================
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("[Google OAuth Callback Error]:", err.message || err);
      const safeReason = encodeURIComponent(err.message || "auth_error");
      return res.redirect(`${FRONTEND_URL}/?googleLogin=failed&reason=${safeReason}`);
    }

    if (!user) {
      console.error("[Google OAuth Failed - No User]:", info);
      const safeReason = encodeURIComponent(info?.message || "unauthorized");
      return res.redirect(`${FRONTEND_URL}/?googleLogin=failed&reason=${safeReason}`);
    }

    try {
      const token = createToken(user);
      return res.redirect(
        `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`
      );
    } catch (tokenErr) {
      console.error("[Google Token Generation Error]:", tokenErr.message || tokenErr);
      return res.redirect(`${FRONTEND_URL}/?googleLogin=failed&reason=token_error`);
    }
  })(req, res, next);
});

module.exports = router;
