# dripmate · Anleitung: Grinder & Brühmethoden hinzufügen

Diese Datei enthält drei copy-paste-fertige Prompts für **Claude Code in VS Code**
(PROMPT 0 = einmaliges Fundament, PROMPT 1 = Grinder, PROMPT 2 = Methode) sowie die
Touchpoint-Karte und das Kalibrierungs-Rezept. Ziel: ein neuer Grinder / eine neue Methode
taucht **in der Auswahl auf, wird berechnet und erscheint auf der CoffeeCard** – ohne dass
etwas vergessen wird.

> **Internes Referenzmodell:** Alle Mahlgrade werden intern in **Comandante-Klicks** gerechnet
> (`grindBase.comandante`). Basiswert für Washed/V60 = **22**. Jeder Grinder hat einen
> `baseFactor`, der diese 22 in seine eigene Skala übersetzt. Der Feedback-`grindOffset` ist
> grinder-neutral und wird mit `offsetFactor` skaliert.

---

## Reihenfolge (einmalig zuerst, dann beliebig oft erweitern)

0. **PROMPT 0 – Fundament** (genau **einmal** ausführen): Doku an Code angleichen +
   Single-Source-of-Truth-Registry bauen + Doku generieren + Verifikation. Danach ist
   „Grinder/Methode hinzufügen" nur noch **ein Registry-Eintrag**.
1. Dann **PROMPT 1** pro neuem Grinder.
2. Dann **PROMPT 2** pro neuer Methode.

Prompt 0 ist **verhaltensneutral**: kein einziges Brew-Ergebnis (Mahlgrad/Temp/Ratio/Steps)
darf sich für bestehende Kombinationen ändern. Es wird nur umstrukturiert, und die Doku wird
an den (realistischeren) Code angeglichen.

---

## PROMPT 0 — Fundament: Doku angleichen + SSOT-Registry (einmalig)

