// src/WearHistory.jsx
// Outfit Wear History — log and review past outfits worn.

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Shirt,
  TrendingUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { API_BASE_URL } from "./apiConfig";
import "./WearHistory.css";

function getAuthHeaders() {
  const token =
    localStorage.getItem("fitroute-token") ||
    localStorage.getItem("fitroute_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

const API = `${API_BASE_URL}/api/wear`;

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function WearHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("log"); // "log" | "stats"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Log form state
  const [logForm, setLogForm] = useState({
    worn_date: new Date().toISOString().slice(0, 10),
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "stats") fetchStats();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchHistory() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}?page=${page}&limit=15`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load history.");
      setHistory(data.history || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/stats`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setStats(data.stats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleLogWear(e) {
    e.preventDefault();
    if (!logForm.worn_date) {
      setNotice({ text: "Please select a date.", type: "warning" });
      return;
    }
    setSubmitting(true);
    setNotice({ text: "", type: "" });
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(logForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to log.");
      setNotice({ text: "Wear event logged successfully!", type: "success" });
      setLogForm({ worn_date: new Date().toISOString().slice(0, 10), notes: "" });
      fetchHistory();
    } catch (err) {
      setNotice({ text: err.message || "Could not log wear event.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this wear log entry?")) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      setNotice({ text: "Wear log entry removed.", type: "success" });
    } catch (err) {
      setNotice({ text: err.message || "Could not delete entry.", type: "error" });
    }
  }

  return (
    <section className="wh-page">
      <div className="wh-heading">
        <div>
          <span className="wh-kicker">
            <CalendarDays size={15} />
            YOUR OUTFIT HISTORY
          </span>
          <h1>Wear <em>History.</em></h1>
          <p>Track every outfit you wear and discover your most-loved pieces.</p>
        </div>
        <div className="wh-heading-icon">
          <CalendarDays size={34} />
        </div>
      </div>

      {/* TAB BAR */}
      <div className="wh-tabs">
        <button
          className={`wh-tab ${activeTab === "log" ? "wh-tab--active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <CalendarDays size={16} />
          History Log
        </button>
        <button
          className={`wh-tab ${activeTab === "stats" ? "wh-tab--active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <BarChart3 size={16} />
          Wear Stats
        </button>
      </div>

      {/* NOTICE */}
      {notice.text && (
        <div className={`wh-notice ${notice.type}`}>
          {notice.type === "success"
            ? <CheckCircle2 size={17} />
            : <AlertCircle size={17} />}
          {notice.text}
        </div>
      )}

      {activeTab === "log" && (
        <>
          {/* LOG FORM */}
          <div className="wh-card">
            <h2 className="wh-card-title">
              <Shirt size={18} /> Log Today's Outfit
            </h2>
            <form className="wh-form" onSubmit={handleLogWear}>
              <label>
                Date Worn
                <input
                  type="date"
                  value={logForm.worn_date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setLogForm((f) => ({ ...f, worn_date: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Notes <span className="wh-optional">(optional)</span>
                <input
                  type="text"
                  placeholder="e.g. College presentation day"
                  value={logForm.notes}
                  maxLength={200}
                  onChange={(e) =>
                    setLogForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              <button type="submit" className="wh-primary-btn" disabled={submitting}>
                {submitting ? <RefreshCw size={16} className="wh-spin" /> : <CheckCircle2 size={16} />}
                {submitting ? "Saving…" : "Log Wear Event"}
              </button>
            </form>
          </div>

          {/* HISTORY LIST */}
          <div className="wh-card">
            <h2 className="wh-card-title">
              <TrendingUp size={18} /> Past Wear Events
            </h2>

            {loading ? (
              <div className="wh-loading">
                <RefreshCw size={22} className="wh-spin" />
                <span>Loading history…</span>
              </div>
            ) : error ? (
              <div className="wh-error">
                <AlertCircle size={18} /> {error}
              </div>
            ) : history.length === 0 ? (
              <div className="wh-empty">
                <div className="wh-empty-icon"><CalendarDays size={32} /></div>
                <h3>No wear events yet</h3>
                <p>Use the form above to log the first outfit you wear today.</p>
              </div>
            ) : (
              <>
                <ul className="wh-list">
                  {history.map((entry) => (
                    <li key={entry.id} className="wh-entry">
                      <div className="wh-entry-date">
                        <CalendarDays size={15} />
                        {formatDate(entry.worn_date)}
                      </div>
                      {entry.outfit_name && (
                        <div className="wh-entry-outfit">
                          <Shirt size={14} />
                          {entry.outfit_name} · {entry.occasion}
                        </div>
                      )}
                      {entry.notes && (
                        <p className="wh-entry-notes">{entry.notes}</p>
                      )}
                      <button
                        className="wh-delete-btn"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete wear log"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className="wh-pagination">
                    <button
                      className="wh-page-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      className="wh-page-btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "stats" && (
        <div className="wh-card">
          <h2 className="wh-card-title">
            <BarChart3 size={18} /> Wardrobe Wear Statistics
          </h2>

          {statsLoading ? (
            <div className="wh-loading">
              <RefreshCw size={22} className="wh-spin" />
              <span>Calculating…</span>
            </div>
          ) : !stats ? (
            <div className="wh-error">
              <AlertCircle size={18} /> Could not load statistics.
            </div>
          ) : (
            <>
              <div className="wh-stat-summary">
                <div className="wh-stat-box">
                  <span className="wh-stat-number">{stats.total_wear_events}</span>
                  <span className="wh-stat-label">Total wear events</span>
                </div>
                <div className="wh-stat-box">
                  <span className="wh-stat-number">{stats.most_worn.length}</span>
                  <span className="wh-stat-label">Items tracked</span>
                </div>
                <div className="wh-stat-box">
                  <span className="wh-stat-number">{stats.never_worn.length}</span>
                  <span className="wh-stat-label">Never worn</span>
                </div>
              </div>

              {stats.most_worn.length > 0 && (
                <div className="wh-stats-section">
                  <h3>Most Worn Items</h3>
                  <ul className="wh-stats-list">
                    {stats.most_worn.map((item) => (
                      <li key={item.id} className="wh-stats-item">
                        <div className="wh-stats-item-img">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <Shirt size={22} />
                          )}
                        </div>
                        <div className="wh-stats-item-info">
                          <strong>{item.name}</strong>
                          <span>{item.category} · {item.color}</span>
                        </div>
                        <span className="wh-wear-badge">{item.wear_count}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stats.never_worn.length > 0 && (
                <div className="wh-stats-section">
                  <h3>Never Worn</h3>
                  <p className="wh-stats-hint">These items are waiting for their moment.</p>
                  <ul className="wh-stats-list">
                    {stats.never_worn.map((item) => (
                      <li key={item.id} className="wh-stats-item wh-stats-item--faded">
                        <div className="wh-stats-item-img">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <Shirt size={22} />
                          )}
                        </div>
                        <div className="wh-stats-item-info">
                          <strong>{item.name}</strong>
                          <span>{item.category} · {item.color}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stats.most_worn.length === 0 && stats.never_worn.length === 0 && (
                <div className="wh-empty">
                  <div className="wh-empty-icon"><BarChart3 size={32} /></div>
                  <h3>No data yet</h3>
                  <p>Log some wear events to see statistics about your wardrobe usage.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
