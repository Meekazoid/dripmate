# BrewBuddy

**Precision meets ritual.**

BrewBuddy is a specialty coffee brewing assistant that turns every pour-over into a deliberate, data-informed ritual. Scan a coffee bag, and the app calculates grind size, temperature, water amount, and pour timing — tailored to your beans, your grinder, and your water.

**Status:** Closed Beta · **Live:** [brewbuddy-sixty.vercel.app](https://brewbuddy-sixty.vercel.app/)

---

## Features

### Coffee Recognition
Photograph a coffee bag and let Claude AI extract origin, processing method, cultivar, altitude, and tasting notes automatically. Or add beans manually with full control over every parameter.

### Adaptive Brew Engine
Brewing parameters are computed from a layered system that accounts for processing method (10+ categories from washed to carbonic maceration), bean altitude, cultivar characteristics, regional origin, and local water hardness — all stacking cumulatively into a final recommendation.

### Global Grinder Selector
A sticky selector lets you switch between Fellow Ode and Comandante at any time. All cards update instantly. Grind adjustments are stored as a grinder-neutral offset, so switching grinders preserves your tuning proportionally.

### Interactive V60 Timer
A real-time pour-over timer with per-step progress bars, smooth auto-scroll to the active step, and pause/resume controls. Brew steps adapt dynamically when you change coffee amount via the slider.

### Brew Feedback Loop
Rate extraction, taste clarity, and body after each brew. The app suggests concrete adjustments (grind offset, temperature) and lets you apply them with one tap. Reset to engine defaults at any time.

### Water Hardness Integration
Enter your German postal code to load regional water hardness data. The brew engine automatically adjusts grind and temperature — finer grind and higher temp for soft water, coarser and cooler for hard water.

### Roast Freshness Tracking
Set a roast date per coffee and see a live freshness badge: *Still Resting* (< 7 days), *Sweet Spot* (7–30 days), or *Fading* (30+ days), with smooth gradient transitions between phases.

### Decaf Bin
Deleted coffees move to a soft-delete bin ("Decaf") where they can be restored or permanently removed. No accidental data loss.

### Favorites & Sorting
Star your go-to beans. Favorites float to the top, sorted by when they were favorited. Everything else sorts by date added.

---

## Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Vanilla JS PWA)          │
│  index.html · app.js · style.css    │
│  water-hardness.js · backend-sync.js│
│  Hosted on Vercel                   │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│  Backend (Node.js + Express)        │
│  server.js · db/database.js         │
│  Hosted on Railway                  │
│  PostgreSQL (prod) / SQLite (dev)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Anthropic API (Claude Sonnet 4)    │
│  Coffee bag image analysis          │
└─────────────────────────────────────┘
```

The frontend operates offline-first via localStorage and syncs to the Railway backend when a valid token and device binding are present. The backend handles authentication, coffee data persistence, grinder preference storage, and proxies image analysis requests to the Anthropic API.

---

## Getting Started

### Frontend (Vercel)

1. Push the frontend files (`index.html`, `app.js`, `style.css`, `water-hardness.js`, `backend-sync.js`, `manifest.json`, assets) to a Git repository.
2. Import the repo in [Vercel](https://vercel.com) — no build step required.
3. The app is served as a static PWA.

### Backend (Railway)

1. Push the backend files (`server.js`, `db/database.js`, `package.json`) to a separate repository.
2. Create a Railway project with a PostgreSQL database.
3. Set environment variables:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
ALLOWED_ORIGINS=https://your-app.vercel.app
NODE_ENV=production
DATABASE_URL=postgresql://...  # auto-set by Railway
```

4. Deploy. The database schema is created automatically on first start.

### Device Activation

Users receive an access token. Enter it in *Settings (⚙️)* to bind the device and enable backend sync + AI analysis.

---

## File Overview

| File | Purpose |
|---|---|
| `index.html` | App shell, HTML structure, modals |
| `app.js` | All application logic (brew engine, rendering, timers, feedback) |
| `style.css` | Complete styling with dark/light mode |
| `water-hardness.js` | German postal code → water hardness lookup |
| `backend-sync.js` | Token management, backend API calls, auto-sync |
| `manifest.json` | PWA manifest |
| `server.js` | Express API server with auth, CORS, rate limiting |
| `db/database.js` | Database abstraction (PostgreSQL + SQLite) |

---

## Technical Notes

### Brew Parameter Pipeline
Parameters flow through: `getProcessingBaseParams()` → `adjustForAltitude()` → `adjustForCultivar()` → `adjustForOrigin()` → `adjustForWaterHardness()` → `getGrinderValue(base, grinder, offset)`. Each stage can shift grind and temperature independently.

### Grind Offset System
Manual grind adjustments are stored as `coffee.grindOffset` — a grinder-neutral integer. Each +1 means +1 click (Comandante) or +0.1 setting (Fellow Ode). This ensures grinder switches don't produce invalid values.

### Database Migration
The schema auto-migrates on startup. The `grinder_preference` column is added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. No manual migration required for PostgreSQL; SQLite creates the full schema on first run.

### API Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| General API | 100 requests | 15 minutes |
| AI Analysis | 10 requests | 1 hour |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/auth/validate` | Validate token + device binding |
| GET | `/api/user/grinder` | Get grinder preference |
| POST | `/api/user/grinder` | Update grinder preference |
| GET | `/api/coffees` | Get user's coffees |
| POST | `/api/coffees` | Save user's coffees |
| POST | `/api/analyze-coffee` | AI coffee bag analysis |

---

## Development Timeline

| Version | Date | Highlight |
|---|---|---|
| 1.0.0 | Feb 01 | Initial PWA release with basic brew parameters |
| 1.1.0 | Feb 02 | AI coffee bag recognition via Claude Sonnet 4 |
| 1.2.0 | Feb 03 | Backend sync + device binding |
| 1.3.0 | Feb 04 | V60 timer, feedback system, amount slider |
| 1.4.0 | Feb 05 | Advanced brew engine (10+ processes, altitude, cultivar, origin, water) |
| 1.5.0 | Feb 06 | Decaf bin, favorites, freshness badges, official logo |
| 2.0.0 | Feb 07 | Global grinder selector with backend sync |
| 2.0.1–2.3.0 | Feb 08 | Modular architecture, manual controls, grind offset, UI polish |

See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## License

See [LICENSE](LICENSE) for details.

**Created by Holger Pfahl · February 2026**