```text
Hallo Claude (VS Code). Bitte baue das Fundament, BEVOR neue Grinder/Methoden dazukommen.
Oberste Regel: Diese Aufgabe darf KEIN Brew-Ergebnis ändern (Mahlgrad, Temp, Ratio, Steps,
Zeit) für irgendeine bestehende Kombination aus Grinder × Methode × Processing. Es wird nur
umstrukturiert; die Doku wird an den Code angeglichen (Code = Wahrheit). Wenn du einen
Code-Wert für falsch hältst: NICHT ändern, sondern auflisten und mich entscheiden lassen.

PHASE 0 — Sicherheitsnetz (Golden Master):
- Lies zuerst js/state.js und js/brew-engine.js, um zu sehen, wie getBrewRecommendations
  seine Eingaben bezieht (preferredGrinder, preferredMethod, coffeeAmount, getActiveWaterHardness).
- Schreibe scripts/snapshot-brews.mjs: iteriere ALLE Grinder × ALLE Methoden ×
  Processings [washed, natural, honey, anaerobic-natural, unknown] bei festen Inputs
  (amount 18g, altitude 1500, keine Wasserhärte, kein roastDate, neutraler cultivar/origin)
  und schreibe grindSetting/temperature/ratio/targetTime/steps nach
  tests/golden/brews.baseline.json. Stub/setze die State-Importe passend. Committe die Baseline.

PHASE 1 — Doku ↔ Code abgleichen (NUR Doku, keine Code-Ausgabe ändert sich):
- Vergleiche das echte profiles{}-Objekt in js/brew-engine.js mit beiden Matrizen in
  docs/GRINDER_CALIBRATION_OVERVIEW.md. Korrigiere die Doku auf die Code-Werte:
  Timemore S3 = 2.5, Baratza = 0.9, 1Zpresso JX = 3.5/30.
- Das v1.1-Startband für 1Zpresso JX („0.7–1.2 rot") ist unrealistisch. Berechne, was der
  Code bei base=22 wirklich ausgibt (22 × 3.5/30 ≈ 2.57 rot) und setze ein realistisches
  Band (~2.3–3.0 rot). Prüfe für JEDE Zeile: round(22 × baseFactor) (bzw. rot/dial) liegt im
  angegebenen Band — wenn nicht, Band korrigieren.
- Setze oben einen Hinweis: „Tabellen werden aus js/data/grinders.js generiert — nicht von Hand editieren."

PHASE 2 — Registry als Single Source of Truth (verhaltensneutral):
- Erstelle js/data/grinders.js mit export const GRINDERS (geordnete Map, key = Grinder-Key).
  Jeder Eintrag: { key, label, chipLabel, pickerDetail,
    profile:{ type, baseFactor, offsetFactor, min, max?, baseRef? },
    calibration:{ startBand, offsetSensitivity, confidence, capPerBrew }, sources:[...] }.
  Befülle mit den EXAKT aktuellen Werten aus profiles{}, GRINDER_INFO, den
  abbreviateGrinderName-Replaces und den picker-option-detail-Texten aus index.html.
- Erstelle js/data/methods.js mit export const METHODS (key = Methoden-Key). Jeder Eintrag:
  { key, label, pickerDetail, stepHeaderLabel, timerLabel,
    adjust:{ grindComandante, grindFellow, ratioClamp:{op:'max'|'min'|'none', value}, tempDelta, targetTime },
    note, buildSteps(amount, ratio, waterAmount) }.
  Befülle EXAKT aus adjustForMethod(), generateBrewSteps(), generateBrewNotes(),
  dem Step-Header-Ternary in coffee-cards.js und methodLabels in brew-timer.js.
  V60 = baseline (kein adjust). Übernimm die Step-Arrays wortgleich in buildSteps.
- Refactore die Verbraucher so, dass sie aus den Registries lesen (KEINE Wertänderung):
  • js/brew-engine.js getGrinderValue(): inline-profiles{} → GRINDERS[grinder].profile
    (Fallback wie heute = fellow_gen2).
  • js/brew-engine.js: adjustForMethod() aus METHODS[method].adjust,
    generateBrewSteps() aus .buildSteps, generateBrewNotes() aus .note.
  • js/grinder.js: GRINDER_INFO/METHOD_INFO + getGrinderLabel/getMethodLabel +
    abbreviateGrinderName aus den Registries. GRINDER_MIGRATION beibehalten.
  • js/coffee-cards.js: Step-Header = METHODS[method].stepHeaderLabel.
  • js/brew-timer.js: methodLabels aus METHODS.
- Picker dynamisch rendern: in js/grinder.js initGlobalGrinder() VOR dem Anhängen der Listener
  #grinder-picker-list und #method-picker-list aus den Registries befüllen
  (picker-option-name + picker-option-detail + picker-check, gleiche Klassen/Reihenfolge),
  danach Listener anhängen (oder Event-Delegation am Container). markActiveOption muss weiter
  funktionieren. In index.html die Modal-Hüllen + Header behalten, die Listen-Inhalte werden
  zur Laufzeit erzeugt.

PHASE 3 — Doku aus Registry generieren:
- Erstelle scripts/gen-grinder-docs.mjs: erzeugt v1- + v1.1-Tabelle in
  docs/GRINDER_CALIBRATION_OVERVIEW.md zwischen Markern <!-- AUTOGEN:START --> / <!-- AUTOGEN:END -->
  aus GRINDERS. Ausführen; das Ergebnis muss mit der in Phase 1 korrigierten Tabelle übereinstimmen.

PHASE 4 — Verifikation (muss grün sein, bevor du fertig meldest):
- scripts/verify-registry.mjs:
  • Für jeden Grinder: round(22 × baseFactor) (bzw. rot/dial) liegt im startBand;
    offsetFactor === baseFactor außer type==='ode'.
  • Jeder Grinder-/Methoden-Key löst Label, Profil/adjust und Picker-Eintrag auf — keine Waisen.
  • baseMappingHint-Konsistenz (falls gesetzt): der angezeigte Bruch muss denselben Wert wie
    profile.baseFactor ergeben. KEIN eval — Format ist "Zähler/Nenner" (z. B. "3.5/30"):
        function hintToNumber(hint) {
          if (hint.includes('/')) { const [n,d] = hint.split('/').map(Number); return n/d; }
          return Number(hint);
        }
    Assertion: Math.abs(hintToNumber(profile.baseMappingHint) - profile.baseFactor) < 1e-9;
    bei Abweichung Fehler mit Key, Hint-Wert und baseFactor. Nur prüfen, wenn Hint vorhanden.
  • snapshot-brews.mjs erneut nach tests/golden/brews.after.json laufen lassen und gegen
    die Baseline DIFFEN. Der Diff MUSS leer sein. Falls nicht → Refactor hat Verhalten geändert,
    so lange korrigieren, bis identisch.
- Zeig mir am Ende: Verify-Ausgabe, den (leeren) Golden-Diff, Liste geänderter Dateien.

NICHT-AUTOMATISIERBAR (manuell durch mich, Skript deckt es nicht ab):
- Browser-Smoke-Test: App öffnen, jeden Grinder + jede Methode einmal anklicken. Prüfen, dass
  die dynamisch gerenderten Picker klickbar sind, das aktive Häkchen (markActiveOption) korrekt
  sitzt, der Chip-Kurzname stimmt und das Umschalten die CoffeeCards neu rendert. Der Golden-Diff
  beweist nur die Rechenlogik, nicht das DOM-Rendering.

Randbedingungen: Vanilla-JS-ES-Module, keine neuen Dependencies; bestehende localStorage-Keys
und GRINDER_MIGRATION bleiben funktionsfähig.
```

