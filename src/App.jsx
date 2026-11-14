
import { useEffect, useState } from "react";
import {
  Shirt,
  Heart,
  Sparkles,
  UserRound,
  Bell,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Palette,
  ShieldCheck,
  Menu,
  X,
  Plus,
  Search,
  Trash2,
  ImagePlus,
  Pencil,
  TrendingUp,
  History
} from "lucide-react";

import AIStylist from "./AIStylist";
import WeeklyPlanner from "./WeeklyPlanner";
import ColorAssistant from "./ColorAssistant";
import WardrobeAnalytics from "./WardrobeAnalytics";
import WearHistory from "./WearHistory";
import Profile from "./Profile";
import {
  getFavoriteOutfits,
  removeOutfitFromFavorites
} from "./outfitApi";
import "./App.css";
import "./AppNotifications.css";

import {
  getWardrobe,
  addWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem
} from "./wardrobeApi";

const FASHION_IMAGE =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&auto=format&fit=crop";

const STORAGE_KEY = "fitroute-wardrobe";
const BACKUP_KEY = "fitroute-wardrobe-backup-before-mysql";
const MIGRATION_KEY = "fitroute-wardrobe-migrated-v1";

export default function App() {
  const [activePage, setActivePage] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  // Database-backed Favorites state
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoriteActionId, setFavoriteActionId] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("fitroute-user");
      if (savedUser) return JSON.parse(savedUser);

      const token = localStorage.getItem("fitroute-token");
      if (token) {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(
          decodeURIComponent(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
              .split("")
              .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
              .join("")
          )
        );

        return {
          name: decoded.name || decoded.email?.split("@")[0] || "FitRoute User",
          email: decoded.email || ""
        };
      }
    } catch (error) {
      console.warn("Unable to read FitRoute profile:", error);
    }

    return { name: "FitRoute User", email: "" };
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fitroute-notifications") || "null");
      if (Array.isArray(saved)) return saved;
    } catch {
      // Use the welcome notification if saved data is invalid.
    }

    return [{
      id: "welcome",
      title: "Welcome to FitRoute!",
      detail: "Your personal style workspace is ready.",
      time: "Just now",
      read: false
    }];
  });

  useEffect(() => {
    localStorage.setItem("fitroute-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  function handleAppLogout() {
    localStorage.removeItem("fitroute-token");
    localStorage.removeItem("fitroute-user");
    localStorage.removeItem("fitroute-notifications");
    window.location.reload();
  }

  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  const [category, setCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("Tops");
  const [itemColor, setItemColor] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = [
    "All",
    "Tops",
    "Bottoms",
    "Dresses",
    "Outerwear",
    "Shoes",
    "Accessories"
  ];

  // Load from MySQL and safely migrate existing localStorage items.
  useEffect(() => {
    let cancelled = false;

    async function loadAndMigrateWardrobe() {
      setLoading(true);
      setApiError("");

      try {
        const localItems = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(localItems)) {
          throw new Error("Your saved wardrobe data has an invalid format.");
        }

        let databaseItems = await getWardrobe();

        if (
          localItems.length > 0 &&
          !localStorage.getItem(BACKUP_KEY)
        ) {
          localStorage.setItem(
            BACKUP_KEY,
            JSON.stringify(localItems)
          );
        }

        const makeSignature = (item) =>
          JSON.stringify([
            item.name || "",
            item.category || "",
            item.color || "Not specified",
            item.image || ""
          ]);

        const existingSignatures = new Set(
          databaseItems.map(makeSignature)
        );

        let migrationSuccessful = true;

        for (const item of localItems) {
          const signature = makeSignature(item);

          if (existingSignatures.has(signature)) {
            continue;
          }

          try {
            await addWardrobeItem({
              name: item.name,
              category: item.category,
              color: item.color || "Not specified",
              image: item.image || ""
            });

            existingSignatures.add(signature);
          } catch (error) {
            migrationSuccessful = false;
            throw new Error(
              "Migration stopped while transferring your clothing. " +
              "Your original local wardrobe backup is preserved. " +
              error.message
            );
          }
        }

        databaseItems = await getWardrobe();

        if (cancelled) return;

        if (migrationSuccessful) {
          localStorage.setItem(
            MIGRATION_KEY,
            "completed"
          );

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(databaseItems)
          );
        }

        setItems(databaseItems);
      } catch (error) {
        console.error("Wardrobe loading error:", error);

        if (!cancelled) {
          setApiError(error.message);

          try {
            const saved = JSON.parse(
              localStorage.getItem(STORAGE_KEY) || "[]"
            );

            if (Array.isArray(saved)) {
              setItems(saved);
            }
          } catch {
            setItems([]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAndMigrateWardrobe();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setItemName("");
    setItemCategory("Tops");
    setItemColor("");
    setItemImage("");
    setEditingItem(null);
  }

  function openAddForm() {
    resetForm();
    setShowAdd(true);
  }

  function openEditForm(item) {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemColor(
      item.color === "Not specified" ? "" : item.color
    );
    setItemImage(item.image || "");
    setShowAdd(true);
  }

  function openDetails(item) {
    setSelectedItem(item);
  }

  function closeDetails() {
    setSelectedItem(null);
  }

  function editSelectedItem() {
    if (!selectedItem) return;

    const item = selectedItem;
    setSelectedItem(null);
    openEditForm(item);
  }

  function closeForm() {
    setShowAdd(false);
    resetForm();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!itemName.trim()) {
      window.alert("Please enter a clothing item name.");
      return;
    }

    if (loading || saving) return;

    setSaving(true);
    setApiError("");

    const clothingData = {
      name: itemName.trim(),
      category: itemCategory,
      color: itemColor.trim() || "Not specified",
      image: itemImage || ""
    };

    try {
      if (editingItem) {
        const updatedItem = await updateWardrobeItem(
          editingItem.id,
          clothingData
        );

        const updatedItems = items.map((item) =>
          item.id === editingItem.id ? updatedItem : item
        );

        setItems(updatedItems);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedItems)
        );
      } else {
        const newItem = await addWardrobeItem(clothingData);

        const updatedItems = [newItem, ...items];

        setItems(updatedItems);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedItems)
        );
      }

      closeForm();
    } catch (error) {
      console.error("Save clothing error:", error);
      setApiError(error.message);
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this clothing item?"
    );

    if (!confirmed) return;

    try {
      await deleteWardrobeItem(id);

      const updatedItems = items.filter(
        (item) => item.id !== id
      );

      setItems(updatedItems);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedItems)
      );

      setSelectedItem(null);
    } catch (error) {
      console.error("Delete clothing error:", error);
      setApiError(error.message);
      window.alert(error.message);
    }
  }

  function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      window.alert("Choose an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setItemImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  const visibleItems = items.filter((item) =>
    (category === "All" || item.category === category) &&
    (
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.color || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const navItems = [
    { label: "Home" },
    { label: "My Wardrobe", icon: Shirt },
    { label: "AI Stylist", icon: Sparkles },
    { label: "Weekly Planner", icon: CalendarDays },
    { label: "Wear History", icon: History },
    { label: "Color Assistant", icon: Palette },
    { label: "Favorites", icon: Heart },
    { label: "Analytics", icon: TrendingUp },
    { label: "Profile", icon: UserRound }
  ];

  const features = [
    {
      icon: Shirt,
      title: "Digital Wardrobe",
      detail: "Organize & Manage"
    },
    {
      icon: Sparkles,
      title: "AI Outfit Recommendations",
      detail: "Personalized for You"
    },
    {
      icon: CalendarCheck,
      title: "Save & Reuse Looks",
      detail: "For Any Occasion"
    }
  ];

  const benefits = [
    { icon: Heart, label: "Personalized for You" },
    { icon: Sparkles, label: "AI-Powered Styling" },
    { icon: CalendarCheck, label: "Occasion Ready Looks" },
    { icon: ShieldCheck, label: "Private & Secure" }
  ];

  function navigate(label) {
    setActivePage(label);
    setMenuOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }

  // Load favorites from MySQL whenever the Favorites page is opened.
  useEffect(() => {
    if (activePage !== "Favorites") return;

    let cancelled = false;

    async function loadFavorites() {
      setFavoritesLoading(true);
      setFavoritesError("");

      try {
        const favorites = await getFavoriteOutfits();

        if (!cancelled) {
          setSavedOutfits(Array.isArray(favorites) ? favorites : []);
        }
      } catch (error) {
        console.error("Favorites loading error:", error);

        if (!cancelled) {
          setFavoritesError(error.message || "Unable to load your favorites.");
          setSavedOutfits([]);
        }
      } finally {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [activePage, favoritesVersion]);

  // Remove only the Favorites relationship. The saved outfit remains in MySQL.
  async function removeFavorite(outfitId) {
    if (!outfitId || favoriteActionId !== null) return;

    const confirmed = window.confirm(
      "Remove this outfit from your Favorites? The saved outfit will remain in your account."
    );

    if (!confirmed) return;

    setFavoriteActionId(outfitId);
    setFavoritesError("");

    try {
      await removeOutfitFromFavorites(outfitId);

      setSavedOutfits((current) =>
        current.filter((outfit) =>
          Number(outfit.outfit_id ?? outfit.id) !== Number(outfitId)
        )
      );

      setFavoritesVersion((version) => version + 1);
    } catch (error) {
      console.error("Remove favorite error:", error);
      setFavoritesError(error.message || "Unable to remove this favorite.");
    } finally {
      setFavoriteActionId(null);
    }
  }

  function getFavoriteItems(outfit) {
    const items = outfit.items || outfit.pieces || outfit.outfit_items || [];
    return Array.isArray(items) ? items : [];
  }

  function getFavoriteItemImage(item) {
    return item.image || item.image_url || item.product_image || "";
  }

  function getFavoriteItemName(item) {
    return item.name || item.product_name || "Wardrobe item";
  }

  function getFavoriteOutfitId(outfit) {
    return outfit.outfit_id ?? outfit.id;
  }

  return (
    <div className="fitroute">
      {/* HEADER */}
      <header className="navbar">
        <a
          className="brand"
          href="#home"
          onClick={() => navigate("Home")}
        >
          <span className="brand-mark">FR</span>
          <span className="brand-name">FitRoute</span>
          <span className="brand-divider" />
          <span className="brand-tagline">
            AI-Powered Fashion &amp; Wardrobe
          </span>
        </a>

        <nav
          className={`nav-links ${menuOpen ? "nav-open" : ""}`}
          aria-label="Main Navigation"
        >
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${
                activePage === label ? "active" : ""
              }`}
              onClick={() => navigate(label)}
            >
              {Icon && <Icon size={16} />}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="header-popover-wrap">
            <button
              className="icon-button notification"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setProfileOpen(false);
              }}
            >
              <Bell size={21} />
              {unreadNotifications > 0 && <span className="notification-dot" />}
            </button>

            {notificationsOpen && (
              <div className="fitroute-popover notification-popover">
                <div className="popover-heading">
                  <div>
                    <strong>Notifications</strong>
                    <small>{unreadNotifications} unread</small>
                  </div>
                  <button type="button" onClick={markAllNotificationsRead}>
                    Mark all read
                  </button>
                </div>
                {notifications.length ? (
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <button
                        type="button"
                        className={`notification-item ${notification.read ? "is-read" : ""}`}
                        key={notification.id}
                        onClick={() => setNotifications((current) =>
                          current.map((item) =>
                            item.id === notification.id ? { ...item, read: true } : item
                          )
                        )}
                      >
                        <span className="notification-item-icon"><Bell size={17} /></span>
                        <span className="notification-item-copy">
                          <strong>{notification.title}</strong>
                          <small>{notification.detail}</small>
                          <small className="notification-time">{notification.time}</small>
                        </span>
                        {!notification.read && <i className="unread-indicator" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="popover-empty">You're all caught up.</p>
                )}
              </div>
            )}
          </div>

          <div className="header-popover-wrap">
            <button
              className="profile-button"
              aria-label="Profile"
              aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen((open) => !open);
                setNotificationsOpen(false);
              }}
            >
              <UserRound size={21} />
            </button>

            {profileOpen && (
              <div className="fitroute-popover profile-popover">
                <div className="profile-summary">
                  <span className="profile-avatar"><UserRound size={22} /></span>
                  <span>
                    <strong>{currentUser.name || "FitRoute User"}</strong>
                    <small>{currentUser.email || "Signed in to FitRoute"}</small>
                  </span>
                </div>
                <div className="profile-status">
                  <ShieldCheck size={16} />
                  <span>Secure FitRoute account</span>
                </div>
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => {
                    navigate("Profile");
                    setProfileOpen(false);
                  }}
                >
                  <span>Edit Profile & Preferences</span>
                  <ArrowRight size={14} />
                </button>
                <button type="button" className="profile-logout" onClick={handleAppLogout}>
                  Logout
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          <button
            className="mobile-menu"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="nav-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main id="home">
        {/* MY WARDROBE */}
        {activePage === "My Wardrobe" ? (
          <section className="wardrobe-page">
            <div className="wardrobe-heading">
              <div>
                <span className="section-kicker">
                  YOUR PERSONAL COLLECTION
                </span>

                <h1>My <em>Wardrobe.</em></h1>

                <p>
                  Every piece you own, beautifully organized in one place.
                </p>
              </div>

              <button
                className="primary-button add-item-button"
                onClick={openAddForm}
                disabled={loading}
              >
                <Plus size={19} />
                Add Clothing
              </button>
            </div>

            {apiError && (
              <p role="alert" style={{ color: "#b42318" }}>
                {apiError}
              </p>
            )}

            <div className="wardrobe-summary">
              <div>
                <span className="summary-number">{items.length}</span>
                <span>Total items</span>
              </div>

              <div>
                <span className="summary-number">
                  {new Set(items.map((item) => item.category)).size}
                </span>
                <span>Categories</span>
              </div>

              <div>
                <span className="summary-number">
                  {items.filter((item) => item.image).length}
                </span>
                <span>With photos</span>
              </div>
            </div>

            <div className="wardrobe-toolbar">
              <div className="wardrobe-search">
                <Search size={18} />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search clothing or color..."
                />
              </div>

              <div className="category-filters">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={
                      category === c
                        ? "category-chip selected"
                        : "category-chip"
                    }
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="wardrobe-empty">
                <div className="empty-icon">
                  <Shirt size={35} />
                </div>
                <h2>Loading your wardrobe...</h2>
                <p>Connecting to your FitRoute database.</p>
              </div>
            ) : visibleItems.length > 0 ? (
              <div className="wardrobe-grid">
                {visibleItems.map((item) => (
                  <article
                    className="clothing-card"
                    key={item.id}
                    onClick={() => openDetails(item)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="clothing-photo">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="clothing-placeholder">
                          <Shirt size={42} />
                          <span>No photo added</span>
                        </div>
                      )}

                      <div
                        className="clothing-actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          className="edit-item"
                          title="Edit clothing"
                          onClick={() => openEditForm(item)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="delete-item"
                          title="Delete clothing"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="clothing-info">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.category}</p>
                      </div>

                      <span className="color-label">
                        {item.color}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wardrobe-empty">
                <div className="empty-icon">
                  <Shirt size={35} />
                </div>

                <h2>
                  {items.length
                    ? "No matching pieces found"
                    : "Your wardrobe starts here"}
                </h2>

                <p>
                  {items.length
                    ? "Try another search or category."
                    : "Add your first clothing item to your wardrobe."}
                </p>

                {!items.length && (
                  <button
                    className="primary-button"
                    onClick={openAddForm}
                  >
                    <Plus size={18} />
                    Add Your First Item
                  </button>
                )}
              </div>
            )}
          </section>

        ) : activePage === "AI Stylist" ? (

          <AIStylist items={items} />

        ) : activePage === "Weekly Planner" ? (

          <WeeklyPlanner items={items} />

        ) : activePage === "Color Assistant" ? (

          <ColorAssistant items={items} />

        ) : activePage === "Favorites" ? (

          <section className="wardrobe-page">
            <div className="wardrobe-heading">
              <div>
                <span className="section-kicker">
                  YOUR PERSONAL STYLE COLLECTION
                </span>

                <h1>Saved <em>Looks.</em></h1>

                <p>
                  Your favorite outfit combinations, all in one place.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => navigate("AI Stylist")}
              >
                <Sparkles size={18} />
                Create an Outfit
              </button>
            </div>

            {favoritesError && (
              <p role="alert" style={{ color: "#b42318", marginBottom: 18 }}>
                {favoritesError}
              </p>
            )}

            {favoritesLoading ? (
              <div className="wardrobe-empty">
                <div className="empty-icon">
                  <Heart size={35} />
                </div>

                <h2>Loading your favorite looks...</h2>
                <p>Connecting to your FitRoute account.</p>
              </div>
            ) : savedOutfits.length > 0 ? (
              <div className="wardrobe-grid">
                {savedOutfits.map((outfit) => {
                  const outfitId = getFavoriteOutfitId(outfit);
                  const pieces = getFavoriteItems(outfit);
                  const firstImage = pieces
                    .map(getFavoriteItemImage)
                    .find(Boolean);

                  return (
                    <article className="clothing-card" key={outfitId}>
                      <div className="clothing-photo favorite-photo">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={`${outfit.occasion || "Saved"} outfit`}
                          />
                        ) : (
                          <div className="clothing-placeholder">
                            <Heart size={42} />
                            <span>Saved outfit</span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="delete-item"
                          title="Remove from Favorites"
                          aria-label="Remove from Favorites"
                          disabled={favoriteActionId === outfitId}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(outfitId);
                          }}
                        >
                          {favoriteActionId === outfitId ? (
                            <span>...</span>
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>

                      <div className="clothing-info">
                        <div>
                          <h3>
                            {outfit.outfit_name ||
                              `${outfit.occasion || "Saved"} Look`}
                          </h3>

                          <p>{outfit.style || "Personal style"}</p>
                        </div>

                        <span className="color-label">
                          {pieces.length} pieces
                        </span>
                      </div>

                      {pieces.length > 0 && (
                        <div style={{ padding: "0 16px 16px" }}>
                          <p style={{ margin: 0, fontSize: 13, color: "#8b7668" }}>
                            {pieces.map(getFavoriteItemName).join(" · ")}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="wardrobe-empty">
                <div className="empty-icon">
                  <Heart size={35} />
                </div>

                <h2>Your favorite looks will appear here</h2>

                <p>
                  Generate an outfit with AI Stylist and save it
                  to build your personal style collection.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("AI Stylist")}
                >
                  <Sparkles size={18} />
                  Meet Your AI Stylist
                </button>
              </div>
            )}
          </section>

        ) : activePage === "Analytics" ? (

          <WardrobeAnalytics />

        ) : activePage === "Wear History" ? (

          <WearHistory />

        ) : activePage === "Profile" ? (

          <Profile />

        ) : (
          /* HOME PAGE */
          <>
            <section className="hero">
              <div className="hero-decoration decor-left" />
              <div className="hero-decoration decor-right" />

              <div className="hero-copy">
                <div className="eyebrow">
                  <span />
                  YOUR PERSONAL STYLE INTELLIGENCE
                  <span />
                </div>

                <h1>
                  Dress Smarter,
                  <br />
                  <em>Style Better.</em>
                </h1>

                <p className="hero-description">
                  Discover your personal style, organize your wardrobe,
                  and create outfits that make every day look exceptional.
                </p>

                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() => navigate("My Wardrobe")}
                  >
                    <Shirt size={19} />
                    Explore My Wardrobe
                    <ArrowRight size={19} />
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => navigate("AI Stylist")}
                  >
                    <Sparkles size={19} />
                    Meet Your AI Stylist
                  </button>
                </div>

                <div className="feature-row">
                  {features.map(({ icon: Icon, title, detail }, index) => (
                    <div className="feature-wrap" key={title}>
                      <div className="feature">
                        <Icon size={29} strokeWidth={1.7} />

                        <div>
                          <h3>{title}</h3>
                          <p>{detail}</p>
                        </div>
                      </div>

                      {index !== features.length - 1 && (
                        <span className="feature-divider" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-visual">
                <div className="halo" />

                <div className="photo-card">
                  <img
                    src={FASHION_IMAGE}
                    alt="Fashion outfit"
                  />

                  <div className="photo-caption">
                    <span>THE STYLE EDIT</span>
                    <h2>Effortless Elegance</h2>
                    <p>Discover a look that feels like you.</p>
                  </div>
                </div>

                <div className="floating-card styling-card">
                  <span className="floating-icon">
                    <Shirt size={23} />
                  </span>
                  <div>
                    <strong>AI Styling</strong>
                    <small>Smart Outfit Ideas</small>
                  </div>
                </div>

                <div className="floating-card wardrobe-card">
                  <span className="floating-icon">
                    <Shirt size={23} />
                  </span>
                  <div>
                    <strong>My Wardrobe</strong>
                    <small>Upload &amp; Organize</small>
                  </div>
                  <span className="check">✓</span>
                </div>

                <div className="floating-card saved-card">
                  <span className="floating-icon">
                    <Heart size={23} />
                  </span>
                  <div>
                    <strong>Saved Looks</strong>
                    <small>Revisit Your Favorites</small>
                  </div>
                </div>

                <div className="confidence-stamp">
                  <Sparkles size={21} />
                  <span>
                    STYLE WITH
                    <br />
                    CONFIDENCE
                  </span>
                </div>
              </div>
            </section>

            <section className="benefit-section">
              <div className="benefit-panel">
                {benefits.map(({ icon: Icon, label }) => (
                  <div className="benefit" key={label}>
                    <Icon size={24} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="intro">
              <span className="section-kicker">A NEW WAY TO STYLE</span>
              <h2>Your wardrobe. <em>Your rules.</em></h2>
              <p>
                Everything you need to make confident style choices,
                all in one beautifully simple place.
              </p>
            </section>
          </>
        )}
      </main>

      {/* CLOTHING DETAILS MODAL */}
      {selectedItem && (
        <div
          className="modal-backdrop"
          onClick={closeDetails}
        >
          <div
            className="add-item-modal clothing-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeDetails}
            >
              <X size={20} />
            </button>

            <span className="section-kicker">
              YOUR WARDROBE COLLECTION
            </span>

            <h2>
              Clothing <em>Details</em>
            </h2>

            {selectedItem.image ? (
              <img
                className="details-image"
                src={selectedItem.image}
                alt={selectedItem.name}
              />
            ) : (
              <div className="clothing-placeholder">
                <Shirt size={45} />
                <span>No photo available</span>
              </div>
            )}

            <div className="details-information">
              <h2>{selectedItem.name}</h2>

              <p>
                <strong>Category:</strong> {selectedItem.category}
              </p>

              <p>
                <strong>Color:</strong> {selectedItem.color}
              </p>
            </div>

            <div className="details-actions">
              <button
                type="button"
                className="primary-button"
                onClick={editSelectedItem}
              >
                <Pencil size={17} />
                Edit Item
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => deleteItem(selectedItem.id)}
              >
                <Trash2 size={17} />
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTFIT DETAILS MODAL */}
      {selectedOutfit && (
        <div className="modal-backdrop" onClick={() => setSelectedOutfit(null)}>
          <div className="clothing-details-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedOutfit(null)}
              aria-label="Close outfit details"
            >
              <X size={20} />
            </button>

            <span className="section-kicker">OUTFIT DETAILS</span>
            <h2>{selectedOutfit.outfit_name || `${selectedOutfit.occasion || "Saved"} Look`}</h2>

            <div className="details-information">
              <p>
                <strong>Occasion:</strong> {selectedOutfit.occasion || "General"}
              </p>
              <p>
                <strong>Style:</strong> {selectedOutfit.style || "Personal"}
              </p>
              {selectedOutfit.description && (
                <p>
                  <strong>Description:</strong> {selectedOutfit.description}
                </p>
              )}
            </div>

            <h3 style={{ margin: "16px 0 10px", color: "#43291c", fontSize: 16 }}>Outfit Pieces</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
              {getFavoriteItems(selectedOutfit).map((piece, idx) => (
                <div key={idx} style={{ background: "#fff", border: "1px solid #ebd9c8", borderRadius: 12, padding: 8, textAlign: "center" }}>
                  {getFavoriteItemImage(piece) ? (
                    <img
                      src={getFavoriteItemImage(piece)}
                      alt={getFavoriteItemName(piece)}
                      style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginBottom: 6 }}
                    />
                  ) : (
                    <div style={{ height: 100, display: "grid", placeItems: "center", background: "#f8f0e7", borderRadius: 8, marginBottom: 6 }}>
                      <Shirt size={28} color="#bd8437" />
                    </div>
                  )}
                  <strong style={{ display: "block", fontSize: 12, color: "#43291c" }}>{getFavoriteItemName(piece)}</strong>
                  <small style={{ color: "#8a6f5c", fontSize: 11 }}>{piece.category} {piece.color ? `· ${piece.color}` : ""}</small>
                </div>
              ))}
            </div>

            <div className="details-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const id = getFavoriteOutfitId(selectedOutfit);
                  setSelectedOutfit(null);
                  removeFavorite(id);
                }}
              >
                <Trash2 size={17} />
                Remove from Favorites
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLOTHING MODAL */}
      {showAdd && (
        <div
          className="modal-backdrop"
          onClick={closeForm}
        >
          <form
            className="add-item-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeForm}
            >
              <X size={20} />
            </button>

            <span className="section-kicker">
              {editingItem
                ? "UPDATE YOUR COLLECTION"
                : "GROW YOUR COLLECTION"}
            </span>

            <h2>
              {editingItem ? "Edit clothing " : "Add clothing "}
              <em>item</em>
            </h2>

            <label>
              Item name
              <input
                required
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. White cotton shirt"
              />
            </label>

            <label>
              Category
              <select
                value={itemCategory}
                onChange={(event) => setItemCategory(event.target.value)}
              >
                {categories.slice(1).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              Color
              <input
                value={itemColor}
                onChange={(event) => setItemColor(event.target.value)}
                placeholder="e.g. Ivory, navy, black"
              />
            </label>

            <label className="upload-label">
              <ImagePlus size={20} />
              {itemImage
                ? "Change clothing photo"
                : "Upload a clothing photo"}

              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
              />
            </label>

            {itemImage && (
              <img
                className="upload-preview"
                src={itemImage}
                alt="Clothing preview"
              />
            )}

            <button
              className="primary-button modal-submit"
              type="submit"
              disabled={saving || loading}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  {editingItem
                    ? <Pencil size={18} />
                    : <Plus size={18} />}
                  {editingItem
                    ? "Update Clothing"
                    : "Save to Wardrobe"}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <footer className="footer">
        <div className="footer-brand">
          <span className="footer-mark">FR</span>
          <b>FitRoute</b>
        </div>

        <p>Style is personal. Make every outfit count.</p>

        <small>© 2026 FitRoute. All rights reserved.</small>
      </footer>
    </div>
  );
}
