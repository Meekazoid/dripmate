# AI-Anfragen, Feedback-Loop und UX-Verbesserungen (Code-Analyse)

## 1) Wann werden AI-Anfragen gestellt?

Im aktuellen Frontend-Code wird **genau eine AI-bezogene Anfrage** ausgelöst:

- Beim Bild-Upload/Kamera-Import (`processImageUpload`) nach optionaler Komprimierung.
- Dann ruft `analyzeCoffeeImage()` den Backend-Endpunkt `POST /api/analyze-coffee` auf.
- Diese Anfrage wird nur ausgeführt, wenn `token` und `deviceId` in `localStorage` vorhanden sind.

Wichtig:
- Das **Feedback-System selbst** (Extraction/Taste/Body) ruft **keine AI** auf. Es ist regelbasiert.
- Laut README proxy’t das Backend diese Analyse weiter an die Anthropic API (Claude Sonnet 4).

## 2) Flowchart: AI-Request + Feedback-Loop

```mermaid
flowchart TD
    A[User klickt Kamera/Upload] --> B[app.js Event Listener]
    B --> C[processImageUpload(file)]
    C --> D{Bild > 4MB?}
    D -- Ja --> E[compressImage]
    D -- Nein --> F[Base64 direkt lesen]
    E --> G[analyzeCoffeeImage]
    F --> G

    G --> H{token + deviceId vorhanden?}
    H -- Nein --> I[Fehler: Device nicht aktiviert]
    H -- Ja --> J[POST /api/analyze-coffee an Backend]
    J --> K{response.ok & result.success?}
    K -- Nein --> L[Fehler anzeigen]
    K -- Ja --> M[Kaffee in coffees einfügen]
    M --> N[saveCoffeesAndSync]
    N --> O[renderCoffees]

    O --> P[User brüht & gibt Feedback]
    P --> Q[selectFeedback(extraction/taste/body)]
    Q --> R[generateSuggestion]
    R --> S[Regelbasierte Vorschläge: Grind-Offset + Temperatur]
    S --> T{Apply klicken?}
    T -- Ja --> U[applySuggestion: grindOffset/customTemp setzen]
    U --> V[saveCoffeesAndSync + re-render]
    T -- Nein --> W[Manuell justieren oder unverändert lassen]
```

## 3) Auf welcher Basis funktioniert das Feedback-Schleifen-System?

Das System ist **heuristisch/regelbasiert**, nicht LLM-basiert:

1. Der Nutzer bewertet drei Dimensionen:
   - Extraction: `under | perfect | over`
   - Taste Clarity: `flat | good | perfect | harsh`
   - Body: `thin | balanced | heavy`
2. Daraus werden additive Korrekturen abgeleitet:
   - `grindOffsetDelta` (z. B. unterextrahiert → feiner = negativer Offset)
   - `newTemp` (z. B. harsh → Temperatur runter)
3. Die Vorschau (`previewGrind`) nutzt den bestehenden Brew-Engine-Stack (`getBrewRecommendations`) mit hypothetischem Offset.
4. Bei „Apply“ werden die Vorschläge persistent ins Coffee-Objekt übernommen (`grindOffset`, `customTemp`), Feedback zurückgesetzt und neu gerendert.

Damit ist die Schleife:
**Brew → Sensorik-Feedback → Parameter-Update → neuer Brew → neues Feedback**.

## 4) UX-Verbesserungsvorschläge (aus dem vorhandenen Code abgeleitet)

### A. Klarheit: „AI-Analyse“ vs. „Regelbasierte Feedback-Tipps“
- Im UI sollte klar getrennt werden:
  - AI nur beim Bean-Scan
  - Feedback-Tuning ist lokal/regelbasiert
- Vorteil: Erwartungsmanagement, weniger Verwirrung über „AI überall“.

### B. Feedback schneller machen
- Presets hinzufügen: „Zu sauer“, „Zu bitter“, „zu dünn“ als 1-Tap-Makros (mappt auf mehrere Felder).
- Dadurch weniger Klicks in der Karte.

### C. Änderungs-Historie pro Kaffee
- Nach `applySuggestion` eine kleine Timeline speichern (z. B. Datum, alter/new Grind/Temp).
- UX-Gewinn: Lernkurve sichtbar, reproduzierbare Rezepte.

### D. Confidence/Unsicherheit anzeigen
- AI-Resultate könnten optional mit „Confidence“ pro Feld dargestellt werden (Origin/Process/Cultivar).
- Niedrige Confidence könnte direkt „Bitte prüfen“-Marker in der manuellen Eingabe aktivieren.

### E. Bessere Fehlerführung beim AI-Scan
- Aktuell kommen nur generische Fehlertexte zurück.
- UX: differenzierte Hinweise für Token fehlt, Rate Limit, Bild zu unscharf, Netzwerk offline.

### F. Progressive Disclosure in Feedback
- Erst nur „Extraction“ fragen; bei `under/over` dann Taste+Body einblenden.
- Reduziert kognitive Last in Standardfällen.

### G. Onboarding für Wasserhärte-Einfluss
- Weil Water Hardness direkt auf Grind/Temp wirkt, sollte beim ersten Setzen ein kurzer Hinweis erscheinen:
  „Deine Empfehlungen wurden wegen Wasserhärte angepasst.“

### H. Undo nach Apply
- Nach „Apply These Settings“ für 5–10 Sekunden „Undo“ anbieten.
- Verhindert Frust bei Fehlklicks.

## 5) Kurzfazit

- **AI-Anfragen**: nur beim Bild-Scan (`/api/analyze-coffee`).
- **Feedback-Loop**: deterministische Regeln + Brew Engine, keine AI.
- **UX-Potenzial**: vor allem Transparenz, schnellere Feedback-Erfassung, bessere Fehler-/Vertrauenskommunikation.