---

## A) Touchpoint-Karte (nach PROMPT 0 / Registry-Welt)

Seit dem Fundament-Refactor ist **alles registry-getrieben**. Hinzufügen = **ein** Eintrag,
dann generieren + verifizieren. Picker, Chip, Berechnung, CoffeeCard-Steps, Timer-Label und
Doku ziehen automatisch nach — die früheren 4–6 von-Hand-Stellen sind jetzt intern.

### Neuen GRINDER hinzufügen → 1 Eintrag + 2 Skripte
| # | Stelle | Was |
|---|--------|-----|
| 1 | `js/data/grinders.js` → ein Eintrag in `GRINDERS` | `{ key, label, chipLabel, pickerDetail, docLabel, profile{type, baseFactor, offsetFactor, min[, max][, baseRef][, baseMappingHint]}, calibration{startBand, offsetSensitivity, confidence, capPerBrew}, sources[] }` |
| 2 | `node scripts/gen-grinder-docs.mjs` | regeneriert beide Doku-Matrizen aus der Registry |
| 3 | `node scripts/verify-registry.mjs` + `snapshot --after` | Kalibrierung/Konsistenz grün; Golden-Diff zeigt **nur** den neuen Key |

Nicht mehr anfassen (kommt automatisch aus der Registry): `index.html`-Picker,
`abbreviateGrinderName`/Labels, `getGrinderValue`-Profile, Doku-Tabellen.
Backend: `selectGrinder()` speichert nur den KEY-String. Alte Keys → `GRINDER_MIGRATION`.

### Neue METHODE hinzufügen → 1 Eintrag + Verifikation
| # | Stelle | Was |
|---|--------|-----|
| 1 | `js/data/methods.js` → ein Eintrag in `METHODS` | `{ key, label, pickerDetail, stepHeaderLabel, timerLabel, adjust{grindComandante, grindFellow, ratioClamp{op, value}, tempDelta, targetTime}, note, buildSteps(amount, ratio, waterAmount) }` |
| 2 | `node scripts/verify-registry.mjs` + `snapshot --after` | Methode vollständig aufrufbar; Golden-Diff zeigt **nur** den neuen Key |

