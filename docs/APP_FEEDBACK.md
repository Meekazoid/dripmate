# App-Feedback — Entwickler-Manual

Tester-Feedback-System für dripmate: Beta-Tester schicken aus der App heraus Feedback (Bug/Wunsch/Lob + Freitext) und melden nicht unterstützte Mühlen/Zubereitungsarten. Im Admin-Panel landen Liste + grobe Wunsch-Rangliste.

> **Nicht verwechseln:** Dieses „App-Feedback" ist getrennt vom **Brew-Feedback / Cupping-System** (`js/feedback.js`, `js/coffee-cards.js`), das Mahlgrad/Temperatur justiert. Namensraum hier durchgehend: `appFeedback` / `app-feedback` / `app_feedback`.

---

## Häufige Anpassungen

### Nudge-Schwelle ändern (ab wie vielen Kaffees die Sprechblase erscheint)
Datei: **`js/app-feedback.js`**, Funktion `checkNudge()`. Aktuell:

```js
if (active < 7) return;   // erst ab 7 nicht-gelöschten Kaffees
```

Den Wert `7` ändern. Sauberer ist es, ihn als benannte Konstante an den Modulanfang zu ziehen (neben `NUDGE_FLAG`):

```js
const NUDGE_MIN_COFFEES = 7;
// ...
if (active < NUDGE_MIN_COFFEES) return;
```

### App-Version pro Release hochzählen
Datei: **`js/config.js`** → `CONFIG.appVersion` (aktuell `'5.3'`). Dieser String wird mit jedem Feedback gespeichert (`app_feedback.app_version`). Bei jedem Release manuell anpassen.

### Nudge zum Testen erneut auslösen
Die Sprechblase wird pro Gerät nur **einmal** gezeigt (Flag im `localStorage`). Zum erneuten Anzeigen in der Browser-Konsole:

```js
localStorage.removeItem('appFeedbackNudgeShown');
```

danach Seite neu laden (und ≥ Schwelle Kaffees vorhanden).

### Cache-Version bumpen (nach Frontend-Änderungen)
`js/app-feedback.js` und `style.css` werden vom Service Worker präcached. Nach jeder Änderung daran in **`sw.js`** `CACHE_VERSION` erhöhen (z.B. `v51.4` → `v51.5`), sonst sehen Tester die alte Fassung. (`index.html` ist `no-cache` und aktualisiert sich sofort.)

---

## Wie der Nudge funktioniert

- **Kein Blinken.** Der Button unten links ist dauerhaft sichtbar und statisch (gleiche Optik wie die vier Buttons unten rechts, erbt `.control-btn`).
- Der **Nudge** ist eine einmalige, wegklickbare Sprechblase über dem Button.
- **Trigger:** nutzungsbasiert, nicht zeitbasiert — erscheint, sobald der Tester ≥ Schwelle (Standard 7) **nicht-gelöschte** Kaffees hat.
- **Einmalig:** Beim Wegklicken *oder* beim Öffnen des Modals wird `localStorage['appFeedbackNudgeShown']` gesetzt; danach nie wieder.
- **Zeitpunkt:** `checkNudge()` läuft in `initApp()` — die Blase erscheint also praktisch beim **nächsten App-Start** nach Erreichen der Schwelle, nicht in der Sekunde des 7. Kaffees.

---

## Architektur / Dateien

### Frontend
| Datei | Rolle |
|---|---|
| `js/app-feedback.js` | Kernmodul: `initAppFeedback()`, `openAppFeedback()`, `closeAppFeedback()`, `checkNudge()`, intern `detectPlatform()`, `_submitAppFeedback()`, `_resetForm()`, `_dismissNudge()`. Konstante `NUDGE_FLAG = 'appFeedbackNudgeShown'`. |
| `js/config.js` | `CONFIG.appVersion`, `CONFIG.backendUrl`. |
| `js/app.js` | Verdrahtung: `initAppFeedback()` + `checkNudge()` in `initApp()`, Klick-/Backdrop-Listener. |
| `index.html` | Inline-`__entryReferrer`-Script im `<head>`; SVG-Symbol `#icon-feedback`; Container `.fixed-controls-left` (Nudge + `#appFeedbackBtn`); Modal `#appFeedbackModal`. |
| `style.css` | `.fixed-controls-left`, `.app-feedback-nudge`, `.app-feedback-chip`, `.app-feedback-check-label`, Status-Klassen. |
| `sw.js` | `/js/app-feedback.js` in `STATIC_ASSETS`; `CACHE_VERSION`. |
| `admin.html` | Sektion „App-Feedback": Filter, Tabelle, Rankings (`loadFeedback`, `renderFeedbackTable`, `updateFeedbackStatus`, `loadRankings`, `renderRankingList`). |

