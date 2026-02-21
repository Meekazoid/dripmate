# Changelog

All notable changes to dripmate are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [2.4.4] – 2026-02-18 · Docs Refresh & Documentation Folder

### Changed
- Updated `README.md` and `CHANGELOG.md` to reflect the latest ruleset, cupping feedback, grinder calibration matrix, and scan UX behavior.
- Moved all Markdown documentation files into a dedicated repository folder for cleaner project structure.

---

## [2.4.3] – 2026-02-18 · Grinder Calibration Matrix v1.1

### Added
- **Calibration Matrix v1.1** with practical start bands, offset sensitivity, confidence hints, and suggested per-brew caps.
- **Shareable PDF** export: `GRINDER_CALIBRATION_OVERVIEW.pdf`.

### Changed
- Grinder conversion refactored to a centralized profile-based matrix in `js/brew-engine.js`.

---

## [2.4.2] – 2026-02-18 · History UX & Reset Logging

### Added
- Reset actions are now written to adjustment history with explicit baseline reset annotation.

### Changed
- `View Adjustment History` button styled to green (matching Start Brew), centered, and scaled down.

---

## [2.4.1] – 2026-02-18 · Ruleset Transparency & Stability

### Added
- `RULESET_CALCULATION_FLOW.md` and `AI_FEEDBACK_FLOW.md` with Mermaid flowcharts and rule explanations.

### Changed
- Brew engine now includes roast-age micro temperature adjustment.
- Feedback rules include conflict guidance, context handling, and capped per-iteration deltas.

---

## [2.4.0] – 2026-02-18 · Cupping Feedback + Scan Error UX

### Added
- Cupping-style feedback dimensions: **Bitterness, Sweetness, Acidity, Body**.
- Per-coffee adjustment history modal with timeline entries.

### Changed
- AI scan errors now provide differentiated guidance (activation, offline, rate limit, auth, image too large, blurry OCR).

---

## [2.3.0] – 2026-02-08 · Documentation & Polish

### Changed
- **Header redesign:** Flexbox centering for logo + title. CSS filter refined to warm gold matching `--accent` in both themes. Responsive logo sizes (72 → 56 → 48 px).
- **Documentation consolidated:** `README.md`, `CHANGES.md`, and `UPDATE.md` merged into a single `README.md` and this `CHANGELOG.md`.

### Removed
- `CHANGES.md` and `UPDATE.md` — content merged here.
- Grinder subtext labels from global selector.

---

## [2.2.0] – 2026-02-08 · Grind Offset System

### Changed
- **Grind offset:** Manual adjustments now store a grinder-neutral `grindOffset` integer instead of a grinder-specific string. Switching grinders preserves tuning proportionally (±1 offset = ±1 click Comandante / ±0.1 Fellow Ode).
- **Ratio in header:** Section title reads "Coffee Amount – Ratio 1:16" instead of a separate parameter box.
- **Water box simplified:** Shows only milliliters (e.g. `240ml`).
- **Grinder labels shortened:** "Fellow Ode Gen2" → "Fellow Ode", "Comandante C40 MK3" → "Comandante".
- **Feedback refactored:** Suggestions compute `grindOffsetDelta` and show a preview before applying.

### Removed
- `adjustGrind()` function, `coffee.customGrind` property, separate ratio parameter box.

---

## [2.1.0] – 2026-02-08 · Manual Controls & Event Fixes

### Added
- **Manual +/− buttons** for grind and temperature with direct DOM updates (no full re-render).
- **Reset Adjustments button** per card — restores engine defaults while keeping the card expanded.
- **Initial values migration:** `migrateCoffeesInitialValues()` stamps `initialGrind` / `initialTemp` on all existing coffees at startup.
- **Permanent delete** in Decaf modal — removes a coffee from the array after confirmation.

### Fixed
- **Event propagation:** All interactive elements inside cards call `event.stopPropagation()`, preventing card collapse on interaction.
- **Reset stability:** Uses direct DOM updates so the card stays open during reset.

---

## [2.0.1] – 2026-02-08 · Modular Architecture

### Changed
- **Monolith split:** Single `index.html` (~122 KB) split into three files:
  - `index.html` — HTML structure and modals
  - `style.css` — all CSS (23 sections)
  - `app.js` — all logic (20 sections)
- **Dead code eliminated:** Removed unused timer variables, orphaned `currentMode`, legacy per-card grinder remnants.
- **Script loading:** External `<script src>` tags. Load order: `js/data/water-hardness-db.js` → `js/app.js` → `js/services/backend-sync.js`.

---

## [2.0.0] – 2026-02-07 · Global Grinder Selector 🏷️

