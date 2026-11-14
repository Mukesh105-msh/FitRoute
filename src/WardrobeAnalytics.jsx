
import { useCallback, useEffect, useState } from "react";
import {
  Shirt,
  Heart,
  Sparkles,
  Layers,
  RefreshCw,
  TrendingUp,
  Package,
  CircleHelp
} from "lucide-react";
import "./WardrobeAnalytics.css";
import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/wardrobe/analytics`;

export default function WardrobeAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("fitroute-token");

      if (!token) {
        throw new Error("Please log in to view your wardrobe analytics.");
      }

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load wardrobe analytics."
        );
      }

      setAnalytics(data.analytics);
    } catch (err) {
      console.error("Analytics loading error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <section className="analytics-page">
        <div className="analytics-loading">
          <RefreshCw size={30} className="analytics-spin" />
          <h2>Preparing your style insights...</h2>
          <p>Analyzing your wardrobe and saved outfits.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analytics-page">
        <div className="analytics-error">
          <CircleHelp size={35} />
          <h2>Analytics unavailable</h2>
          <p>{error}</p>
          <button onClick={loadAnalytics}>
            <RefreshCw size={17} />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const overview = analytics?.overview || {};
  const categories = analytics?.categories || [];
  const mostUsedItems = analytics?.mostUsedItems || [];
  const unusedItems = analytics?.unusedItems || [];

  const totalItems = Number(overview.totalItems || 0);
  const utilization = Number(overview.utilizationPercentage || 0);
  const maxCategoryCount = Math.max(
    ...categories.map((item) => Number(item.itemCount || 0)),
    1
  );

  return (
    <section className="analytics-page">
      {/* HEADER */}
      <div className="analytics-heading">
        <div>
          <span className="section-kicker">
            YOUR WARDROBE INTELLIGENCE
          </span>

          <h1>Wardrobe <em>Insights.</em></h1>

          <p>
            Discover what you own, how you style it, and where
            your wardrobe has room to grow.
          </p>
        </div>

        <button
          className="analytics-refresh"
          onClick={loadAnalytics}
        >
          <RefreshCw size={17} />
          Refresh Insights
        </button>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="analytics-stats">
        <article className="analytics-stat-card">
          <span className="analytics-stat-icon">
            <Shirt size={22} />
          </span>
          <span className="analytics-stat-label">Wardrobe Items</span>
          <strong>{overview.totalItems || 0}</strong>
          <small>Your clothing collection</small>
        </article>

        <article className="analytics-stat-card">
          <span className="analytics-stat-icon">
            <Sparkles size={22} />
          </span>
          <span className="analytics-stat-label">Saved Outfits</span>
          <strong>{overview.totalOutfits || 0}</strong>
          <small>Your created combinations</small>
        </article>

        <article className="analytics-stat-card">
          <span className="analytics-stat-icon">
            <Heart size={22} />
          </span>
          <span className="analytics-stat-label">Favorites</span>
          <strong>{overview.totalFavorites || 0}</strong>
          <small>Your favorite looks</small>
        </article>

        <article className="analytics-stat-card">
          <span className="analytics-stat-icon">
            <Layers size={22} />
          </span>
          <span className="analytics-stat-label">Categories</span>
          <strong>{overview.totalCategories || 0}</strong>
          <small>Different clothing categories</small>
        </article>
      </div>

      {/* UTILIZATION */}
      <div className="analytics-panel utilization-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="section-kicker">WARDROBE PERFORMANCE</span>
            <h2>Wardrobe Utilization</h2>
            <p>
              Clothing included in at least one saved outfit.
            </p>
          </div>

          <div className="utilization-percentage">
            {utilization}%
          </div>
        </div>

        <div className="utilization-track">
          <div
            className="utilization-fill"
            style={{
              width: `${Math.min(100, Math.max(0, utilization))}%`
            }}
          />
        </div>

        <div className="utilization-details">
          <span>
            <i className="utilization-dot used-dot" />
            Used in saved outfits: {overview.usedItems || 0}
          </span>

          <span>
            <i className="utilization-dot unused-dot" />
            Not yet included: {overview.unusedItems || 0}
          </span>
        </div>
      </div>

      {/* CATEGORY DISTRIBUTION */}
      <div className="analytics-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="section-kicker">COLLECTION BREAKDOWN</span>
            <h2>Category Distribution</h2>
            <p>How your clothing is distributed across categories.</p>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="category-analytics">
            {categories.map((category) => {
              const count = Number(category.itemCount || 0);
              const percentage = totalItems
                ? Math.round((count / totalItems) * 100)
                : 0;

              return (
                <div className="category-analytics-row" key={category.category}>
                  <div className="category-analytics-info">
                    <strong>{category.category}</strong>
                    <span>{count} items · {percentage}%</span>
                  </div>

                  <div className="category-analytics-track">
                    <div
                      className="category-analytics-fill"
                      style={{
                        width: `${(count / maxCategoryCount) * 100}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="analytics-empty">
            Add clothing to see your category distribution.
          </div>
        )}
      </div>

      {/* CLOTHING USAGE */}
      <div className="analytics-two-column">
        <div className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="section-kicker">STYLE REPEATS</span>
              <h2>Most Used Pieces</h2>
              <p>Items appearing most often in saved outfits.</p>
            </div>
            <TrendingUp size={22} />
          </div>

          {mostUsedItems.length > 0 ? (
            <div className="analytics-item-list">
              {mostUsedItems.map((item) => (
                <div className="analytics-clothing-item" key={item.id}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <span className="analytics-item-placeholder">
                      <Shirt size={22} />
                    </span>
                  )}

                  <div className="analytics-clothing-info">
                    <strong>{item.name}</strong>
                    <small>{item.category} · {item.color}</small>
                  </div>

                  <span className="usage-count">
                    {item.usageCount} {Number(item.usageCount) === 1 ? "look" : "looks"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="analytics-empty">
              <Package size={25} />
              <p>No clothing has been included in saved outfits yet.</p>
            </div>
          )}
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="section-kicker">STYLE OPPORTUNITIES</span>
              <h2>Explore These Pieces</h2>
              <p>Clothing not yet included in saved outfits.</p>
            </div>
            <Sparkles size={22} />
          </div>

          {unusedItems.length > 0 ? (
            <div className="analytics-item-list">
              {unusedItems.map((item) => (
                <div className="analytics-clothing-item" key={item.id}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <span className="analytics-item-placeholder">
                      <Shirt size={22} />
                    </span>
                  )}

                  <div className="analytics-clothing-info">
                    <strong>{item.name}</strong>
                    <small>{item.category} · {item.color}</small>
                  </div>

                  <span className="unused-label">Not styled</span>
                </div>
              ))}
            </div>
          ) : totalItems > 0 ? (
            <div className="analytics-empty">
              <Heart size={25} />
              <p>Every wardrobe item appears in at least one saved outfit!</p>
            </div>
          ) : (
            <div className="analytics-empty">
              Add clothing to start exploring your wardrobe.
            </div>
          )}
        </div>
      </div>

      {/* FOOTNOTE */}
      <div className="analytics-note">
        <CircleHelp size={18} />
        <p>
          Usage statistics are calculated from your saved outfit
          combinations, not actual physical wear history.
        </p>
      </div>
    </section>
  );
}
