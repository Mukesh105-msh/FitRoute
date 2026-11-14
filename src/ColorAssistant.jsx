import { useMemo, useState } from "react";
import {
  Palette,
  Sparkles,
  Shirt,
  CheckCircle2,
  RefreshCw,
  Info
} from "lucide-react";
import "./ColorAssistant.css";

const COLOR_DATA = {
  black: {
    hex: "#222222",
    matches: ["White", "Beige", "Grey", "Burgundy", "Olive"],
    palette: ["#FFFFFF", "#D8C3A5", "#888888", "#800020", "#708238"]
  },
  white: {
    hex: "#F7F5F0",
    matches: ["Black", "Navy", "Beige", "Olive", "Brown"],
    palette: ["#222222", "#1D3557", "#D8C3A5", "#708238", "#795548"]
  },
  navy: {
    hex: "#1D3557",
    matches: ["White", "Beige", "Grey", "Light Blue", "Burgundy"],
    palette: ["#FFFFFF", "#D8C3A5", "#888888", "#8ECAE6", "#800020"]
  },
  blue: {
    hex: "#3977B8",
    matches: ["White", "Grey", "Black", "Beige", "Navy"],
    palette: ["#FFFFFF", "#888888", "#222222", "#D8C3A5", "#1D3557"]
  },
  red: {
    hex: "#C0392B",
    matches: ["Black", "White", "Beige", "Navy", "Grey"],
    palette: ["#222222", "#FFFFFF", "#D8C3A5", "#1D3557", "#888888"]
  },
  green: {
    hex: "#557A46",
    matches: ["White", "Beige", "Brown", "Black", "Cream"],
    palette: ["#FFFFFF", "#D8C3A5", "#795548", "#222222", "#F5EBDD"]
  },
  olive: {
    hex: "#708238",
    matches: ["White", "Black", "Beige", "Brown", "Navy"],
    palette: ["#FFFFFF", "#222222", "#D8C3A5", "#795548", "#1D3557"]
  },
  beige: {
    hex: "#D8C3A5",
    matches: ["White", "Brown", "Black", "Navy", "Olive"],
    palette: ["#FFFFFF", "#795548", "#222222", "#1D3557", "#708238"]
  },
  brown: {
    hex: "#795548",
    matches: ["Cream", "Beige", "White", "Olive", "Black"],
    palette: ["#F5EBDD", "#D8C3A5", "#FFFFFF", "#708238", "#222222"]
  },
  grey: {
    hex: "#888888",
    matches: ["White", "Black", "Navy", "Pink", "Burgundy"],
    palette: ["#FFFFFF", "#222222", "#1D3557", "#E8A6B8", "#800020"]
  },
  pink: {
    hex: "#E8A6B8",
    matches: ["White", "Grey", "Navy", "Beige", "Black"],
    palette: ["#FFFFFF", "#888888", "#1D3557", "#D8C3A5", "#222222"]
  },
  yellow: {
    hex: "#E5BD45",
    matches: ["White", "Navy", "Black", "Brown", "Olive"],
    palette: ["#FFFFFF", "#1D3557", "#222222", "#795548", "#708238"]
  },
  purple: {
    hex: "#8056A5",
    matches: ["White", "Black", "Grey", "Beige", "Navy"],
    palette: ["#FFFFFF", "#222222", "#888888", "#D8C3A5", "#1D3557"]
  },
  cream: {
    hex: "#F5EBDD",
    matches: ["Brown", "Olive", "Navy", "Black", "Burgundy"],
    palette: ["#795548", "#708238", "#1D3557", "#222222", "#800020"]
  }
};

const COLOR_NAMES = Object.keys(COLOR_DATA);

function normalizeColor(value = "") {
  const color = value.toLowerCase().trim();

  if (color.includes("navy") || color.includes("dark blue")) return "navy";
  if (color.includes("blue")) return "blue";
  if (color.includes("black")) return "black";
  if (color.includes("white")) return "white";
  if (color.includes("red") || color.includes("maroon")) return "red";
  if (color.includes("green")) return "green";
  if (color.includes("olive")) return "olive";
  if (color.includes("beige") || color.includes("tan")) return "beige";
  if (color.includes("brown")) return "brown";
  if (color.includes("grey") || color.includes("gray")) return "grey";
  if (color.includes("pink")) return "pink";
  if (color.includes("yellow")) return "yellow";
  if (color.includes("purple") || color.includes("violet")) return "purple";
  if (color.includes("cream") || color.includes("ivory")) return "cream";

  return null;
}

