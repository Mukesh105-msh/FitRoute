
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const passport = require("./config/passport");

const db = require("./config/db");

// Existing routes
const testRoutes = require("./routes/testRoutes");
const wardrobeRoutes = require("./routes/wardrobeRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const shoppingRoutes = require("./routes/shoppingRoutes");

// New outfit management route
const outfitRoutes = require("./routes/outfitRoutes");

// Weekly planner route
const plannerRoutes = require("./routes/plannerRoutes");

// Wear history route
const wearHistoryRoutes = require("./routes/wearHistoryRoutes");

// Profile & preferences route
const profileRoutes = require("./routes/profileRoutes");

const app = express();

// ======================================
// CORS CONFIGURATION
// ======================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((url) => url.trim().replace(/\/+$/, ""))
    : [])
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, tests)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // In non-production, allow localhost on any port
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Disallow origin cleanly without crashing the process
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "10mb" }));

// Initialize Passport
app.use(passport.initialize());

// ======================================
// HOME API
// ======================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to FitRoute Backend!"
  });
});

// ======================================
// DATABASE HEALTH CHECK
// ======================================

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT 1 AS databaseConnected"
    );

    res.json({
      success: true,
      message: "Backend and MySQL connected successfully!",
      database:
        rows[0].databaseConnected === 1
          ? "Connected"
          : "Disconnected"
    });
  } catch (error) {
    console.error("Database error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// ======================================
// EXISTING APIs
// ======================================

app.use("/api/test", testRoutes);

app.use("/api/wardrobe", wardrobeRoutes);

// Authentication
app.use("/api/auth", googleAuthRoutes);

// Shopping
app.use("/api/shopping", shoppingRoutes);

// ======================================
// NEW OUTFIT MANAGEMENT API
// ======================================

app.use("/api/outfits", outfitRoutes);

// ======================================
// WEEKLY PLANNER API
// ======================================

app.use("/api/planner", plannerRoutes);

// ======================================
// WEAR HISTORY API
// ======================================

app.use("/api/wear", wearHistoryRoutes);

// ======================================
// PROFILE & PREFERENCES API
// ======================================

app.use("/api/profile", profileRoutes);

// ======================================
// 404 CATCH-ALL ROUTE
// ======================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// ======================================
// GLOBAL ERROR HANDLER
// ======================================

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode =
    err.status || err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  console.error(`[FitRoute Error] ${req.method} ${req.originalUrl}:`, err.message);

  res.status(statusCode).json({
    success: false,
    message:
      isProduction && statusCode === 500
        ? "An internal server error occurred. Please try again later."
        : err.message || "An unexpected server error occurred."
  });
});

// ======================================
// START SERVER
// ======================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FitRoute backend running at http://localhost:${PORT}`);

  console.log("Wardrobe API: http://localhost:5000/api/wardrobe");

  console.log("Shopping API: http://localhost:5000/api/shopping");

  console.log("Outfit API: http://localhost:5000/api/outfits");

  console.log("Planner API: http://localhost:5000/api/planner");

  console.log("Wear History API: http://localhost:5000/api/wear");

  console.log("Profile API: http://localhost:5000/api/profile");

  console.log("Authentication API: http://localhost:5000/api/auth");
});
