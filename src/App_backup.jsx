import { useState } from "react";
import {
  Shirt,
  Heart,
  Sparkles,
  UserRound,
  Bell,
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
  Menu,
  X,
  Plus,
  Search,
  Trash2,
  ImagePlus,
  Pencil
} from "lucide-react";

import AIStylist from "./AIStylist";
import "./App.css";

// KEEP YOUR EXISTING FASHION_IMAGE DECLARATION ABOVE THIS COMPONENT.
const FASHION_IMAGE = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&auto=format&fit=crop";

export default function App() {
  const [activePage, setActivePage] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("fitroute-wardrobe") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [category, setCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("Tops");
  const [itemColor, setItemColor] = useState("");
  const [itemImage, setItemImage] = useState("");

  const categories = [
    "All",
    "Tops",
    "Bottoms",
    "Dresses",
    "Outerwear",
    "Shoes",
    "Accessories"
  ];

  function saveItems(nextItems) {
    setItems(nextItems);
    localStorage.setItem(
      "fitroute-wardrobe",
      JSON.stringify(nextItems)
    );
  }

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

  function handleSubmit(event) {
    event.preventDefault();

    if (!itemName.trim()) {
      window.alert("Please enter a clothing item name.");
      return;
    }

    if (editingItem) {
      const updatedItems = items.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              name: itemName.trim(),
              category: itemCategory,
              color: itemColor.trim() || "Not specified",
              image: itemImage
            }
          : item
      );

      saveItems(updatedItems);
    } else {
      const newItem = {
        id: Date.now(),
        name: itemName.trim(),
        category: itemCategory,
        color: itemColor.trim() || "Not specified",
        image: itemImage
      };

      saveItems([newItem, ...items]);
    }

    closeForm();
  }

  function deleteItem(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this clothing item?"
    );

    if (!confirmed) return;

    saveItems(items.filter(item => item.id !== id));
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

  const visibleItems = items.filter(item =>
    (category === "All" || item.category === category) &&
    (
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.color || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const navItems = [
    { label: "Home" },
    { label: "My Wardrobe", icon: Shirt },
    { label: "AI Stylist", icon: Sparkles },
    { label: "Favorites", icon: Heart }
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
  }

  const savedOutfits = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("fitroute-favorites") || "[]"
      );
    } catch {
      return [];
    }
  })();

  function removeFavorite(id) {
    const updated = savedOutfits.filter(outfit => outfit.id !== id);

    localStorage.setItem(
      "fitroute-favorites",
      JSON.stringify(updated)
    );
    setFavoritesVersion(version => version + 1);

    setActivePage("Favorites");
    window.dispatchEvent(new Event("fitroute-favorites-updated"));
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

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${
                activePage === label ? "active" : ""
              }`}
              onClick={() => navigate(label)}
            >
              {Icon && <Icon size={18} />}
              {label}
            </button>
          ))}
        </nav>

        <div className="header-actions">

          <button
            className="icon-button notification"
            aria-label="Notifications"
            onClick={() => window.alert("You are all caught up!")}
          >
            <Bell size={21} />
            <span className="notification-dot" />
          </button>

          <button
            className="profile-button"
            aria-label="Profile"
            onClick={() => window.alert("Profile coming soon.")}
          >
            <UserRound size={21} />
          </button>

          <button
            className="mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

        </div>
      </header>

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
              >
                <Plus size={19} />
                Add Clothing
              </button>
            </div>

            <div className="wardrobe-summary">

              <div>
                <span className="summary-number">{items.length}</span>
                <span>Total items</span>
              </div>

              <div>
                <span className="summary-number">
                  {new Set(items.map(item => item.category)).size}
                </span>
                <span>Categories</span>
              </div>

              <div>
                <span className="summary-number">
                  {items.filter(item => item.image).length}
                </span>
                <span>With photos</span>
              </div>

            </div>

            <div className="wardrobe-toolbar">

              <div className="wardrobe-search">
                <Search size={18} />

                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search clothing or color..."
                />
              </div>

              <div className="category-filters">
                {categories.map(c => (
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

            {visibleItems.length > 0 ? (

              <div className="wardrobe-grid">

                {visibleItems.map(item => (

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
  onClick={event => event.stopPropagation()}
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

          /* AI STYLIST */

          <AIStylist items={items} />

        ) : activePage === "Favorites" ? (

          /* FAVORITES */

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

            {savedOutfits.length > 0 ? (

              <div className="wardrobe-grid">

                {savedOutfits.map(outfit => (

                  <article className="clothing-card" key={outfit.id}>

                    <div className="clothing-photo favorite-photo">

                      {outfit.pieces?.[0]?.image ? (
                        <img
                          src={outfit.pieces[0].image}
                          alt="Saved outfit"
                        />
                      ) : (
                        <div className="clothing-placeholder">
                          <Heart size={42} />
                          <span>Saved outfit</span>
                        </div>
                      )}

                      <button
                        className="delete-item"
                        title="Remove favorite"
                        onClick={() => removeFavorite(outfit.id)}
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                    <div className="clothing-info">
                      <div>
                        <h3>{outfit.occasion} Look</h3>
                        <p>{outfit.style}</p>
                      </div>

                      <span className="color-label">
                        {outfit.pieces?.length || 0} pieces
                      </span>
                    </div>

                  </article>

                ))}

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
                    alt="Headless mannequin wearing a luxury outfit"
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
      onClick={event => event.stopPropagation()}
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
          onClick={() => {
            const id = selectedItem.id;
            closeDetails();
            deleteItem(id);
          }}
        >
          <Trash2 size={17} />
          Delete Item
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
            onClick={e => e.stopPropagation()}
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
                onChange={e => setItemName(e.target.value)}
                placeholder="e.g. White cotton shirt"
              />
            </label>

            <label>
              Category
              <select
                value={itemCategory}
                onChange={e => setItemCategory(e.target.value)}
              >
                {categories.slice(1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              Color
              <input
                value={itemColor}
                onChange={e => setItemColor(e.target.value)}
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
            >
              {editingItem ? <Pencil size={18} /> : <Plus size={18} />}
              {editingItem ? "Update Clothing" : "Save to Wardrobe"}
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