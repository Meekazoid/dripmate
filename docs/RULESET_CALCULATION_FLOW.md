# BrewBuddy Ruleset-Flow: Vom Scan zu Empfehlungen und Feedback-Anpassungen

Diese Übersicht zeigt transparent, wie sich Werte in BrewBuddy verändern:

- **Input aus Scan** (process, origin, cultivar, altitude, roast date, tasting notes)
- **Initiale Brew-Berechnung** (Mahlgrad/Temperatur/Ratio)
- **Cupping-Feedback** (bitterness/sweetness/acidity/body)
- **Änderungslogik mit Caps & Konfliktregeln**

## 1) End-to-End Flow

```mermaid
flowchart TD
    A[Coffee-Bag Scan] --> B[AI Extracted Fields]
    B --> C[coffee object speichern]

    C --> D[getBrewRecommendations]
    D --> E[getProcessingBaseParams(process)]
    E --> F[adjustForAltitude(altitude)]
    F --> G[adjustForCultivar(cultivar)]
    G --> H[adjustForOrigin(origin)]
    H --> I[adjustForWaterHardness(hardness)]
    I --> J[adjustForRoastAge(roastDate)]
    J --> K[adjustForMethod(v60/chemex/aeropress)]
    K --> L[getGrinderValue(grinder, grindOffset)]
    L --> M[Initial Vorschlag: Grind + Temp + Ratio + Steps]

    M --> N[User brüht]
    N --> O[Cupping Quick Rating]
    O --> P{bitterness/sweetness/acidity/body}

    P --> Q[generateSuggestion]
    Q --> R[Regeln + Konfliktlogik + Delta-Caps]
    R --> S[Preview New Grind + New Temp]
    S --> T{Apply?}
    T -- Ja --> U[applySuggestion]
    U --> V[grindOffset/customTemp speichern]
    V --> W[feedbackHistory Entry speichern]
    W --> X[Neu rendern]
    T -- Nein --> Y[Anpassen/erneut bewerten]
```

## 2) Initiale Berechnung: Einflussfaktoren

| Faktor | Wirkung im aktuellen Ruleset |
|---|---|
| Processing-Methode | Setzt die Basis für Mahlgrad, Temperatur, Ratio, Zielzeit (z. B. Natural/Honey/Anaerobic). |
| Altitude | Niedrigere Lage tendenziell gröber/kühler, hohe Lage tendenziell feiner/wärmer. |
| Cultivar | Delicate Varietäten eher feiner/kühler, robuste eher gröber/wärmer. |
| Herkunft | Afrika tendenziell feiner, Teile Asiens tendenziell gröber/wärmer. |
| Wasserhärte | Weiches Wasser: feiner/wärmer · Hartes Wasser: gröber/kühler. |
| Roast Date | Mikro-Korrektur Temperatur: <7 Tage -1°C, >30 Tage +1°C, sonst 0°C. |
| Brew Method | Chemex gröber/wärmer, AeroPress feiner/kühler, V60 baseline. |

## 3) Cupping-Feedback -> Anpassungsregeln

Skalen: `low / balanced / high` für:
- Bitterness
- Sweetness
- Acidity
- Body

### Kernregeln
- **Bitterness high** -> gröber, kühler
- **Sweetness low** -> feiner, wärmer
- **Acidity high** -> feiner, wärmer
- **Body low** -> feiner
- **Body high** -> gröber

### Kontextregel für `acidity = low`
- Bei `bitterness high`: coarser/cooler beibehalten (Harshness reduzieren)
- Bei `sweetness low`: finer/warmer (Extraction anheben)
- Sonst: nur kleine Coarsening-Korrektur

### Konfliktregel
Wenn `bitterness high` **und** `acidity high` gleichzeitig:
- Hinweis: Temperatur stabil halten
- Erst Mahlgrad ändern, dann neu verkosten

### Stabilitätsgrenzen (Caps)
Pro Iteration begrenzt auf:
- `grindOffsetDelta` max `±4`
- `tempDelta` max `±2°C`

## 4) Änderungs-Historie

Bei `Apply` wird gespeichert:
- Zeitstempel
- vorheriger/neuer Mahlgrad
- vorherige/neue Temperatur
- angewendeter Grind-Delta
- angewendetes Temp-Override

So sind Anpassungszyklen nachvollziehbar und reproduzierbar.
