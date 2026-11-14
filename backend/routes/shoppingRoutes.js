
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/shopping/products
// Supports search, filters, sorting and pagination.
router.get("/products", async (req, res) => {
  try {
    const {
      search = "",
      gender = "",
      category = "",
      occasion = "",
      style = "",
      provider = "",
      minPrice = "",
      maxPrice = "",
      sort = "recommended",
      page = "1",
      limit = "12"
    } = req.query;

    const conditions = ["is_available = TRUE"];
    const values = [];

    if (search.trim()) {
      conditions.push("(product_name LIKE ? OR description LIKE ?)");
      values.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (gender.trim()) {
      conditions.push("gender = ?");
      values.push(gender.trim());
    }

    if (category.trim()) {
      conditions.push("category = ?");
      values.push(category.trim());
    }

    if (occasion.trim()) {
      conditions.push("occasion = ?");
      values.push(occasion.trim());
    }

    if (style.trim()) {
      conditions.push("style = ?");
      values.push(style.trim());
    }

    if (provider.trim()) {
      conditions.push("provider = ?");
      values.push(provider.trim());
    }

    if (minPrice !== "") {
      const minimum = Number(minPrice);

      if (!Number.isFinite(minimum) || minimum < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum price must be a valid non-negative number."
        });
      }

      conditions.push("price >= ?");
      values.push(minimum);
    }

    if (maxPrice !== "") {
      const maximum = Number(maxPrice);

      if (!Number.isFinite(maximum) || maximum < 0) {
        return res.status(400).json({
          success: false,
          message: "Maximum price must be a valid non-negative number."
        });
      }

      conditions.push("price <= ?");
      values.push(maximum);
    }

    if (minPrice !== "" && maxPrice !== "" &&
        Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot exceed maximum price."
      });
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNumber - 1) * pageSize;

    // Only allow known SQL sort expressions.
    const sortOptions = {
      recommended: "is_verified DESC, created_at DESC",
      price_low: "price ASC",
      price_high: "price DESC",
      newest: "created_at DESC",
      name: "product_name ASC"
    };

    if (!sortOptions[sort]) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort option.",
        allowedSortOptions: Object.keys(sortOptions)
      });
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM shopping_products
       WHERE ${whereClause}`,
      values
    );

    const [products] = await db.query(
      `SELECT
         id,
         provider,
         external_id,
         product_name,
         description,
         category,
         gender,
         occasion,
         style,
         price,
         original_price,
         currency,
         image_url,
         product_url,
         is_available,
         is_verified,
         created_at
       FROM shopping_products
       WHERE ${whereClause}
       ORDER BY ${sortOptions[sort]}
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    const total = Number(countRows[0].total);

    return res.json({
      success: true,
      message: "Shopping products fetched successfully.",
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      products
    });
  } catch (error) {
    console.error("Shopping products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shopping products."
    });
  }
});

// GET /api/shopping/filters
// Returns available filter values from the database.
router.get("/filters", async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT DISTINCT category
       FROM shopping_products
       WHERE is_available = TRUE
       ORDER BY category`
    );

    const [genders] = await db.query(
      `SELECT DISTINCT gender
       FROM shopping_products
       WHERE is_available = TRUE
       ORDER BY gender`
    );

    const [occasions] = await db.query(
      `SELECT DISTINCT occasion
       FROM shopping_products
       WHERE is_available = TRUE
         AND occasion IS NOT NULL
       ORDER BY occasion`
    );

    const [styles] = await db.query(
      `SELECT DISTINCT style
       FROM shopping_products
       WHERE is_available = TRUE
         AND style IS NOT NULL
       ORDER BY style`
    );

    const [providers] = await db.query(
      `SELECT DISTINCT provider
       FROM shopping_products
       WHERE is_available = TRUE
       ORDER BY provider`
    );

    return res.json({
      success: true,
      filters: {
        categories: categories.map((row) => row.category),
        genders: genders.map((row) => row.gender),
        occasions: occasions.map((row) => row.occasion),
        styles: styles.map((row) => row.style),
        providers: providers.map((row) => row.provider)
      }
    });
  } catch (error) {
    console.error("Shopping filters error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load shopping filters."
    });
  }
});

// GET /api/shopping/products/:id
// Returns one product by its database ID.
router.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID."
      });
    }

    const [products] = await db.query(
      `SELECT
         id,
         provider,
         external_id,
         product_name,
         description,
         category,
         gender,
         occasion,
         style,
         price,
         original_price,
         currency,
         image_url,
         product_url,
         is_available,
         is_verified,
         created_at
       FROM shopping_products
       WHERE id = ? AND is_available = TRUE
       LIMIT 1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    return res.json({
      success: true,
      product: products[0]
    });
  } catch (error) {
    console.error("Shopping product details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product details."
    });
  }
});

module.exports = router;
