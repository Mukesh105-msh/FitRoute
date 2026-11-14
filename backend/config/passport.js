const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const rawEmail = profile.emails?.[0]?.value;
        const name = (profile.displayName || profile.name?.givenName || "FitRoute User").slice(0, 100);

        if (!rawEmail) {
          return done(new Error("Google account did not provide an email."));
        }

        const email = rawEmail.trim().toLowerCase();

        // Create a random password hash for Google-only accounts.
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        // Create the user if they do not already exist; update name if already exists.
        await db.query(
          `INSERT INTO users (name, email, password_hash, gender)
           VALUES (?, ?, ?, 'Other')
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [name, email, passwordHash]
        );

        // Retrieve the existing or newly created user.
        const [users] = await db.query(
          `SELECT id, name, email, gender
           FROM users
           WHERE email = ?`,
          [email]
        );

        if (!users.length) {
          return done(new Error("Unable to retrieve FitRoute user."));
        }

        return done(null, users[0]);
      } catch (error) {
        console.error("Google authentication database error:", error.message);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