> **Milestone:** Grinder selection moved from per-card to a single global control with backend persistence.

### Added
- **Global grinder selector:** Sticky bar between add-coffee section and coffee list. Single source of truth for grinder choice.
- **Haptic feedback** on grinder switch (vibration API).
- **Grinder preference backend sync:** `GET/POST /api/user/grinder` endpoints. Stored in `users.grinder_preference` column. Auto-loaded on login.

### Removed
- Per-card grinder selector HTML, CSS, `switchGrinder()` function, `coffee.selectedGrinder` property.

---

## [1.5.0] – 2026-02-06 · Decaf, Favorites & Visual Identity 🏷️

> **Milestone:** First version with soft-delete, favorites ranking, roast tracking, and official branding.

### Added
- **Decaf (soft delete):** Deleted coffees flagged `deleted: true` with timestamp. Modal lists them with Restore and Permanent Delete.
- **Favorites system:** Star button per card. Favorites sort to the top by `favoritedAt` timestamp.
- **Roast freshness badges:** *Still Resting* (< 7 d), *Sweet Spot* (7–30 d), *Fading* (30+ d) with gradient transitions.
- **Official dripmate logo** in header with CSS filter gold tones for dark/light mode.
- **Custom grinder SVG icon** replacing generic gear symbol.

### Changed
- Control buttons resized (56 → 42 px), opacity lowered to 0.3.
- Parameter grid reorganised to 2 × 2 layout.
- Brew step weights rendered in bold. SVG icons replace emoji for tips and suggestions.
- Smooth auto-scroll to brew steps when starting timer.

### Fixed
- **Delete persistence:** Flag-based soft delete replaces array-splice, fixing data integrity across sessions and backend sync.

---

## [1.4.0] – 2026-02-05 · Advanced Brew Engine 🏷️

> **Milestone:** Brew parameter system expanded from 3 categories to a full cumulative engine with 10+ processing methods and 4 adjustment factors.

### Added
- **10+ processing categories:** Washed, Natural, Honey (yellow/red/black), Anaerobic Natural, Anaerobic Washed, Carbonic Maceration, Yeast Inoculated, Nitro/CO₂, Extended Fermentation.
- **Altitude adjustment:** < 1200 m → coarser grind; > 1800 m → finer grind + higher temp.
- **Cultivar adjustment:** Delicate (Gesha, SL28, Bourbon, Typica) → finer, lower temp. Robust (Catimor, Pacamara) → coarser, higher temp.
- **Origin adjustment:** Africa → finer; Asia → coarser + higher temp; Latin America → neutral.
- **Water hardness module** (`js/data/water-hardness-db.js`): German postal code lookup with 50+ city data points. Adjusts grind ±2 and temperature ±1.
- **3 brew styles** (slow, fruity, standard) with tailored pour timing.
- **Intelligent brew notes** explaining all cumulative adjustments.

---

## [1.3.0] – 2026-02-04 · V60 Timer & Feedback

### Added
- **V60 brew timer** with per-step progress bars, play/pause/reset, and smooth auto-scroll.
- **Brew feedback system:** Rate extraction, taste clarity, and body. AI-generated adjustment suggestions with one-tap apply.
- **Coffee amount slider** (10–30 g) with live parameter recalculation.

---

## [1.2.0] – 2026-02-03 · Backend Sync & Device Binding

### Added
- **Device binding:** Token locked to one device via fingerprint-based `deviceId`.
- **Backend sync module** (`js/services/backend-sync.js`): Automatic coffee data sync to Railway PostgreSQL.
- **Settings modal** with token activation flow.

---

## [1.1.0] – 2026-02-02 · AI Coffee Recognition 🏷️

> **Milestone:** First AI-powered feature — photograph a coffee bag and get structured data extracted automatically.

### Added
- **AI coffee bag analysis** via Claude Sonnet 4. Extracts name, origin, process, cultivar, altitude, roaster, and tasting notes from a photo.
- **Image compression** for uploads > 4 MB (canvas resize + quality reduction).
- **Manual entry form** as fallback when no photo is available.

---

## [1.0.0] – 2026-02-01 · Initial Release 🏷️

> **Milestone:** dripmate goes live as a closed-beta PWA.

### Added
- Progressive Web App with dark/light mode toggle.
- Basic brew parameter calculation (3 categories: washed, natural, honey).
- Expandable coffee cards with localStorage persistence.
- Express backend with PostgreSQL (Railway) and SQLite (dev fallback).
- Token-based authentication with CORS and rate limiting.
- Responsive design (desktop, tablet, mobile).
