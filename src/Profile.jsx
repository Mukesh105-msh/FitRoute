// src/Profile.jsx
// User Profile & Preferences page for FitRoute.

import { useEffect, useState } from "react";
import {
  UserRound,
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { API_BASE_URL } from "./apiConfig";
import "./Profile.css";

function getAuthHeaders() {
  const token =
    localStorage.getItem("fitroute-token") ||
    localStorage.getItem("fitroute_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

const API = `${API_BASE_URL}/api/profile`;

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const STYLE_OPTIONS = [
  "Casual", "Smart Casual", "Formal", "Business Casual",
  "Streetwear", "Bohemian", "Minimalist", "Sporty", "Preppy", "Elegant"
];

const OCCASION_OPTIONS = [
  "College", "Office", "Casual", "Party", "Wedding",
  "Gym", "Travel", "Date Night"
];

const COLOR_OPTIONS = [
  "Black", "White", "Navy", "Grey", "Brown", "Beige",
  "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Orange"
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences form state
  const [prefStyles, setPrefStyles] = useState([]);
  const [prefOccasions, setPrefOccasions] = useState([]);
  const [prefColors, setPrefColors] = useState([]);
  const [defaultSize, setDefaultSize] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setUser(data.user);
      setName(data.user.name || "");
      setGender(data.user.gender || "");

      if (data.preferences) {
        setPreferences(data.preferences);
        parsePrefs(data.preferences);
      }
    } catch (err) {
      setNotice({ text: err.message || "Could not load profile.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function parsePrefs(prefs) {
    const parse = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return []; }
    };
    setPrefStyles(parse(prefs.preferred_styles));
    setPrefOccasions(parse(prefs.preferred_occasions));
    setPrefColors(parse(prefs.preferred_colors));
    setDefaultSize(prefs.default_size || "");
  }

  function toggleItem(list, setList, item) {
    setList((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setNotice({ text: "", type: "" });
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, gender })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setUser(data.user);
      setNotice({ text: "Profile updated successfully!", type: "success" });
    } catch (err) {
      setNotice({ text: err.message || "Could not save profile.", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePreferences(e) {
    e.preventDefault();
    setSavingPrefs(true);
    setNotice({ text: "", type: "" });
    try {
      const res = await fetch(`${API}/preferences`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          preferred_styles: prefStyles,
          preferred_occasions: prefOccasions,
          preferred_colors: prefColors,
          default_size: defaultSize
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setPreferences(data.preferences);
      setNotice({ text: "Preferences saved!", type: "success" });
    } catch (err) {
      setNotice({ text: err.message || "Could not save preferences.", type: "error" });
    } finally {
      setSavingPrefs(false);
    }
  }

  if (loading) {
    return (
      <section className="profile-page">
        <div className="profile-loading">
          <RefreshCw size={24} className="profile-spin" />
          <span>Loading your profile…</span>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-heading">
        <div>
          <span className="profile-kicker">
            <UserRound size={15} />
            YOUR ACCOUNT
          </span>
          <h1>My <em>Profile.</em></h1>
          <p>Manage your personal information and style preferences.</p>
        </div>
        <div className="profile-heading-icon">
          <UserRound size={34} />
        </div>
      </div>

      {/* TABS */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "profile" ? "profile-tab--active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <UserRound size={16} /> Profile
        </button>
        <button
          className={`profile-tab ${activeTab === "preferences" ? "profile-tab--active" : ""}`}
          onClick={() => setActiveTab("preferences")}
        >
          <Settings size={16} /> Style Preferences
        </button>
      </div>

      {/* NOTICE */}
      {notice.text && (
        <div className={`profile-notice ${notice.type}`}>
          {notice.type === "success"
            ? <CheckCircle2 size={17} />
            : <AlertCircle size={17} />}
          {notice.text}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="profile-card">
          <div className="profile-avatar-row">
            <div className="profile-avatar-large">
              <UserRound size={36} />
            </div>
            <div>
              <h2 className="profile-display-name">{user?.name || "FitRoute User"}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-joined">
                Member since {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-IN", {
                      month: "long", year: "numeric"
                    })
                  : "—"}
              </p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <label>
              Display Name
              <input
                type="text"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </label>

            <label>
              Gender
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Prefer not to say</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <label>
              Email <span className="profile-readonly-note">(cannot be changed)</span>
              <input type="email" value={user?.email || ""} readOnly disabled />
            </label>

            <button type="submit" className="profile-primary-btn" disabled={savingProfile}>
              {savingProfile
                ? <><RefreshCw size={16} className="profile-spin" /> Saving…</>
                : <><Save size={16} /> Save Profile</>}
            </button>
          </form>
        </div>
      )}

      {activeTab === "preferences" && (
        <form className="profile-card" onSubmit={handleSavePreferences}>
          <p className="profile-prefs-hint">
            Your style preferences help FitRoute generate better outfit recommendations.
          </p>

          <div className="profile-pref-section">
            <h3>Preferred Styles</h3>
            <div className="profile-chip-grid">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`profile-chip ${prefStyles.includes(s) ? "profile-chip--active" : ""}`}
                  onClick={() => toggleItem(prefStyles, setPrefStyles, s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-pref-section">
            <h3>Preferred Occasions</h3>
            <div className="profile-chip-grid">
              {OCCASION_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`profile-chip ${prefOccasions.includes(o) ? "profile-chip--active" : ""}`}
                  onClick={() => toggleItem(prefOccasions, setPrefOccasions, o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-pref-section">
            <h3>Favourite Colors</h3>
            <div className="profile-chip-grid">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`profile-chip ${prefColors.includes(c) ? "profile-chip--active" : ""}`}
                  onClick={() => toggleItem(prefColors, setPrefColors, c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-pref-section">
            <h3>Default Clothing Size</h3>
            <select
              value={defaultSize}
              onChange={(e) => setDefaultSize(e.target.value)}
              className="profile-size-select"
            >
              <option value="">Not specified</option>
              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="profile-primary-btn" disabled={savingPrefs}>
            {savingPrefs
              ? <><RefreshCw size={16} className="profile-spin" /> Saving…</>
              : <><Save size={16} /> Save Preferences</>}
          </button>
        </form>
      )}
    </section>
  );
}