export default function ColorAssistant({ items = [] }) {
  const [selectedColor, setSelectedColor] = useState("navy");
  const [selectedItemId, setSelectedItemId] = useState("manual");
  const [combinationType, setCombinationType] = useState("balanced");
  const [copiedPalette, setCopiedPalette] = useState(false);

  const wardrobeColors = useMemo(() => {
    const unique = new Map();

    items.forEach((item) => {
      const key = normalizeColor(item.color || "");

      if (key && !unique.has(key)) {
        unique.set(key, item);
      }
    });

    return Array.from(unique.entries()).map(([color, item]) => ({
      color,
      item
    }));
  }, [items]);

  const selectedData = COLOR_DATA[selectedColor] || COLOR_DATA.navy;

  const suggestions = useMemo(() => {
    let names = [...selectedData.matches];

    if (combinationType === "neutral") {
      names = names.filter((name) =>
        ["White", "Black", "Beige", "Grey", "Cream", "Brown"].includes(name)
      );
    }

    if (combinationType === "bold") {
      names = names.filter((name) =>
        ["Burgundy", "Olive", "Navy", "Pink", "Yellow", "Green"].includes(name)
      );
    }

    return names;
  }, [selectedData, combinationType]);

  const wardrobeMatches = useMemo(() => {
    const matchingColors = suggestions.map((name) => normalizeColor(name));

    return items.filter((item) => {
      const itemColor = normalizeColor(item.color || "");
      return itemColor && matchingColors.includes(itemColor);
    });
  }, [items, suggestions]);

  function chooseWardrobeItem(item) {
    const color = normalizeColor(item.color || "");
    if (!color) return;

    setSelectedColor(color);
    setSelectedItemId(String(item.id));
  }

  function chooseManualColor(color) {
    setSelectedColor(color);
    setSelectedItemId("manual");
  }

  async function copyPalette() {
    const text = [
      selectedColor,
      ...suggestions.map((name) => name.toLowerCase())
    ].join(", ");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedPalette(true);
      window.setTimeout(() => setCopiedPalette(false), 1800);
    } catch {
      window.alert("Unable to copy the palette in this browser.");
    }
  }

  return (
    <section className="color-assistant-page">
      <div className="color-assistant-heading">
        <div>
          <span className="color-kicker">
            YOUR PERSONAL COLOR STUDIO
          </span>
          <h1>Color <em>Combination.</em></h1>
          <p>
            Discover colors that work beautifully together and create
            balanced outfits from your own wardrobe.
          </p>
        </div>

        <div className="color-heading-icon">
          <Palette size={30} />
        </div>
      </div>

      <div className="color-assistant-layout">
        <aside className="color-selection-panel">
          <div className="color-panel-title">
            <span className="color-icon-box">
              <Palette size={19} />
            </span>
            <div>
              <h2>Choose your base color</h2>
              <p>Start with a color you want to wear.</p>
            </div>
          </div>

          <div className="color-picker-grid">
            {COLOR_NAMES.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-picker-option ${
                  selectedColor === color ? "selected" : ""
                }`}
                onClick={() => chooseManualColor(color)}
                title={color}
                aria-label={`Choose ${color}`}
              >
                <span
                  className="color-picker-circle"
                  style={{ backgroundColor: COLOR_DATA[color].hex }}
                >
                  {selectedColor === color && (
                    <CheckCircle2 size={19} color={
                      ["white", "cream", "yellow", "beige"].includes(color)
                        ? "#533321"
                        : "#FFFFFF"
                    } />
                  )}
                </span>
                <span>{color}</span>
              </button>
            ))}
          </div>

          <div className="color-divider" />

          <h3 className="wardrobe-color-heading">
            Choose from your wardrobe
          </h3>

          {wardrobeColors.length > 0 ? (
            <div className="wardrobe-color-list">
              {wardrobeColors.map(({ color, item }) => (
                <button
                  type="button"
                  key={item.id}
                  className={`wardrobe-color-item ${
                    selectedItemId === String(item.id) ? "selected" : ""
                  }`}
                  onClick={() => chooseWardrobeItem(item)}
                >
                  <span
                    className="wardrobe-color-dot"
                    style={{ backgroundColor: COLOR_DATA[color].hex }}
                  />
                  <span className="wardrobe-color-copy">
                    <strong>{item.name}</strong>
                    <small>{item.color}</small>
                  </span>
                  <span className="wardrobe-color-category">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="color-empty-note">
              Add clothing with color details to use your wardrobe here.
            </p>
          )}
        </aside>

        <div className="color-results-panel">
          <div className="color-result-top">
            <div>
              <span className="color-kicker">YOUR BASE COLOR</span>
              <h2>{selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}</h2>
              <p>Explore a palette designed around this color.</p>
            </div>

            <div
              className="selected-color-preview"
              style={{ backgroundColor: selectedData.hex }}
            />
          </div>

          <div className="combination-controls">
            <label htmlFor="combination-type">Combination mood</label>
            <select
              id="combination-type"
              value={combinationType}
              onChange={(event) => setCombinationType(event.target.value)}
            >
              <option value="balanced">Balanced &amp; versatile</option>
              <option value="neutral">Soft &amp; neutral</option>
              <option value="bold">Bold &amp; expressive</option>
            </select>
          </div>

          <div className="suggested-colors-heading">
            <div>
              <h3>Recommended color palette</h3>
              <p>Colors that complement your selected base.</p>
            </div>
            <button
              type="button"
              className="copy-palette-button"
              onClick={copyPalette}
            >
              {copiedPalette ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
              {copiedPalette ? "Copied" : "Copy palette"}
            </button>
          </div>

          <div className="suggested-color-grid">
            {suggestions.map((name) => {
              const key = normalizeColor(name);
              const colorInfo = COLOR_DATA[key];

              return (
                <div className="suggested-color-card" key={name}>
                  <span
                    className="suggested-color-swatch"
                    style={{ backgroundColor: colorInfo?.hex || "#CCCCCC" }}
                  />
                  <strong>{name}</strong>
                  <small>Matching color</small>
                </div>
              );
            })}
          </div>

          <div className="outfit-color-preview">
            <div className="outfit-preview-heading">
              <div>
                <span className="color-kicker">STYLE VISUALIZER</span>
                <h3>Color combination preview</h3>
              </div>
              <Sparkles size={21} />
            </div>

            <div className="combination-preview-swatches">
              <div
                className="combination-main-swatch"
                style={{ backgroundColor: selectedData.hex }}
              >
                <span>BASE</span>
              </div>

              {suggestions.slice(0, 3).map((name) => {
                const key = normalizeColor(name);

                return (
                  <div
                    className="combination-small-swatch"
                    key={name}
                    style={{ backgroundColor: COLOR_DATA[key]?.hex || "#CCCCCC" }}
                  >
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>

            <p className="combination-tip">
              <Info size={16} />
              Try using your base color for the main clothing piece and
              one or two suggested colors for the rest of your outfit.
            </p>
          </div>

          <div className="wardrobe-matches-section">
            <div className="wardrobe-matches-heading">
              <div>
                <span className="color-kicker">FROM YOUR COLLECTION</span>
                <h3>Matching wardrobe pieces</h3>
              </div>
              <span className="matching-count">
                {wardrobeMatches.length} found
              </span>
            </div>

            {wardrobeMatches.length > 0 ? (
              <div className="matching-wardrobe-grid">
                {wardrobeMatches.map((item) => (
                  <article className="matching-wardrobe-card" key={item.id}>
                    <div className="matching-item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="matching-item-placeholder">
                          <Shirt size={30} />
                        </div>
                      )}
                    </div>
                    <div className="matching-item-info">
                      <strong>{item.name}</strong>
                      <span>{item.category} · {item.color}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-matching-wardrobe">
                <Shirt size={27} />
                <strong>No matching colors found yet</strong>
                <p>
                  Add more clothing colors to your wardrobe to see matching pieces here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="color-assistant-disclaimer">
        <Sparkles size={17} />
        Color suggestions are style guidelines. Personal preference,
        lighting, fabric, and occasion can change how colors look together.
      </div>
    </section>
  );
}