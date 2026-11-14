
import { useState } from "react";
import { saveOutfitToDatabase, addOutfitToFavorites } from "./outfitApi";
import {
  Sparkles,
  Shirt,
  Heart,
  RefreshCw,
  BriefcaseBusiness,
  GraduationCap,
  PartyPopper,
  Coffee,
  Gem,
  CheckCircle2,
  ArrowRight,
  WandSparkles
} from "lucide-react";

import "./AIStylist.css";

// ==========================================
// OCCASIONS
// ==========================================

const occasions = [
  { name: "College", icon: GraduationCap },
  { name: "Office", icon: BriefcaseBusiness },
  { name: "Casual", icon: Coffee },
  { name: "Party", icon: PartyPopper },
  { name: "Wedding", icon: Gem }
];

// ==========================================
// PERSONAL STYLES
// ==========================================

const styles = [
  "Minimal",
  "Smart Casual",
  "Classic",
  "Streetwear",
  "Elegant"
];

// ==========================================
// WARDROBE ENHANCEMENT SUGGESTIONS
// ==========================================

const wardrobeSuggestions = {
  Tops: "A versatile top that coordinates with your selected outfit",
  Bottoms: "A complementary pair of trousers or jeans",
  Dresses: "A versatile dress for this occasion",
  Outerwear: "A jacket or layer to complete the look",
  Shoes: "Shoes that complement the outfit",
  Accessories: "A finishing accessory to complete the look"
};

// ==========================================
// COLOR MATCHING ENGINE
// ==========================================

function getColorFamily(color = "") {
  const value = String(color).toLowerCase().trim();

  const colors = {
    neutral: [
      "white", "black", "grey", "gray", "cream",
      "ivory", "beige", "sandal", "brown",
      "tan", "khaki", "charcoal"
    ],
    blue: ["blue", "navy", "sky blue", "denim"],
    green: ["green", "olive", "mint"],
    red: ["red", "maroon", "burgundy"],
    yellow: ["yellow", "mustard", "gold"],
    pink: ["pink", "rose"],
    purple: ["purple", "lavender"],
    orange: ["orange", "rust"]
  };

  for (const [family, shades] of Object.entries(colors)) {
    if (shades.some(shade => value.includes(shade))) {
      return family;
    }
  }

  return "unknown";
}

function getColorScore(colorA, colorB) {
  const a = getColorFamily(colorA);
  const b = getColorFamily(colorB);

  if (a === "unknown" || b === "unknown") return 1;

  if (a === "neutral" || b === "neutral") return 3;

  if (a === b) return 2;

  const combinations = [
    ["blue", "orange"],
    ["green", "red"],
    ["purple", "yellow"]
  ];

  if (
    combinations.some(
      pair => pair.includes(a) && pair.includes(b)
    )
  ) {
    return 3;
  }

  return 0;
}

// ==========================================
// OCCASION INTELLIGENCE
// ==========================================