### Backend
| Datei | Rolle |
|---|---|
| `db/database.js` | Tabelle `app_feedback` (Postgres Step 13, SQLite Step 12, idempotent). Queries: `createAppFeedback`, `listAppFeedback`, `updateAppFeedbackStatus`, `getAppFeedbackEquipmentRanking`. |
| `routes/appFeedback.js` | `POST /api/app-feedback`, geschützt durch `authenticateUser`. |
| `routes/admin.js` | `GET /app-feedback`, `GET /app-feedback/rankings`, `PATCH /app-feedback/:id` — hinter dem bestehenden `X-Admin-Token`-Guard. |
| `server.js` | Mountet `appFeedbackRouter` unter `/api/app-feedback`. |

---

## Datenfluss

**Absenden:** Tester öffnet Modal (Button oder Nudge) → `_submitAppFeedback()` → `POST /api/app-feedback` mit Headern `Authorization: Bearer <token>` **und** `X-Device-ID` → `authenticateUser` setzt `req.user` → `createAppFeedback()` → Zeile in `app_feedback`. `user_id` kommt immer aus `req.user.id` (Client-Angaben dazu werden ignoriert).

**Plattform-Erkennung** (`detectPlatform()`, clientseitig):
- `navigator.standalone === true` → `ios_pwa`
- `document.referrer` beginnt mit `android-app://` (beim Start in `window.__entryReferrer` gesichert) → `android_app` (TWA)
- `window.Capacitor` / `window.cordova` → `android_app` (Fallback)
- `display-mode: standalone` → `pwa`
- sonst → `web`, Fehlerfall → `other`

---

## Datenmodell `app_feedback`

| Spalte | Werte / Hinweis |
|---|---|
| `id` | PK |
| `user_id` | FK → users.id, `ON DELETE SET NULL` (Feedback überlebt User-Löschung) |
| `category` | `bug` / `wish` / `praise` / NULL |
| `message` | Pflicht-Freitext |
| `grinder_text` | Wunsch-Mühle (Freitext), nullable |
| `method_text` | Wunsch-Methode (Freitext), nullable |
| `grinder_unsupported` | `0` / `1` (Häkchen) |
| `method_unsupported` | `0` / `1` (Häkchen) |
| `app_version` | aus `CONFIG.appVersion` |
| `platform` | `ios_pwa` / `android_app` / `pwa` / `web` / `other` |
| `status` | `new` / `seen` / `done` (Admin-Workflow) |
| `created_at` | Zeitstempel |

In beiden Dialekten via `CREATE TABLE IF NOT EXISTS` + Index auf `created_at`, läuft beim Serverstart, idempotent, nicht-destruktiv.

---

## Admin-Nutzung

`admin.html` öffnen → Admin-Token eingeben → Sektion **App-Feedback**:
- **Liste** mit Filtern nach `status` und `category`. Pro Zeile Status setzen (`new` → `seen` → `done`).
- **Wunsch-Ranking**: zwei Listen (Mühlen / Methoden) als „Name — N×", absteigend. Bewusst **grobe Zählung** (`lower(trim(...))`, Varianten *nicht* zusammengeführt — „C40" ≠ „comandante c40"). Dient als Startpunkt zum manuellen Sichten, nicht als exakte Statistik.

---

## Etwas erweitern

**Neue Kategorie** (z.B. `question`): an drei Stellen anpassen, sonst greift die Validierung nicht —
1. Chip in `index.html` mit `data-category="question"` (sichtbarer Text frei, `data-category` muss exakt der DB-Wert sein).
2. `CHECK (category IN (...))` in **beiden** Migrations-Blöcken (`db/database.js`).
3. Validierungs-Set in `routes/appFeedback.js`.

**Neuer Status** (z.B. `archived`): `CHECK (status IN (...))` in beiden Migrationen + Validierung in `routes/admin.js` (PATCH) + Option im Admin-UI.

> Achtung: Eine bestehende `CHECK`-Constraint via `CREATE TABLE IF NOT EXISTS` zu ändern wirkt **nicht** auf eine bereits existierende Tabelle. Eine echte Constraint-Änderung in Prod (Postgres) braucht eine separate, additive Migration (`ALTER TABLE … DROP/ADD CONSTRAINT`) — vorsichtig planen, da live.

---

## Testen / Betrieb

- Keine lokale App-Umgebung; alles live auf Railway. Die Tabelle legt sich beim Serverstart selbst an.
- Unit-Tests decken den **SQLite**-Pfad ab (DB-Operationen). Der echte **Postgres-Insert** wird nur in Prod ausgeführt → nach jedem relevanten Deploy einmal ein echtes Test-Feedback aus der App schicken (mit und ohne gesetztes Häkchen) und im Admin prüfen, ob `platform`, die 0/1-Flags und die Rangliste stimmen.
- Migration ist additiv + idempotent; Re-Deploys sind no-op.
