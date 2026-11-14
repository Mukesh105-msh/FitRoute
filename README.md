# FitRoute — AI-Powered Fashion & Digital Wardrobe Platform

FitRoute is a full-stack digital wardrobe and intelligent fashion platform. It enables users to digitize their physical clothing collections, generate personalized outfit combinations using contextual styling rules, plan weekly outfits with MySQL persistence, track wear history, explore color harmonies, save favorite looks, and gain data-driven insights into wardrobe utilization.

---

## Architecture Overview

```
FitRoute Architecture
├── Frontend (React 19 + Vite)
│   ├── Digital Wardrobe Manager (CRUD, filters, category/color grouping)
│   ├── AI Stylist (Contextual outfit generator, subset-rotation engine)
│   ├── Weekly Planner (7-day calendar, MySQL sync, offline fallback)
│   ├── Outfit Wear History (Wear logging, usage tracking, most/never worn)
│   ├── Color Assistant (Color family harmonies, wardrobe color matching)
│   ├── Favorites & Outfits (Saved looks, details modal, removal)
│   ├── Wardrobe Analytics (Utilization metrics, category breakdown)
│   ├── Shopping Studio (Fashion marketplace with demo disclaimer)
│   ├── User Profile & Preferences (Account details, style preference chips)
│   └── Virtual Try-On (Roadmap stub with third-party provider integration guide)
│
├── Backend (Node.js + Express 5)
│   ├── JWT Authentication & Google OAuth 2.0 (Passport.js)
│   ├── User Isolation Middleware (req.user enforcement on all private endpoints)
│   ├── Wardrobe API (/api/wardrobe)
│   ├── Outfit Management API (/api/outfits)
│   ├── Weekly Planner API (/api/planner)
│   ├── Wear History API (/api/wear)
│   ├── Profile & Preferences API (/api/profile)
│   ├── Shopping Catalog API (/api/shopping)
│   └── System Health API (/api/health)
│
└── Database (MySQL 8 / mysql2/promise)
    ├── users
    ├── wardrobe_items (FK -> users ON DELETE CASCADE)
    ├── outfits (FK -> users ON DELETE CASCADE)
    ├── outfit_items (FK -> outfits ON DELETE CASCADE, FK -> wardrobe_items ON DELETE SET NULL)
    ├── favorites (FK -> users ON DELETE CASCADE, FK -> outfits ON DELETE CASCADE)
    ├── weekly_plans (FK -> users ON DELETE CASCADE, FK -> outfits ON DELETE SET NULL)
    ├── outfit_wear_history (FK -> users ON DELETE CASCADE, FK -> outfits ON DELETE SET NULL)
    ├── wear_log_items (FK -> outfit_wear_history ON DELETE CASCADE, FK -> wardrobe_items ON DELETE CASCADE)
    ├── user_preferences (FK -> users ON DELETE CASCADE)
    └── shopping_products (Catalog items with category, provider, price)
```

---

## Technology Stack

