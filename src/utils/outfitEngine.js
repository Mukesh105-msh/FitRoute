// src/utils/outfitEngine.js

export const FITROUTE_OCCASIONS = [
  "College",
  "Office",
  "Casual",
  "Party",
  "Wedding"
];

export const FITROUTE_STYLES = [
  "Minimal",
  "Smart Casual",
  "Classic",
  "Streetwear",
  "Elegant"
];

function getColorFamily(color = "") {
  const value = String(color).toLowerCase();

  const groups = {
    neutral: ["white", "black", "grey", "gray", "cream", "ivory", "beige", "brown", "tan", "khaki"],
    blue: ["blue", "navy", "denim"],
    green: ["green", "olive", "mint"],
    red: ["red", "maroon", "burgundy"],
    yellow: ["yellow", "mustard", "gold"],
    pink: ["pink", "rose"],
    purple: ["purple", "lavender"],
    orange: ["orange", "rust"]
  };

  for (const [family, shades] of Object.entries(groups)) {
    if (shades.some((shade) => value.includes(shade))) {
      return family;
    }
  }

  return "unknown";
}

function getColorScore(first, second) {
  const a = getColorFamily(first);
  const b = getColorFamily(second);

  if (a === "unknown" || b === "unknown") return 1;
  if (a === "neutral" || b === "neutral") return 3;
  if (a === b) return 2;

  const complementary = [
    ["blue", "orange"],
    ["green", "red"],
    ["purple", "yellow"]
  ];

  if (complementary.some((pair) => pair.includes(a) && pair.includes(b))) {
    return 3;
  }

  return 0;
}

function getOccasionScore(item, occasion, style) {
  const text = `${item.name || ""} ${item.category || ""}`.toLowerCase();

  const rules = {
    College: {
      positive: ["casual", "jean", "sneaker", "t-shirt", "shirt", "cotton", "comfortable"],
      negative: ["tuxedo", "gown"]
    },
    Office: {
      positive: ["formal", "trouser", "blazer", "office", "oxford", "shirt"],
      negative: ["party", "beachwear", "flip flop"]
    },
    Casual: {
      positive: ["casual", "jean", "t-shirt", "sneaker", "cotton", "comfortable"],
      negative: ["tuxedo", "formal gown"]
    },
    Party: {
      positive: ["party", "dress", "stylish", "elegant", "heels", "jacket"],
      negative: ["uniform", "sportswear"]
    },
    Wedding: {
      positive: ["wedding", "formal", "suit", "saree", "dress", "elegant", "traditional"],
      negative: ["sportswear", "flip flop"]
    }
  };

  const selected = rules[occasion];
  if (!selected) return 0;

  let score = 0;

  selected.positive.forEach((word) => {
    if (text.includes(word)) score += 2;
  });

  selected.negative.forEach((word) => {
    if (text.includes(word)) score -= 3;
  });

  if (style === "Elegant" && text.includes("dress")) score += 2;
  if (style === "Streetwear" && /sneaker|hoodie|jean/.test(text)) score += 2;
  if (style === "Classic" && /formal|trouser|blazer|shirt/.test(text)) score += 2;

  return score;
}

export function getItemKey(item) {
  return String(
    item?.id ??
    `${item?.name || ""}-${item?.category || ""}-${item?.color || ""}-${item?.image || ""}`
  );
}

export function getOutfitSignature(outfit) {
  return (outfit?.pieces || [])
    .map(getItemKey)
    .sort()
    .join("|");
}

function pickBest(items, category, referenceColor, occasion, style, usedKeys) {
  let matches = items.filter(
    (item) =>
      String(item.category || "").toLowerCase() === category.toLowerCase()
  );

  if (!matches.length) return null;

  const unused = matches.filter((item) => !usedKeys.has(getItemKey(item)));
  if (unused.length) matches = unused;

  const ranked = matches
    .map((item) => ({
      item,
      score:
        (referenceColor ? getColorScore(referenceColor, item.color) : 0) +
        getOccasionScore(item, occasion, style)
    }))
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0].score;
  const best = ranked.filter((entry) => entry.score === bestScore);

  return best[Math.floor(Math.random() * best.length)].item;
}

export function generateWardrobeOutfit(
  wardrobe = [],
  occasion = "Casual",
  style = "Smart Casual",
  previouslyUsedSignatures = []
) {
  if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
    return {
      id: `outfit-${Date.now()}`,
      occasion,
      style,
      pieces: [],
      missing: ["Add clothing to your wardrobe first."],
      reasons: [],
      createdAt: new Date().toISOString()
    };
  }

  const usedKeys = new Set();

  const buildCandidate = () => {
    const dress = pickBest(wardrobe, "Dresses", null, occasion, style, usedKeys);
    const top = pickBest(wardrobe, "Tops", null, occasion, style, usedKeys);
    const bottom = pickBest(wardrobe, "Bottoms", top?.color, occasion, style, usedKeys);

    const baseColor = dress?.color || top?.color || bottom?.color || null;

    const outerwear = pickBest(wardrobe, "Outerwear", baseColor, occasion, style, usedKeys);
    const shoes = pickBest(wardrobe, "Shoes", baseColor, occasion, style, usedKeys);
    const accessory = pickBest(wardrobe, "Accessories", baseColor, occasion, style, usedKeys);

    const pieces = dress
      ? [dress]
      : [top, bottom].filter(Boolean);

    [outerwear, shoes, accessory].forEach((item) => {
      if (item) pieces.push(item);
    });

    const missing = [];

    if (!dress && !top) missing.push("Tops");
    if (!dress && !bottom) missing.push("Bottoms");
    if (!shoes) missing.push("Shoes");

    if (["Office", "Wedding", "Party"].includes(occasion) && !outerwear) {
      missing.push("Outerwear");
    }

    if (!accessory) missing.push("Accessories");

    return {
      id: `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occasion,
      style,
      pieces,
      missing,
      reasons: [
        `Selected for your ${occasion.toLowerCase()} plans.`,
        `${style} styling guides the outfit direction.`,
        "Color compatibility is considered when selecting clothing.",
        "Every selected piece comes from your own wardrobe."
      ],
      createdAt: new Date().toISOString()
    };
  };

  let bestCandidate = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = buildCandidate();

    if (!candidate.pieces.length) continue;

    const signature = getOutfitSignature(candidate);

    if (!previouslyUsedSignatures.includes(signature)) {
      bestCandidate = candidate;
      break;
    }

    bestCandidate = candidate;
  }

  return bestCandidate;
}