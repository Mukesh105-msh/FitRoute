
import { useEffect, useState } from "react";
import {
  Shirt,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";

import App from "./App";
import "./AuthGate.css";
import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/auth`;

const TOKEN_KEY = "fitroute-token";
const USER_KEY = "fitroute-user";

// Save authentication information consistently
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Remove authentication information
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Fetch the authenticated user using the JWT
async function fetchCurrentUser(token) {
  const response = await fetch(`${API_URL}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.user) {
    throw new Error(
      data.message || "Unable to verify your session."
    );
  }

  return data.user;
}

// Synchronously extract and capture incoming auth tokens from URL (e.g. Google callback)
function getInitialAuth() {
  try {
    if (typeof window === "undefined") {
      return { token: "", error: "" };
    }

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const googleFailed = params.get("googleLogin") === "failed";
    const failureReason = params.get("reason");

    // If an incoming token arrived via URL from Google callback
    if (urlToken && urlToken.trim()) {
      const cleanToken = urlToken.trim();
      localStorage.setItem(TOKEN_KEY, cleanToken);

      // Clean the URL bar without triggering a reload
      if (window.history && window.history.replaceState) {
        const cleanPath = window.location.pathname.replace(/\/auth\/callback\/?$/, "") || "/";
        window.history.replaceState({}, document.title, cleanPath);
      }

      return {
        token: cleanToken,
        error: ""
      };
    }

    if (googleFailed) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, "/");
      }
      return {
        token: "",
        error: failureReason
          ? `Google login failed: ${decodeURIComponent(failureReason)}`
          : "Google login was not completed. Please try again."
      };
    }
  } catch (err) {
    console.warn("Unable to extract token from URL:", err);
  }

  return {
    token: localStorage.getItem(TOKEN_KEY) || "",
    error: ""
  };
}

export default function AuthGate() {
  const [initialAuth] = useState(getInitialAuth);
  const [token, setToken] = useState(() => initialAuth.token);

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("Other");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(initialAuth.token)
  );

  const [error, setError] = useState(() => initialAuth.error);
  const [message, setMessage] = useState("");

  // ======================================
  // RESTORE AND VERIFY AUTHENTICATION
  // ======================================
  useEffect(() => {
    let active = true;

    async function initializeSession() {
      // Re-read token from storage to handle synchronous token captures
      const existingToken =
        localStorage.getItem(TOKEN_KEY) || token || initialAuth.token;

      if (!existingToken) {
        if (active) {
          setCheckingSession(false);
        }
        return;
      }

      try {
        const user = await fetchCurrentUser(existingToken);

        if (!active) return;

        saveSession(existingToken, user);
        setToken(existingToken);
        setError("");

      } catch (err) {
        if (!active) return;

        clearSession();
        setToken("");

        setError(
          initialAuth.token
            ? "Google login verification failed. Please sign in again."
            : "Your session has expired. Please sign in again."
        );

      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    initializeSession();

    return () => {
      active = false;
    };
  }, []);

  // ======================================
  // EMAIL LOGIN AND SIGNUP
  // ======================================
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "signup" ? "/signup" : "/login";

      const payload =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              gender
            }
          : {
              email: email.trim(),
              password
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Authentication failed."
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          "The server did not return valid authentication information."
        );
      }

      saveSession(data.token, data.user);

      setToken(data.token);
      setPassword("");
      setError("");

    } catch (err) {
      setError(
        err.message || "Unable to connect to FitRoute."
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================
  // GOOGLE LOGIN
  // ======================================
  function handleGoogleLogin() {
    window.location.href = `${API_URL}/google`;
  }

  // ======================================
  // LOGOUT
  // ======================================
  function handleLogout() {
    clearSession();

    setToken("");
    setMode("login");
    setPassword("");
    setError("");
    setMessage("You have been logged out.");
  }

  // ======================================
  // SESSION LOADING SCREEN
  // ======================================
  if (checkingSession) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-icon">
            <Shirt size={29} />
          </div>

          <h2>Securing your session...</h2>

          <p className="auth-description">
            Please wait while FitRoute verifies your account.
          </p>
        </div>
      </div>
    );
  }

  // ======================================
  // AUTHENTICATED APPLICATION
  // ======================================
  if (token) {
    return (
      <div className="authenticated-app">
        <div className="auth-user-bar">
          <span>
            <ShieldCheck size={16} />
            Secure FitRoute session
          </span>

          <button onClick={handleLogout}>
            Logout
          </button>
        </div>

        <App />
      </div>
    );
  }

  // ======================================
  // LOGIN AND SIGNUP SCREEN
  // ======================================
  return (
    <div className="auth-screen">
      <section className="auth-showcase">
        <a className="auth-brand" href="/">
          <span className="auth-brand-mark">FR</span>
          <span>FitRoute</span>
        </a>

        <div className="showcase-content">
          <span className="showcase-kicker">
            <Sparkles size={15} />
            YOUR PERSONAL STYLE INTELLIGENCE
          </span>

          <h1>
            Your style.
            <br />
            <em>Your journey.</em>
          </h1>

          <p>
            Organize your wardrobe, discover beautiful outfit
            combinations and make every occasion stylish.
          </p>

          <div className="showcase-benefits">
            <div><Shirt /> Your digital wardrobe</div>
            <div><Sparkles /> Personalized outfit ideas</div>
            <div><ShieldCheck /> Your personal style space</div>
          </div>
        </div>

        <p className="showcase-footer">
          © 2026 FitRoute. Style is personal.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-icon">
            <Shirt size={29} />
          </div>

          <span className="auth-welcome">
            WELCOME TO FITROUTE
          </span>

          <h2>
            {mode === "login" ? (
              <>Welcome <em>back.</em></>
            ) : (
              <>Discover your <em>style.</em></>
            )}
          </h2>

          <p className="auth-description">
            {mode === "login"
              ? "Sign in to access your personal fashion workspace."
              : "Create your account and start your personal style journey."}
          </p>

          {message && (
            <div className="auth-success">{message}</div>
          )}

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>
                  Full name

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Gender

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Other">
                      Prefer not to say
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
              </>
            )}

            <label>
              Email address

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password

              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR CONTINUE WITH</span>
          </div>

          <button
            className="google-button"
            type="button"
            onClick={handleGoogleLogin}
          >
            <span className="google-g">G</span>
            Continue with Google
            <span>→</span>
          </button>

          <p className="auth-switch">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "login" ? "signup" : "login"
                );
                setError("");
                setMessage("");
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <p className="auth-security">
            <ShieldCheck size={14} />
            Your account is protected with secure authentication.
          </p>
        </div>
      </section>
    </div>
  );
}