- **Frontend:** React 19, Vite 8, Lucide React icons, Vanilla CSS (design system with warm ivory luxury palette).
- **Backend:** Node.js, Express.js 5, Passport.js (Google OAuth 2.0 strategy), JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cors`.
- **Database:** MySQL 8 with connection pooling via `mysql2/promise`.

---

## Database Schema & Relationships

| Table | Primary Key | Foreign Keys | Key Constraints & Purpose |
|---|---|---|---|
| `users` | `id` | — | `email` UNIQUE, password hash, gender, creation timestamp |
| `wardrobe_items` | `id` | `user_id -> users.id` (CASCADE) | Stores clothing name, category, color, brand, size, image URL |
| `outfits` | `id` | `user_id -> users.id` (CASCADE) | Stores saved outfit metadata, occasion, style, budget, description |
| `outfit_items` | `id` | `outfit_id -> outfits.id` (CASCADE)<br>`wardrobe_item_id -> wardrobe_items.id` (SET NULL) | Links garments to an outfit |
| `favorites` | `id` | `user_id -> users.id` (CASCADE)<br>`outfit_id -> outfits.id` (CASCADE) | UNIQUE(`user_id`, `outfit_id`) prevents duplicate favorites |
| `weekly_plans` | `id` | `user_id -> users.id` (CASCADE)<br>`outfit_id -> outfits.id` (SET NULL) | UNIQUE(`user_id`, `day_of_week`) enables upsert per weekday |
| `outfit_wear_history` | `id` | `user_id -> users.id` (CASCADE)<br>`outfit_id -> outfits.id` (SET NULL) | Tracks date worn, outfit name, notes |
| `wear_log_items` | `id` | `wear_log_id -> outfit_wear_history.id` (CASCADE)<br>`wardrobe_item_id -> wardrobe_items.id` (CASCADE) | Wardrobe item wear counts |
| `user_preferences` | `id` | `user_id -> users.id` (CASCADE) | UNIQUE(`user_id`) stores preferred styles, colors, occasions, size |
| `shopping_products` | `id` | — | E-commerce demo catalog (Myntra, Amazon, Flipkart, AJIO) |

---

## API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register local user with name, email, password, gender.
- `POST /api/auth/login` — Sign in with email and password, receives JWT.
- `GET /api/auth/me` — Returns authenticated user profile (`id`, `name`, `email`, `gender`, `created_at`).
- `GET /api/auth/google` — Initiates Google OAuth 2.0 redirect.
- `GET /api/auth/google/callback` — Handles Google OAuth callback and returns JWT token.

### Wardrobe (`/api/wardrobe`)
- `GET /api/wardrobe` — List all wardrobe items owned by the authenticated user.
- `POST /api/wardrobe` — Add a new clothing item (name, category, color, brand, size, image, season, notes).
- `PUT /api/wardrobe/:id` — Update an existing clothing item (ownership enforced).
- `DELETE /api/wardrobe/:id` — Delete a clothing item (ownership enforced).
- `GET /api/wardrobe/analytics` — Wardrobe metrics (total items, category breakdown, utilization %, most-worn, unused items).

### Outfits & Favorites (`/api/outfits`)
- `GET /api/outfits` — List all outfits created by the user with favorite indicator.
- `GET /api/outfits/favorites` — List all favorited outfits for the user.
- `GET /api/outfits/:id` — Retrieve full outfit details with individual piece items.
- `POST /api/outfits` — Save an outfit combination and linked wardrobe items in a database transaction.
- `DELETE /api/outfits/:id` — Delete an outfit (cascades to items and favorites).
- `POST /api/outfits/:id/favorite` — Toggle outfit favorite status.
- `DELETE /api/outfits/:id/favorite` — Remove outfit from favorites.

### Weekly Planner (`/api/planner`)
- `GET /api/planner` — Retrieve full 7-day plan (Monday–Sunday) for authenticated user.
- `PUT /api/planner/:day` — Upsert a single day's plan (validates weekday and outfit ownership).
- `POST /api/planner/bulk` — Save all 7 days in a single database transaction.
- `DELETE /api/planner` — Clear user's entire week plan.

### Outfit Wear History (`/api/wear`)
- `POST /api/wear` — Log a wear event (`worn_date`, `outfit_id`, `notes`, `wardrobe_item_ids`).
- `GET /api/wear` — Paginated list of past wear events.
- `GET /api/wear/stats` — Most-worn items, never-worn items, and total wear events count.
- `DELETE /api/wear/:id` — Delete a wear event.

### User Profile & Preferences (`/api/profile`)
- `GET /api/profile` — Fetch user account info and style preferences.
- `PUT /api/profile` — Update user display name and gender.
- `GET /api/profile/preferences` — Get preferred styles, occasions, colors, and default size.
- `PUT /api/profile/preferences` — Upsert style preferences (pre-populates AI Stylist).

### Shopping (`/api/shopping`)
- `GET /api/shopping/products` — Filter catalog by category, occasion, provider, price range, and search keyword.
- `GET /api/shopping/filters` — Available filter options extracted from existing catalog.

---

## Installation & Setup Guide

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server (v8.0 or higher)

### 1. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE fitroute_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Configuration
Navigate to `backend/`:
```bash
cd backend
cp .env.example .env
```
Update `.env` with your database credentials, JWT secret, and Google OAuth credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fitroute_db
DB_PORT=3306
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

Install backend dependencies and run:
```bash
npm install
node server.js
```

### 3. Frontend Configuration
Navigate to the root directory:
```bash
cd ..
cp .env.example .env.local
```
Install frontend dependencies and start Vite dev server:
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Automated Testing

Run the full end-to-end integration and security test suite:
```bash
node scratch/test_all_phases.cjs
```
The test suite covers:
1. Health & MySQL database connectivity.
2. User authentication, JWT issuance, and profile retrieval.
3. Wardrobe CRUD and cross-user data isolation.
4. Wardrobe Analytics execution (verifying the `ER_OUT_OF_SORTMEMORY` fix).
5. Outfit creation, favorite toggles, single outfit retrieval, and ownership checks.
6. Weekly Planner 7-day skeleton, single day upsert, and bulk save.
7. Wear history logging, stats calculation (most-worn / never-worn).
8. User profile and preference upsert/read.
9. Shopping catalog filtering.
10. Unauthenticated 401 rejection on private endpoints.

---

## Resume & Portfolio Summary

- Built a full-stack digital wardrobe and style recommendation platform using React 19, Node.js/Express 5, and MySQL 8 with connection pooling.
- Designed a rule-based outfit generation engine featuring occasion scoring, color harmony evaluation, and subset-rotation exclusion to eliminate repetitive recommendations.
- Architected a strict multi-tenant user isolation model enforcing foreign-key cascade policies and parameterized SQL ownership checks across all private endpoints.
- Resolved an `ER_OUT_OF_SORTMEMORY` database failure in the wardrobe analytics pipeline by refactoring MySQL aggregate queries and removing unindexed `LONGTEXT` columns from grouping clauses.
- Implemented weekly planner state synchronization with optimistic client caching in `localStorage` backed by MySQL upsert transactions.
