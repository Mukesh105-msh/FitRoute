
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// EMAIL SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const allowedGenders = ["Male", "Female", "Other"];
    const safeGender = allowedGenders.includes(gender)
      ? gender
      : "Other";

    const [result] = await db.query(
      `INSERT INTO users (name, email, password_hash, gender)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), normalizedEmail, passwordHash, safeGender]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      gender: safeGender
    };

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token: createToken(user),
      user
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create your account."
    });
  }
});

// EMAIL LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const [users] = await db.query(
      `SELECT id, name, email, password_hash, gender
       FROM users
       WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!users.length) {
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
      message: "Login successful.",
      token: createToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
});

module.exports = router;