function getOccasionScore(item, occasion, style) {
  const name = String(item.name || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();

  const text = `${name} ${category}`;

  const rules = {
    College: {
      positive: [
        "casual", "jean", "sneaker", "t-shirt",
        "shirt", "cotton", "comfortable"
      ],
      negative: ["tuxedo", "gown"]
    },
    Office: {
      positive: [
        "formal", "trouser", "blazer", "office",
        "oxford", "dress shirt", "leather shoe"
      ],
      negative: ["party", "beachwear", "flip flop"]
    },
    Casual: {
      positive: [
        "casual", "jean", "t-shirt", "sneaker",
        "cotton", "comfortable"
      ],
      negative: ["tuxedo", "formal gown"]
    },
    Party: {
      positive: [
        "party", "dress", "stylish", "elegant",
        "heels", "jacket", "accessory"
      ],
      negative: ["uniform", "sportswear"]
    },
    Wedding: {
      positive: [
        "wedding", "formal", "suit", "saree",
        "dress", "elegant", "traditional"
      ],
      negative: ["sportswear", "flip flop"]
    }
  };

  const selectedRules = rules[occasion];

  if (!selectedRules) return 0;

  let score = 0;

  selectedRules.positive.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  selectedRules.negative.forEach(keyword => {
    if (text.includes(keyword)) score -= 3;
  });

  if (style === "Elegant" && category === "dresses") {
    score += 2;
  }

  if (
    style === "Streetwear" &&
    /sneaker|hoodie|jean/.test(text)
  ) {
    score += 2;
  }

  if (
    style === "Classic" &&
    /formal|trouser|blazer|shirt/.test(text)
  ) {
    score += 2;
  }

  return score;
}

// ==========================================
// SMART CLOTHING SELECTION
// ==========================================

function pickBest(
  items,
  category,
  referenceColor = null,
  occasion = "College",
  style = "Smart Casual",
  excludedKeys = []
) {
  let matches = items.filter(
    item =>
      String(item.category || "").toLowerCase() ===
      category.toLowerCase()
  );

  if (!matches.length) return null;

  // Prefer items not used in previous outfits.
  const unusedMatches = matches.filter(
    item => !excludedKeys.includes(getItemKey(item))
  );

  if (unusedMatches.length) {
    matches = unusedMatches;
  }

  const ranked = matches.map(item => {
    const colorScore = referenceColor
      ? getColorScore(referenceColor, item.color)
      : 0;

    const occasionScore = getOccasionScore(
      item,
      occasion,
      style
    );

    return {
      item,
      score: colorScore + occasionScore
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const bestScore = ranked[0].score;

  const bestMatches = ranked.filter(
    candidate => candidate.score === bestScore
  );

  return bestMatches[
    Math.floor(Math.random() * bestMatches.length)
  ].item;
}

// ==========================================
// UNIQUE CLOTHING IDENTIFIER
// ==========================================

function getItemKey(item) {
  return String(
    item.id ??
    `${item.name || ""}-${item.category || ""}-${item.color || ""}-${item.image || ""}`
  );
}

function getOutfitSignature(outfit) {
  return outfit.pieces
    .map(getItemKey)
    .sort()
    .join("|");
}

// ==========================================
// OUTFIT GENERATOR
// ==========================================

function createOutfit(
  wardrobe,
  occasion,
  style,
  excludedKeys = []
) {
  const dress = pickBest(
    wardrobe, "Dresses", null, occasion, style, excludedKeys
  );

  const top = pickBest(
    wardrobe, "Tops", null, occasion, style, excludedKeys
  );

  const bottom = pickBest(
    wardrobe, "Bottoms", top?.color, occasion, style, excludedKeys
  );

  const baseColor =
    dress?.color || top?.color || bottom?.color || null;

  const outerwear = pickBest(
    wardrobe, "Outerwear", baseColor, occasion, style, excludedKeys
  );

  const shoes = pickBest(
    wardrobe, "Shoes", baseColor, occasion, style, excludedKeys
  );

  const accessory = pickBest(
    wardrobe, "Accessories", baseColor, occasion, style, excludedKeys
  );

  const pieces = [];

  if (dress) {
    pieces.push(dress);
  } else {
    if (top) pieces.push(top);
    if (bottom) pieces.push(bottom);
  }

  if (outerwear) pieces.push(outerwear);
  if (shoes) pieces.push(shoes);
  if (accessory) pieces.push(accessory);

  const missing = [];

  if (!dress && !top) missing.push("Tops");
  if (!dress && !bottom) missing.push("Bottoms");
  if (!shoes) missing.push("Shoes");

  if (
    ["Office", "Wedding", "Party"].includes(occasion) &&
    !outerwear
  ) {
    missing.push("Outerwear");
  }

  if (!accessory) missing.push("Accessories");

  // Generate intelligent, context-aware styling explanations
  const reasons = [];

  if (dress) {
    const dName = dress.name || "dress";
    const dColor = dress.color && dress.color !== "Not specified" ? `${dress.color} ` : "";
    reasons.push(
      `Features your ${dColor}${dName} as a standalone statement piece tailored for ${occasion.toLowerCase()} wear.`
    );
  } else if (top && bottom) {
    const tName = top.name || "top";
    const tColor = top.color && top.color !== "Not specified" ? `${top.color} ` : "";
    const bName = bottom.name || "bottom";
    const bColor = bottom.color && bottom.color !== "Not specified" ? `${bottom.color} ` : "";
    reasons.push(
      `Coordinates your ${tColor}${tName} with ${bColor}${bName} for an occasion-appropriate silhouette.`
    );
  }

  if (baseColor && baseColor !== "Not specified") {
    const family = getColorFamily(baseColor);
    if (family === "neutral") {
      reasons.push(
        `Anchored by neutral ${baseColor.toLowerCase()} tones for a clean, versatile aesthetic.`
      );
    } else {
      reasons.push(
        `Builds visual interest around ${baseColor.toLowerCase()} as the focal color of the outfit.`
      );
    }
  }

  reasons.push(
    `${style} styling principles ensure clean proportions aligned with ${occasion.toLowerCase()} dress codes.`
  );

  if (shoes) {
    const sName = shoes.name || "footwear";
    const sColor = shoes.color && shoes.color !== "Not specified" ? `${shoes.color} ` : "";
    reasons.push(
      `Completed with your ${sColor}${sName} for comfort and polish.`
    );
  } else if (missing.includes("Shoes")) {
    reasons.push(
      "Pair with neutral shoes from your collection to ground this look."
    );
  }

  return {
    id: Date.now(),
    occasion,
    style,
    pieces,
    missing: [...new Set(missing)],
    reasons,
    createdAt: new Date().toISOString()
  };
}

// ==========================================
// MAIN AI STYLIST COMPONENT
// ==========================================

export default function AIStylist({ items = [] }) {
  const [occasion, setOccasion] = useState("College");
  const [style, setStyle] = useState("Smart Casual");
  const [outfit, setOutfit] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // Stores previously generated combinations.
  // This history resets when the page is refreshed.
  const [generatedHistory, setGeneratedHistory] = useState([]);

  // ========================================
  // GENERATE A DIFFERENT OUTFIT
  // ========================================

  function generateOutfit() {
    if (!items.length) {
      setOutfit(null);
      setNotice(
        "Your wardrobe is empty. Add some clothing before generating an outfit."
      );
      return;
    }

    const previousSignatures = generatedHistory.map(
      getOutfitSignature
    );

    if (outfit) {
      const currentSignature = getOutfitSignature(outfit);
      if (!previousSignatures.includes(currentSignature)) {
        previousSignatures.push(currentSignature);
      }
    }

    const allSessionPieces = [
      ...(outfit?.pieces || []),
      ...generatedHistory.flatMap((o) => o.pieces || [])
    ];
    const uniqueUsedKeys = Array.from(new Set(allSessionPieces.map(getItemKey)));
    const recentKeys = (outfit?.pieces || []).map(getItemKey);

    let newOutfit = null;

    // Try multiple combinations to avoid repeats.
    for (let attempt = 0; attempt < 60; attempt++) {
      let excludedKeys;
      if (attempt === 0) {
        excludedKeys = recentKeys;
      } else if (uniqueUsedKeys.length <= 6) {
        excludedKeys = uniqueUsedKeys.filter(
          (_, idx) => ((attempt >> idx) & 1) === 1
        );
      } else {
        const offset = attempt % uniqueUsedKeys.length;
        const count = (Math.floor(attempt / uniqueUsedKeys.length) % 3) + 1;
        excludedKeys = [];
        for (let i = 0; i < count; i++) {
          excludedKeys.push(uniqueUsedKeys[(offset + i) % uniqueUsedKeys.length]);
        }
      }

      const candidate = createOutfit(
        items,
        occasion,
        style,
        excludedKeys
      );

      if (!candidate.pieces.length) {
        continue;
      }

      const signature = getOutfitSignature(candidate);

      if (!previousSignatures.includes(signature)) {
        newOutfit = candidate;
        break;
      }
    }

    if (!newOutfit) {
      setNotice(
        "You've explored all available outfit combinations. Add more clothing to discover new looks!"
      );
      return;
    }

    setOutfit(newOutfit);

    setGeneratedHistory(previous => [
      ...previous,
      newOutfit
    ]);

    setSaved(false);
    setNotice("");
  }

  // ========================================
  // SAVE OUTFIT TO MYSQL AND FAVORITES
  // ========================================

  async function saveOutfit() {
    if (!outfit || saving) return;

    if (!localStorage.getItem("fitroute-token")) {
      setNotice("Please log in before saving an outfit.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      // Save the outfit and its wardrobe pieces to MySQL.
      const result = await saveOutfitToDatabase(outfit);
      const outfitId = result?.outfitId;

      if (!outfitId) {
        throw new Error("The server did not return the saved outfit ID.");
      }

      // Add the newly saved outfit to this user's favorites.
      await addOutfitToFavorites(outfitId);

      setSaved(true);
      setNotice("Your outfit has been saved to your account and Favorites!");
    } catch (error) {
      console.error("Save outfit error:", error);
      setNotice(error.message || "Could not save this outfit. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // USER INTERFACE
  // ========================================

  return (
    <section className="stylist-page">

      <div className="stylist-heading">
        <div>
          <span className="stylist-kicker">
            <Sparkles size={15} />
            YOUR PERSONAL AI FASHION ASSISTANT
          </span>

          <h1>
            Meet Your <em>AI Stylist.</em>
          </h1>

          <p>
            Your wardrobe, your occasion, your style.
            Let us create a look that feels like you.
          </p>
        </div>

        <div className="stylist-heading-icon">
          <WandSparkles size={34} />
        </div>
      </div>

      <div className="stylist-layout">

        <div className="stylist-controls">

          <div className="stylist-panel">
            <span className="panel-step">01 / OCCASION</span>

            <h2>Where are you going?</h2>

            <p>Choose the occasion for your outfit.</p>

            <div className="occasion-grid">
              {occasions.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  className={
                    occasion === name
                      ? "occasion-option selected"
                      : "occasion-option"
                  }
                  onClick={() => setOccasion(name)}
                >
                  <Icon size={21} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="stylist-panel">
            <span className="panel-step">02 / PERSONAL STYLE</span>

            <h2>Choose your style</h2>

            <p>What kind of look do you prefer?</p>

            <div className="style-options">
              {styles.map(option => (
                <button
                  key={option}
                  className={
                    style === option
                      ? "style-option selected"
                      : "style-option"
                  }
                  onClick={() => setStyle(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="stylist-wardrobe-note">
            <Shirt size={22} />

            <div>
              <strong>
                {items.length} wardrobe items available
              </strong>

              <span>
                Your recommendations use your uploaded clothes.
              </span>
            </div>
          </div>

          <button
            className="generate-outfit-button"
            onClick={generateOutfit}
          >
            <Sparkles size={19} />
            Generate My Outfit
            <ArrowRight size={19} />
          </button>

        </div>

        <div className="stylist-results">

          {!outfit ? (
            <div className="stylist-empty">

              <div className="stylist-empty-icon">
                <WandSparkles size={38} />
              </div>

              <span className="panel-step">
                YOUR NEXT LOOK STARTS HERE
              </span>

              <h2>Let's create something beautiful.</h2>

              <p>
                Select an occasion and style, then generate an outfit
                using your own wardrobe.
              </p>

              {notice && (
                <div className="stylist-notice">
                  {notice}
                </div>
              )}

            </div>
          ) : (

            <div className="outfit-result">

              <div className="outfit-result-heading">
                <div>
                  <span className="panel-step">
                    YOUR PERSONAL LOOK
                  </span>

                  <h2>
                    {outfit.occasion} <em>Edit.</em>
                  </h2>

                  <p>
                    {outfit.style} · {outfit.pieces.length} selected pieces
                  </p>
                </div>

                <span className="outfit-sparkle">
                  <Sparkles size={23} />
                </span>
              </div>

              <div className="outfit-piece-grid">
                {outfit.pieces.map((piece, index) => (
                  <article
                    className="outfit-piece"
                    key={`${getItemKey(piece)}-${index}`}
                  >
                    <div className="outfit-piece-image">
                      {piece.image ? (
                        <img
                          src={piece.image}
                          alt={piece.name}
                        />
                      ) : (
                        <Shirt size={36} />
                      )}
                    </div>

                    <div className="outfit-piece-info">
                      <strong>{piece.name}</strong>

                      <span>
                        {piece.category} · {piece.color}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="stylist-explanation">
                <h3>
                  <Sparkles size={18} />
                  Why this look works
                </h3>

                {outfit.reasons.map((reason, index) => (
                  <p key={index}>
                    <CheckCircle2 size={16} />
                    {reason}
                  </p>
                ))}
              </div>

              <div className="gap-analysis-section">

                <div className="gap-analysis-heading">
                  <Sparkles size={20} />

                  <div>
                    <h3>Style Enhancement Suggestions</h3>

                    <p>
                      Wardrobe pieces that would complement this look.
                    </p>
                  </div>
                </div>

                {outfit.missing.length ? (
                  <div className="gap-analysis-ideas">
                    {outfit.missing.map(category => (
                      <div
                        className="gap-analysis-idea"
                        key={category}
                      >
                        <div>
                          <strong>{category}</strong>

                          <span>
                            {wardrobeSuggestions[category]}
                          </span>
                        </div>

                        <Shirt size={18} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="complete-message">
                    Your wardrobe has all the essential pieces for this look!
                  </p>
                )}

                <small className="gap-analysis-tip">
                  Tip: Adding complementary pieces to your wardrobe expands your styling options.
                </small>

              </div>

              <div className="outfit-actions">

                <button
                  className="save-outfit-button"
                  onClick={saveOutfit}
                  disabled={saving || saved}
                >
                  <Heart
                    size={18}
                    fill={saved ? "currentColor" : "none"}
                  />

                  {saving ? "Saving..." : saved ? "Saved to Favorites" : "Save This Look"}
                </button>

                <button
                  className="regenerate-button"
                  onClick={generateOutfit}
                >
                  <RefreshCw size={18} />
                  Try Another Look
                </button>

              </div>

              {notice && (
                <div className="stylist-notice">
                  {notice}
                </div>
              )}

              <p className="outfit-history-count">
                <Sparkles size={14} />
                {generatedHistory.length} unique looks generated this session
              </p>

            </div>
          )}

        </div>

      </div>

    </section>
  );
}
