// src/WeeklyPlanner.jsx

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Sparkles,
  RefreshCw,
  Save,
  Shirt,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import {
  FITROUTE_OCCASIONS,
  FITROUTE_STYLES,
  generateWardrobeOutfit,
  getOutfitSignature
} from "./utils/outfitEngine";

import "./WeeklyPlanner.css";
import { getWeeklyPlan, saveBulkPlan, clearWeeklyPlan } from "./plannerApi";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const STORAGE_KEY = "fitroute-weekly-plan-v1";

function createEmptyDay(day) {
  return {
    day,
    occasion: day === "Saturday" || day === "Sunday" ? "Casual" : "College",
    style: "Smart Casual",
    outfit: null
  };
}

function createEmptyWeek() {
  return DAYS.map(createEmptyDay);
}

function readSavedPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (
      Array.isArray(saved) &&
      saved.length === 7 &&
      DAYS.every((day) => saved.some((entry) => entry.day === day))
    ) {
      return DAYS.map((day) => saved.find((entry) => entry.day === day));
    }
  } catch {
    // Start with a fresh plan if saved data is invalid.
  }

  return createEmptyWeek();
}

export default function WeeklyPlanner({ items = [] }) {
  const [week, setWeek] = useState(readSavedPlan);
  const [activeDay, setActiveDay] = useState("Monday");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [hasSaved, setHasSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("fitroute-token") ||
      localStorage.getItem("fitroute_token");
    if (!token) return;
    getWeeklyPlan()
      .then((data) => {
        if (data.success && Array.isArray(data.week)) {
          // Merge server data: use server values but fall back to empty-day defaults
          const merged = data.week.map((serverDay) => ({
            day: serverDay.day,
            occasion: serverDay.occasion,
            style: serverDay.style,
            outfit: serverDay.outfit || null
          }));
          setWeek(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      })
      .catch(() => {
        // Backend unavailable — localStorage data already loaded via useState
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  }, [week]);

  const activeEntry = useMemo(
    () => week.find((entry) => entry.day === activeDay) || week[0],
    [week, activeDay]
  );

  const plannedCount = week.filter(
    (entry) => entry.outfit?.pieces?.length
  ).length;

  function updateDay(field, value) {
    setWeek((current) =>
      current.map((entry) =>
        entry.day === activeDay
          ? { ...entry, [field]: value, outfit: null }
          : entry
      )
    );

    setHasSaved(false);
    setNotice("");
  }

  function getUsedSignatures(exceptDay) {
    return week
      .filter((entry) => entry.day !== exceptDay && entry.outfit)
      .map((entry) => getOutfitSignature(entry.outfit));
  }

  function generateDay(dayName = activeDay) {
    if (!items.length) {
      setNotice("Your wardrobe is empty. Add clothing items before creating your weekly plan.");
      setNoticeType("warning");
      return;
    }

    const entry = week.find((day) => day.day === dayName);
    if (!entry) return;

    const used = getUsedSignatures(dayName);

    const newOutfit = generateWardrobeOutfit(
      items,
      entry.occasion,
      entry.style,
      used
    );

    if (!newOutfit.pieces.length) {
      setNotice("We couldn't create an outfit yet. Add tops, bottoms or dresses to your wardrobe.");
      setNoticeType("warning");
      return;
    }

    setWeek((current) =>
      current.map((day) =>
        day.day === dayName
          ? { ...day, outfit: newOutfit }
          : day
      )
    );

    setHasSaved(false);
    setNotice(`${dayName}'s outfit is ready!`);
    setNoticeType("success");
  }

  function generateFullWeek() {
    if (!items.length) {
      setNotice("Add clothing to My Wardrobe before generating your week.");
      setNoticeType("warning");
      return;
    }

    const nextWeek = [];
    const usedSignatures = [];

    for (const day of week) {
      const outfit = generateWardrobeOutfit(
        items,
        day.occasion,
        day.style,
        usedSignatures
      );

      if (outfit.pieces.length) {
        usedSignatures.push(getOutfitSignature(outfit));
      }

      nextWeek.push({ ...day, outfit });
    }

    setWeek(nextWeek);
    setHasSaved(false);

    const completed = nextWeek.filter(
      (entry) => entry.outfit?.pieces?.length
    ).length;

    setNotice(
      completed === 7
        ? "Your seven-day outfit plan is ready!"
        : `Created ${completed} of 7 outfits. Add more clothing to complete the week.`
    );

    setNoticeType(completed ? "success" : "warning");
  }

  async function savePlan() {
    const token =
      localStorage.getItem("fitroute-token") ||
      localStorage.getItem("fitroute_token");
    // Always save to localStorage first
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
    } catch {
      // localStorage full — ignore
    }

    if (!token) {
      setHasSaved(true);
      setNotice("Your weekly outfit plan has been saved.");
      setNoticeType("success");
      return;
    }

    setIsSyncing(true);
    try {
      await saveBulkPlan(week);
      setHasSaved(true);
      setNotice("Your weekly outfit plan has been saved to your account.");
      setNoticeType("success");
    } catch {
      setHasSaved(true);
      setNotice("Plan saved locally. Sign in to sync across devices.");
      setNoticeType("info");
    } finally {
      setIsSyncing(false);
    }
  }

  async function clearPlan() {
    const confirmed = window.confirm(
      "Clear all seven outfits from this weekly plan?"
    );
    if (!confirmed) return;

    const token =
      localStorage.getItem("fitroute-token") ||
      localStorage.getItem("fitroute_token");
    if (token) {
      try {
        await clearWeeklyPlan();
      } catch {
        // If backend fails, still clear locally
      }
    }

    setWeek(createEmptyWeek());
    localStorage.removeItem(STORAGE_KEY);
    setHasSaved(false);
    setNotice("Your weekly plan has been cleared.");
    setNoticeType("info");
  }

  return (
    <section className="weekly-page">
      <div className="weekly-heading">
        <div>
          <span className="weekly-kicker">
            <CalendarDays size={15} />
            YOUR PERSONAL STYLE CALENDAR
          </span>

          <h1>
            Plan Your <em>Week.</em>
          </h1>

          <p>
            Seven days, seven looks. Build your outfits using the clothes
            you already own.
          </p>
        </div>

        <div className="weekly-heading-icon">
          <CalendarDays size={34} />
        </div>
      </div>

      <div className="weekly-summary">
        <div className="weekly-summary-icon">
          <Sparkles size={22} />
        </div>

        <div>
          <strong>{plannedCount} of 7 days planned</strong>
          <span>Your wardrobe has {items.length} clothing items available.</span>
        </div>

        <div className="weekly-progress">
          <div style={{ width: `${(plannedCount / 7) * 100}%` }} />
        </div>
      </div>

      <div className="weekly-toolbar">
        <div>
          <span className="weekly-section-label">YOUR WEEKLY OVERVIEW</span>
          <h2>Outfit calendar</h2>
        </div>

        <div className="weekly-toolbar-actions">
          <button className="weekly-secondary-button" onClick={clearPlan}>
            Clear plan
          </button>

          <button className="weekly-primary-button" onClick={generateFullWeek}>
            <Sparkles size={17} />
            Generate full week
          </button>
        </div>
      </div>

      <div className="weekly-day-grid">
        {week.map((entry) => (
          <button
            type="button"
            key={entry.day}
            className={`weekly-day-card ${activeDay === entry.day ? "active" : ""} ${entry.outfit?.pieces?.length ? "has-outfit" : ""}`}
            onClick={() => {
              setActiveDay(entry.day);
              setNotice("");
            }}
          >
            <span className="weekly-day-name">{entry.day.slice(0, 3)}</span>

            <span className="weekly-day-date">
              {entry.outfit?.pieces?.length ? (
                <CheckCircle2 size={18} />
              ) : (
                <CalendarDays size={18} />
              )}
            </span>

            <strong>
              {entry.outfit?.pieces?.length
                ? `${entry.outfit.pieces.length} pieces`
                : "Not planned"}
            </strong>

            <small>{entry.occasion}</small>
          </button>
        ))}
      </div>

      <div className="weekly-editor">
        <div className="weekly-editor-heading">
          <div>
            <span className="weekly-section-label">CUSTOMIZE YOUR LOOK</span>
            <h2>{activeEntry.day}'s outfit</h2>
            <p>Choose the occasion and style for this day.</p>
          </div>

          <span className="weekly-editor-badge">
            <CalendarDays size={15} />
            {activeEntry.day}
          </span>
        </div>

        <div className="weekly-select-grid">
          <label>
            Occasion
            <select
              value={activeEntry.occasion}
              onChange={(event) => updateDay("occasion", event.target.value)}
            >
              {FITROUTE_OCCASIONS.map((occasion) => (
                <option key={occasion} value={occasion}>
                  {occasion}
                </option>
              ))}
            </select>
          </label>

          <label>
            Personal style
            <select
              value={activeEntry.style}
              onChange={(event) => updateDay("style", event.target.value)}
            >
              {FITROUTE_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="weekly-outfit-area">
          {!activeEntry.outfit?.pieces?.length ? (
            <div className="weekly-empty">
              <div className="weekly-empty-icon">
                <Shirt size={34} />
              </div>

              <h3>No outfit planned for {activeEntry.day}</h3>
              <p>
                Generate a look from your wardrobe for this day.
              </p>

              <button
                className="weekly-primary-button"
                onClick={() => generateDay(activeEntry.day)}
              >
                <Sparkles size={17} />
                Generate this day's outfit
              </button>
            </div>
          ) : (
            <>
              <div className="weekly-outfit-title">
                <div>
                  <span className="weekly-section-label">YOUR SELECTED LOOK</span>
                  <h3>{activeEntry.occasion} · {activeEntry.style}</h3>
                </div>

                <button
                  className="weekly-regenerate-button"
                  onClick={() => generateDay(activeEntry.day)}
                >
                  <RefreshCw size={16} />
                  Regenerate
                </button>
              </div>

              <div className="weekly-piece-grid">
                {activeEntry.outfit.pieces.map((piece, index) => (
                  <article
                    className="weekly-piece"
                    key={`${piece.id || piece.name}-${index}`}
                  >
                    <div className="weekly-piece-image">
                      {piece.image ? (
                        <img src={piece.image} alt={piece.name} />
                      ) : (
                        <Shirt size={32} />
                      )}
                    </div>

                    <div className="weekly-piece-info">
                      <strong>{piece.name}</strong>
                      <span>{piece.category} · {piece.color || "Color not specified"}</span>
                    </div>
                  </article>
                ))}
              </div>

              {activeEntry.outfit.missing?.length > 0 && (
                <div className="weekly-missing">
                  <AlertCircle size={17} />
                  <span>
                    Consider adding: {activeEntry.outfit.missing.join(", ")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {notice && (
        <div className={`weekly-notice ${noticeType}`}>
          {noticeType === "warning" ? (
            <AlertCircle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {notice}
        </div>
      )}

      <div className="weekly-footer-actions">
        <button className="weekly-primary-button" onClick={savePlan} disabled={isSyncing}>
          <Save size={17} />
          {isSyncing ? "Saving…" : hasSaved ? "Plan saved" : "Save weekly plan"}
        </button>
      </div>

      <p className="weekly-disclaimer">
        Your weekly plan is saved to your account and synced across devices when you are signed in.
      </p>
    </section>
  );
}