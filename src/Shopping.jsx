
import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Shirt,
  Heart,
  Tag,
  Sparkles,
  AlertCircle,
  X
} from "lucide-react";
import "./Shopping.css";
import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/shopping`;

const defaultFilters = {
  gender: "",
  occasion: "",
  category: "",
  provider: "",
  minPrice: "",
  maxPrice: "",
  sort: "recommended"
};

const occasionOptions = [
  "College",
  "Office",
  "Casual",
  "Party",
  "Wedding"
];

const storeOptions = ["Myntra", "Amazon", "Flipkart", "AJIO"];

function formatPrice(price, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(price) || 0);
}

export default function Shopping() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    genders: [],
    occasions: [],
    styles: [],
    providers: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function loadFilters() {
      try {
        const response = await fetch(`${API_URL}/filters`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load filters.");
        }

        setFilterOptions(data.filters);
      } catch (err) {
        console.error("Filter loading error:", err);
      }
    }

    loadFilters();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) params.set("search", search.trim());

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== "") {
            params.set(key, value);
          }
        });

        params.set("page", String(page));
        params.set("limit", "12");

        const response = await fetch(
          `${API_URL}/products?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load products.");
        }

        if (!cancelled) {
          setProducts(data.products || []);
          setTotal(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 0);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Shopping API error:", err);
          setError(
            err.message ||
            "Could not connect to the shopping server."
          );
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [filters, search, page]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setSearch("");
    setPage(1);
  }

  const hasActiveFilters =
    search !== "" ||
    Object.entries(filters).some(
      ([key, value]) => value !== defaultFilters[key]
    );

  return (
    <section className="shopping-page">

      {/* DEMO MODE BANNER */}
      <div className="shopping-demo-banner" role="note">
        <AlertCircle size={17} />
        <span>
          <strong>Demo Mode — </strong>
          Products shown are illustrative samples only. Live retailer APIs
          (Amazon, Flipkart, Myntra, AJIO) are not yet integrated.
          Links open the retailer's website but specific products may not be available.
        </span>
      </div>

      {/* PAGE INTRO */}
      <div className="shopping-hero">
        <div className="shopping-hero-copy">
          <span className="shopping-kicker">
            <Sparkles size={15} />
            THE FITROUTE STYLE MARKETPLACE
          </span>

          <h1>
            Find Your <em>Perfect Look.</em>
          </h1>

          <p>
            Discover fashion that matches your occasion,
            personal style and budget.
          </p>

          <div className="shopping-hero-stats">
            <div>
              <strong>{total}</strong>
              <span>Products found</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Shopping stores</span>
            </div>
            <div>
              <strong>₹</strong>
              <span>Budget friendly</span>
            </div>
          </div>
        </div>

        <div className="shopping-hero-art">
          <div className="shopping-art-circle">
            <ShoppingBag size={85} strokeWidth={1} />
          </div>
          <span className="art-tag art-tag-one">YOUR STYLE</span>
          <span className="art-tag art-tag-two">YOUR BUDGET</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="shopping-search-section">
        <div className="shopping-search-box">
          <Search size={21} />

          <input
            type="search"
            placeholder="Search shirts, dresses, shoes..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="shopping-filter-toggle"
          onClick={() => setShowFilters((value) => !value)}
        >
          <SlidersHorizontal size={18} />
          Filters
        </button>
      </div>

      {/* MAIN SHOPPING LAYOUT */}
      <div className="shopping-layout">

        {/* FILTER SIDEBAR */}
        <aside
          className={`shopping-sidebar ${
            showFilters ? "filters-visible" : ""
          }`}
        >
          <div className="filter-heading">
            <div>
              <span>REFINE YOUR SEARCH</span>
              <h2>Filters</h2>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="reset-filters"
            >
              Reset
            </button>
          </div>

          <div className="filter-group">
            <h3>Shop for</h3>

            <div className="filter-choice-grid">
              {["Men", "Women", "Unisex"].map((gender) => (
                <button
                  type="button"
                  key={gender}
                  className={
                    filters.gender === gender ? "selected" : ""
                  }
                  onClick={() =>
                    updateFilter(
                      "gender",
                      filters.gender === gender ? "" : gender
                    )
                  }
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>Occasion</h3>

            <select
              value={filters.occasion}
              onChange={(event) =>
                updateFilter("occasion", event.target.value)
              }
            >
              <option value="">All occasions</option>
              {occasionOptions.map((occasion) => (
                <option key={occasion} value={occasion}>
                  {occasion}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <h3>Category</h3>

            <select
              value={filters.category}
              onChange={(event) =>
                updateFilter("category", event.target.value)
              }
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <h3>Shopping store</h3>

            <select
              value={filters.provider}
              onChange={(event) =>
                updateFilter("provider", event.target.value)
              }
            >
              <option value="">All stores</option>
              {storeOptions.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <h3>Budget range</h3>

            <div className="budget-inputs">
              <label>
                <span>Minimum ₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="500"
                  value={filters.minPrice}
                  onChange={(event) =>
                    updateFilter("minPrice", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Maximum ₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="5000"
                  value={filters.maxPrice}
                  onChange={(event) =>
                    updateFilter("maxPrice", event.target.value)
                  }
                />
              </label>
            </div>
          </div>

          <div className="filter-group">
            <h3>Sort products</h3>

            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter("sort", event.target.value)
              }
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="name">Product Name</option>
            </select>
          </div>

          <button
            type="button"
            className="reset-all-button"
            onClick={resetFilters}
          >
            <RefreshCw size={16} />
            Clear all filters
          </button>
        </aside>

        {/* PRODUCT RESULTS */}
        <div className="shopping-results">

          <div className="results-heading">
            <div>
              <span className="shopping-kicker">
                CURATED FOR YOUR STYLE
              </span>
              <h2>Explore Products</h2>
              <p>
                {loading
                  ? "Finding products..."
                  : `${total} products available in this search`}
              </p>
            </div>
          </div>

          {error && (
            <div className="shopping-error">
              <AlertCircle size={22} />
              <div>
                <strong>Unable to load products</strong>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setPage((current) => current)}
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="shopping-loading">
              <div className="shopping-spinner" />
              <h3>Finding your perfect style...</h3>
              <p>Searching the FitRoute product collection.</p>
            </div>
          ) : !error && products.length === 0 ? (
            <div className="shopping-empty">
              <div className="shopping-empty-icon">
                <ShoppingBag size={36} />
              </div>

              <h3>No products found</h3>

              <p>
                Try changing your filters or increasing your budget.
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="shopping-reset-button"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="shopping-product-grid">
                {products.map((product) => {
                  const discount =
                    product.original_price &&
                    Number(product.original_price) > Number(product.price)
                      ? Math.round(
                          ((Number(product.original_price) -
                            Number(product.price)) /
                            Number(product.original_price)) * 100
                        )
                      : 0;

                  return (
                    <article
                      className="shopping-product-card"
                      key={product.id}
                    >
                      <div className="shopping-product-image">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="product-image-placeholder">
                            <Shirt size={42} />
                          </div>
                        )}

                        {discount > 0 && (
                          <span className="product-discount">
                            {discount}% OFF
                          </span>
                        )}

                        {!product.is_verified && (
                          <span className="demo-product-label">
                            Demo listing
                          </span>
                        )}
                      </div>

                      <div className="shopping-product-info">
                        <div className="product-store">
                          <span>{product.provider}</span>
                          <span className="product-category">
                            {product.category}
                          </span>
                        </div>

                        <h3>{product.product_name}</h3>

                        <p className="product-description">
                          {product.description || "Explore this fashion item."}
                        </p>

                        <div className="product-price">
                          <strong>
                            {formatPrice(product.price, product.currency)}
                          </strong>

                          {discount > 0 && (
                            <del>
                              {formatPrice(
                                product.original_price,
                                product.currency
                              )}
                            </del>
                          )}
                        </div>

                        <div className="product-tags">
                          <span>
                            <Tag size={12} />
                            {product.style || "Fashion"}
                          </span>
                          {product.occasion && (
                            <span>{product.occasion}</span>
                          )}
                        </div>

                        <a
                          className="shop-now-button"
                          href={product.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Shop Now
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="shopping-pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>

                  <span>
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="shopping-disclaimer">
        <AlertCircle size={16} />
        <span>
          Demo listings are illustrative and not live-verified.
          Check the retailer's website for current price and availability.
        </span>
      </div>
    </section>
  );
}
