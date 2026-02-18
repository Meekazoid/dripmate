# BrewBuddy

**Precision meets ritual.**

BrewBuddy is a specialty coffee brewing assistant that turns every pour-over into a deliberate, data-informed ritual. Scan a coffee bag, and the app calculates grind size, temperature, water amount, and pour timing — tailored to your beans, your grinder, and your water.

**Status:** Closed Beta · **Live:** [brewbuddy-sixty.vercel.app](https://brewbuddy-sixty.vercel.app/)

---

## Features

### Coffee Recognition (AI)
Photograph a coffee bag and let Claude AI extract origin, processing method, cultivar, altitude, and tasting notes automatically. The app now includes improved scan error guidance (activation required, offline, rate limits, blurry OCR, image too large).

### Adaptive Brew Engine
Brewing parameters flow through a layered pipeline:

`processing → altitude → cultivar → origin → water hardness → roast age → brew method → grinder conversion`

This produces initial grind, temperature, ratio, and step-by-step brew instructions.

### Cupping-Style Feedback Loop
Feedback is now cupping-oriented with four dimensions:
- Bitterness
- Sweetness
- Acidity
- Body

Rules map these ratings into controlled grind/temperature adjustments with conflict hints and per-iteration caps.

### Adjustment History
Each applied suggestion and reset is stored in a per-coffee timeline. Users can open **View Adjustment History** to review previous changes and reproduce successful cups.

### Grinder Calibration Matrix v1.1
Grinder conversion now uses a centralized profile map in code and a documentation matrix with:
- start bands
- offset sensitivity
- confidence hints
- suggested per-brew caps

### Water Hardness + Roast Freshness
Water hardness adjusts extraction behavior automatically. Roast age contributes a small temperature micro-adjustment (`<7d: -1°C`, `>30d: +1°C`).

---

## Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Vanilla JS PWA)          │
│  index.html · js/* · style.css      │
│  Hosted on Vercel                   │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│  Backend (Node.js + Express)        │
│  Hosted on Railway                  │
│  PostgreSQL (prod) / SQLite (dev)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Anthropic API (Claude Sonnet 4)    │
│  Coffee bag image analysis          │
└─────────────────────────────────────┘
```

The frontend operates offline-first via localStorage and syncs to the Railway backend when a valid token and device binding are present. The backend handles authentication, coffee data persistence, preferences, and proxies image analysis.

---

## Documentation Index

- `CHANGELOG.md` — version history
- `RULESET_CALCULATION_FLOW.md` — end-to-end rules flowchart
- `AI_FEEDBACK_FLOW.md` — AI request and feedback flow explanation
- `GRINDER_CALIBRATION_OVERVIEW.md` — conversion + calibration matrix (v1.1)
- `GRINDER_CALIBRATION_OVERVIEW.pdf` — shareable PDF copy

---

## API Notes

| Endpoint | Limit | Window |
|---|---|---|
| General API | 100 requests | 15 minutes |
| AI Analysis | 10 requests | 1 hour |

Users must activate the device in Settings (token + device binding) to enable backend sync and AI scan.

---

## License

See [LICENSE](../LICENSE) for details.