Nicht mehr anfassen: `index.html`-Methoden-Picker, `adjustForMethod`/`generateBrewSteps`/
`generateBrewNotes`, der Step-Header in `coffee-cards.js`, `methodLabels` in `brew-timer.js`.

> **Golden-Diff-Regel beim Hinzufügen:** Ein neuer Grinder/eine neue Methode **erweitert** die
> Snapshot-Matrix. Der Diff gegen die Baseline darf daher **ausschließlich neue Zeilen** für den
> neuen Key zeigen — **keine einzige Änderung** an bestehenden Kombinationen. Danach die Baseline
> neu schreiben (`node scripts/snapshot-brews.mjs`), damit der neue Key Teil der Baseline wird.

---

## B) Kalibrierungs-Rezept (Grinder)

1. **µm/Klick & Mechanik** aus Manual/Hersteller holen (z. B. Comandante ≈ 30 µm/Klick).
2. **Reale V60-Sweet-Spot-Spanne** aus Manual + Foren/Hoffmann (z. B. „ZP6 V60 ≈ 1.5–2.5 rot").
3. **baseFactor** = Mittelpunkt der Spanne (in Grinder-Einheiten) ÷ **22**.
   - Kreuzcheck über µm: `baseFactor ≈ 30 / (µm pro Klick des neuen Grinders)`.
   - Beide Methoden sollten grob übereinstimmen; bei Konflikt → reale Spanne gewinnt.
4. **offsetFactor = baseFactor** (Ausnahme `type:'ode'` → fix `0.1`).
5. **type** wählen:
   - `'clicks'` → Ausgabe „N clicks" (Comandante, Timemore, Kingrinder, …)
   - `'rot'`    → Ausgabe „N.N rot" (1Zpresso-Stil, Klicks/Umdrehung)
   - `'encore'` → ganzzahlig 1..max (gestufte Elektrische wie Encore)
   - `'ode'`    → stufenloses Fellow-Zifferblatt (nutzt `grindBase.fellow`, **nur Fellow**)
6. **v1.1-Werte:** Start-Band = reale V60-Spanne; Cap/Brew ≈ `round(4 × baseFactor)`.

**Plausibilitäts-Check** (Washed, base = 22): `output = round(22 × baseFactor)` muss **im Start-Band liegen**.

---

## PROMPT 1 — Neuen Grinder hinzufügen (Registry-Welt)

```text
Hallo Claude (VS Code). Bitte füge den Grinder "<<GRINDER NAME>>" zu dripmate hinzu.
Das Fundament (PROMPT 0) ist erledigt: Grinder sind registry-getrieben. Du fügst GENAU
EINEN Eintrag in js/data/grinders.js hinzu — KEINE Edits an index.html, getGrinderValue,
abbreviateGrinderName oder den Doku-Tabellen (die werden generiert).

KONTEXT LESEN (zuerst):
- js/data/grinders.js → einen bestehenden Eintrag als Vorlage (exakte Feld-Struktur kopieren)
- docs/GRINDER_CALIBRATION_OVERVIEW.md → Referenzmodell (Comandante-Klicks, Washed-base = 22)
- scripts/verify-registry.mjs → welche Invarianten geprüft werden (danach richten)

RECHERCHE (mit Quellenangabe ins sources[]-Feld):
1. Burr-Größe, Mechanik, µm/Klick aus offiziellem Manual/Hersteller.
2. Reale V60/Pour-Over-Sweet-Spot-Spanne (Hersteller + James Hoffmann + r/pourover / home-barista).

BERECHNUNG (internes Modell = Comandante-Klicks, Washed-V60-base = 22):
3. baseFactor = Mittelpunkt der realen Spanne (in Grinder-Einheiten) / 22.
   Kreuzcheck: baseFactor ≈ 30 / (µm pro Klick). Bei Konflikt gewinnt die reale Spanne.
4. offsetFactor = baseFactor (außer type 'ode' → 0.1).
5. type: 'clicks' | 'rot' | 'encore' | 'ode'. min (und max bei 'encore') setzen.
   baseMappingHint nur setzen, wenn die Bruchform lesbarer ist (z. B. "3.5/30"); dann MUSS
   der Bruch exakt baseFactor ergeben (verify prüft das).
6. PLAUSIBILITÄT: round(22 × baseFactor) (bzw. rot/dial) muss im startBand liegen.

EINTRAG (genau einer, alphabetisch einsortiert, KEY kleingeschrieben + NICHT rein-numerisch):
{
  key: 'KEY',
  label: '<voller Name>',                 // Picker
  chipLabel: '<Kurzname>',                // Chip
  pickerDetail: '<Burr · Mechanik>',      // Detailzeile im Picker
  docLabel: '<Name in der Doku-Tabelle>', // gleiche Kalibrierung? → docLabel teilen (wie MK3/MK4)
  profile: { type:'…', baseFactor:…, offsetFactor:…, min:… [, max:…] [, baseRef:'…'] [, baseMappingHint:'…'] },
  calibration: { startBand:'<reale Spanne>', offsetSensitivity:'≈ … ', confidence:'…', capPerBrew:'≈ round(4×baseFactor)' },
  sources: ['<manual-url>', '<hoffmann/forum-url>']
}

VERIFIKATION (alle grün, bevor du fertig meldest):
- node scripts/gen-grinder-docs.mjs ausführen → Doku-Tabellen neu generiert (nicht von Hand editieren).
- node scripts/verify-registry.mjs → 0 Failures (Band-Check, offsetFactor===baseFactor,
  baseMappingHint-Konsistenz, keine Waisen).
- node scripts/snapshot-brews.mjs --after → Diff zeigt NUR neue Zeilen für 'KEY', KEINE Änderung
  an bestehenden Grindern. Danach Baseline neu schreiben: node scripts/snapshot-brews.mjs.

Zeig mir am Ende: berechneter baseFactor + Handrechnung round(22×baseFactor) vs. startBand,
Verify-Ausgabe, den (additions-only) Golden-Diff, geänderte Dateien.
Hinweis: Browser-Smoke-Test (Picker/Chip/Card) mache ich manuell, kannst du nicht automatisieren.
```

---

## PROMPT 2 — Neue Brühmethode hinzufügen (Registry-Welt)

```text
Hallo Claude (VS Code). Bitte füge die Brühmethode "<<METHODE NAME>>" zu dripmate hinzu.
Das Fundament (PROMPT 0) ist erledigt: Methoden sind registry-getrieben. Du fügst GENAU
EINEN Eintrag in js/data/methods.js hinzu — KEINE Edits an index.html, adjustForMethod,
generateBrewSteps, generateBrewNotes, coffee-cards.js oder brew-timer.js.

KONTEXT LESEN (zuerst):
- js/data/methods.js → bestehende Einträge als Vorlage (V60 = baseline ohne adjust;
  Chemex = +3 Comandante / +1°C / ratio≥16.5; AeroPress = −3 / −1°C / ratio≤15). Struktur exakt kopieren.
- scripts/verify-registry.mjs → welche Invarianten geprüft werden.

RECHERCHE (Quelle ins Methoden-Kommentar/Feld):
1. Charakter relativ zu V60: Geometrie (Konus/Flachboden/Immersion), Filterdicke, typische
   Ratio, typische Brühzeit, gröber/feiner & wärmer/kühler. Quellen: Hersteller-Rezept +
   James Hoffmann + Brew-Guides.

ABLEITUNG der adjust-Werte (relativ zur V60-baseline):
- grindComandante: Comandante-Klick-Offset (+ = gröber, − = feiner).
- grindFellow: = grindComandante × 0.25 (gleiches Verhältnis wie bestehende Methoden).
- ratioClamp: { op:'max'|'min'|'none', value:… } (Chemex nutzt max, AeroPress min).
- tempDelta: ±°C. targetTime: 'm:ss-m:ss' (mandatory — used directly as the method's target time).

EINTRAG (genau einer, alphabetisch, KEY kleingeschrieben):
{
  key: 'KEY',
  label: '<Name>',                         // Picker + Auswahl
  pickerDetail: '<Filtertyp · Ratio>',
  stepHeaderLabel: '<Name> Brew Steps',    // Überschrift auf der CoffeeCard
  timerLabel: '<Label>',                   // Snapshot in der Brew-History
  adjust: { grindComandante:…, grindFellow:…, ratioClamp:{op:'…', value:…}, tempDelta:…, targetTime:'…' },
  note: '<Hinweissatz für generateBrewNotes>',
  buildSteps(amount, ratio, waterAmount) {
    // jeder Step: { time:'m:ss', action:'…' }. Wassermengen aus waterAmount = round(amount*ratio)
    // ableiten (siehe V60/Chemex). Gewichte mit 'g' werden von boldWeights() fett gerendert.
    return [ { time:'0:00', action:`Bloom: ${Math.round(amount*3)}g …` }, … ];
  }
}

VERIFIKATION (alle grün, bevor du fertig meldest):
- node scripts/verify-registry.mjs → 0 Failures (Methode vollständig, buildSteps aufrufbar, keine Waisen).
- Simuliere getBrewRecommendations für einen Washed-Kaffee mit dieser Methode und zeig
  grindSetting, temperature, ratio, targetTime und die Steps.
- node scripts/snapshot-brews.mjs --after → Diff zeigt NUR neue Zeilen für 'KEY', KEINE Änderung
  an bestehenden Methoden. Danach Baseline neu schreiben: node scripts/snapshot-brews.mjs.
- Sanity: Mahlgrad/Temp plausibel ggü. V60? (Flachboden eher feiner/heißer, Immersion eher
  gröber, dünner Filter eher feiner.)

Zeig mir am Ende: simuliertes Brew-Ergebnis, Verify-Ausgabe, den (additions-only) Golden-Diff.
Hinweis: Step-Header/Timer/Picker im Browser prüfe ich manuell (kein DOM automatisierbar).
```

---

## C) Status: Fundament erledigt (PROMPT 0)

Die früheren Code↔Doku-Abweichungen sind behoben und die Architektur ist umgestellt.
Reihenfolge der Commits: `ab2c6b8` (Golden Master) → `4c0e1cd` (Doku an Code angeglichen) →
`487d873` (SSOT-Registry + dynamische Picker) → `bcad648` (Doku aus Registry generiert) →
`d367b53` (Verify-Skript). Verify: 139/139 grün · Golden-Diff leer · 165 Kombinationen identisch.

Behoben (Doku zeigte vorher veraltete Werte; jetzt aus Registry generiert):
Timemore S3 `2.5`, Baratza `0.9`, 1Zpresso JX `3.5/30` mit realistischem Band `2.3–3.0 rot`.

**Single Source of Truth:** `js/data/grinders.js` + `js/data/methods.js`. Doku entsteht via
`scripts/gen-grinder-docs.mjs`; Konsistenz/Kalibrierung via `scripts/verify-registry.mjs`;
Regressionsschutz via `scripts/snapshot-brews.mjs` (Baseline in `tests/golden/`).

### Offene, bewusst aufgeschobene Verbesserung (eigener späterer Durchlauf)
Fellow nutzt weiterhin eine **parallele `grindBase.fellow`-Skala** (eigene Faktoren
0.25/0.5/0.75 durch die Pipeline) statt sich wie alle anderen über einen `baseFactor` aus der
Comandante-Basis abzuleiten. Vereinheitlichung wäre sauberer, **ändert aber Fellow-Ausgaben** —
daher NICHT im verhaltensneutralen Fundament. Eigener Schritt mit eigenem Golden-Vergleich, bei
dem der Diff absichtlich nur die zwei Fellow-Grinder betrifft und von Hand gegen Band 3.0–5.0 geprüft wird.
