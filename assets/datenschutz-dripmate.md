# Datenschutzerklärung

**Stand: Mai 2026**

---

## 1. Datenschutz auf einen Blick

### Allgemeine Hinweise

Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie die Website dripmate.app oder die Webanwendung „DripMate" besuchen oder nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer nachfolgenden Datenschutzerklärung.

### Wer ist verantwortlich?

Die Datenverarbeitung auf dieser Website und in der App erfolgt durch den Betreiber (siehe Abschnitt 2).

### Welche Daten erfassen wir?

Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z. B. bei der Registrierung oder der Eingabe von Kaffeedaten). Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst (z. B. IP-Adresse, Browsertyp, Geräteinformationen).

### Wofür nutzen wir Ihre Daten?

Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung und die geräteübergreifende Synchronisation der App-Inhalte zu gewährleisten. Weitere Daten dienen der Authentifizierung, der KI-gestützten Kaffeebeutel-Analyse sowie der Nutzungskontingentierung.

### Welche Rechte haben Sie?

Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem das Recht auf Berichtigung, Einschränkung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.

---

## 2. Allgemeine Hinweise und Pflichtinformationen

### Verantwortliche Stelle

Die verantwortliche Stelle für die Datenverarbeitung ist:

[Dein Vorname] [Dein Nachname]  
c/o [Name des Adressanbieters]  
[Straße, Hausnummer]  
[PLZ, Ort]  
E-Mail: support@dripmate.app

### Datenschutz

Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften (DSGVO) sowie dieser Datenschutzerklärung.

### Widerruf Ihrer Einwilligung

Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt davon unberührt.

### Beschwerderecht

Im Falle von Verstößen gegen die DSGVO steht Ihnen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthaltsortes, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.

### Recht auf Datenübertragbarkeit

Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen.

---

## 3. Hosting und Infrastruktur

### Frontend-Hosting – Vercel

Die Webanwendung (dripmate.app) wird über den Dienst **Vercel Inc.**, 440 N Barranca Ave #4133, Covina, CA 91723, USA, gehostet. Beim Aufruf der Website werden automatisch Server-Log-Daten erfasst, darunter IP-Adresse, Browsertyp, Betriebssystem, Referrer-URL und Uhrzeit des Zugriffs.

Vercel ist unter dem EU-US Data Privacy Framework zertifiziert. Mit Vercel wurde ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO abgeschlossen. Die Übermittlung in die USA erfolgt auf Grundlage von Art. 45 DSGVO (Angemessenheitsbeschluss) bzw. Art. 46 DSGVO (Standardvertragsklauseln).

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem zuverlässigen Betrieb der Anwendung).

### Backend-Hosting und Datenbank – Railway

Das Backend (API-Server) sowie die PostgreSQL-Produktionsdatenbank werden bei **Railway Corp.**, 340 S Lemon Ave #7404, Walnut, CA 91789, USA, betrieben. Hier werden alle nutzerbezogenen Daten (Konten, Kaffeedaten, Einstellungen) dauerhaft gespeichert.

Mit Railway wurde ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO abgeschlossen. Die Übermittlung in die USA erfolgt auf Grundlage von Standardvertragsklauseln (Art. 46 DSGVO).

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung und Vertragsanbahnung).

---

## 4. Registrierung und Authentifizierung

### Beta-Registrierung

Sie können sich über das Registrierungsformular auf dripmate.app für die Nutzung von DripMate anmelden. Die ersten 200 Registrierungen erfolgen ohne vorherige Einladung (Open Beta). Danach ist eine Aufnahme in die Warteliste notwendig.

Verarbeitete Daten: E-Mail-Adresse, generierter Zugangs-Token (Format: BREW-XXXXXX), Zeitstempel der Registrierung.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).

### Token-basierte Authentifizierung und Gerätebindung

Nach erfolgreicher Registrierung erhalten Sie einen persönlichen Zugangs-Token. Dieser Token wird beim ersten Aktivieren an eine gerätespezifische Kennung (Device ID) gebunden, die im Browser-Speicher (localStorage) und auf unserem Server gespeichert wird. Zusätzlich werden technische Geräteinformationen (Betriebssystem, Plattform, User-Agent-String) erfasst und gespeichert, um die Kontoverwaltung zu unterstützen.

Die Gerätebindung dient dem Schutz Ihres Kontos: Sie verhindert, dass ein unbefugt erlangter Token von einem fremden Gerät aus genutzt werden kann, ohne dass ein Magic Link angefordert wird.

Verarbeitete Daten: Zugangs-Token, Device ID (gerätespezifischer Fingerabdruck), Betriebssystem, Plattform, User-Agent-String, letzter Login-Zeitstempel.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Kontosicherheit).

### Magic Links (passwortlose Anmeldung und Kontowiederherstellung)

Zur passwortlosen Anmeldung sowie zur Kontowiederherstellung (z. B. nach Löschung des Browser-Speichers) senden wir Ihnen auf Anfrage einen einmalig nutzbaren Magic Link per E-Mail zu. Dieser Link ist 15 Minuten gültig und wird nach Verwendung als genutzt markiert.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / Bereitstellung der Kernfunktion).

---

## 5. E-Mail-Versand

### Transaktionale E-Mails – Resend

Für den Versand transaktionaler E-Mails (Zugangs-Token, Magic Links) nutzen wir den Dienst **Resend** (Resend Inc., 2261 Market Street #4556, San Francisco, CA 94114, USA).

Resend ist unter dem EU-US Data Privacy Framework zertifiziert. Mit Resend wurde ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO abgeschlossen. Die Übermittlung in die USA erfolgt auf Grundlage von Art. 45 DSGVO (Angemessenheitsbeschluss) bzw. Art. 46 DSGVO (Standardvertragsklauseln).

**Hinweis zur Datenregion:** Wir empfehlen, im Resend-Dashboard die EU-Datenregion zu aktivieren, sofern verfügbar, um die Datenübermittlung in die USA auf das technisch notwendige Minimum zu reduzieren.

Verarbeitete Daten: E-Mail-Adresse, Inhalt der System-E-Mail (Token oder Magic Link), Versandzeitpunkt.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).

### Domain und E-Mail-Postfach – IONOS

Die Domain dripmate.app sowie das E-Mail-Postfach support@dripmate.app werden über **IONOS SE**, Elgendorfer Str. 57, 56410 Montabaur, Deutschland, verwaltet. Eingehende Supportanfragen an support@dripmate.app werden dort empfangen und von uns bearbeitet.

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Erreichbarkeit für Nutzeranfragen).

---

## 6. KI-gestützte Kaffeebeutel-Analyse

### Anthropic API

DripMate bietet eine optionale Funktion zur automatischen Erkennung von Kaffeedaten aus Fotos von Kaffeebeuteln. Wenn Sie diese Funktion nutzen, wird das von Ihnen aufgenommene oder ausgewählte Foto (als Base64-kodierte Bilddaten) an die API von **Anthropic, PBC**, 548 Market St PMB 90375, San Francisco, CA 94104, USA, übermittelt. Die KI analysiert das Bild und extrahiert strukturierte Kaffeedaten (z. B. Name, Herkunft, Verarbeitung, Röstnotizen).

Das Foto wird von Anthropic ausschließlich zur Durchführung der Analyse verarbeitet und nicht dauerhaft gespeichert oder für das Training von KI-Modellen verwendet (gemäß den API-Nutzungsbedingungen von Anthropic). Mit Anthropic wurde ein Vertrag zur Auftragsverarbeitung (Data Processing Agreement) gemäß Art. 28 DSGVO abgeschlossen. Die Übermittlung in die USA erfolgt auf Grundlage von Standardvertragsklauseln (Art. 46 DSGVO).

Verarbeitete Daten: Bilddaten (Foto des Kaffeebeutels), extrahierte Kaffeedaten.

Nutzungslimit: Pro Nutzer sind maximal 5 erfolgreiche KI-Scans pro Tag (UTC) möglich. Die Anzahl der täglichen Scans wird pro Nutzer in unserer Datenbank gespeichert.

Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Nutzung der Funktion).

**Hinweis:** Die Nutzung der KI-Scan-Funktion ist freiwillig. Kaffeedaten können alternativ jederzeit manuell eingegeben werden.

---

## 7. Nutzerdaten und App-Inhalte

### Gespeicherte Nutzerdaten

Im Rahmen der Nutzung von DripMate werden folgende Daten auf unseren Servern gespeichert:

- E-Mail-Adresse (für Magic Link und Kontowiederherstellung)
- Benutzername (automatisch generiert)
- Kaffeeprofile (Kaffeename, Herkunft, Verarbeitung, Varietät, Höhe, Röster, Geschmacksnotizen)
- Brüheinstellungen (Mahlgrad, Temperatur, Wassermengen, Brühschritte)
- Brüh-Feedback (Bitterkeit, Süße, Säure, Body) und Anpassungshistorie
- Grinder-Präferenz, Brühmethode (V60, Chemex, AeroPress), Wasserhärte
- Anzahl täglicher KI-Scans (Quota-Verwaltung)

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / Bereitstellung der App-Funktionen).

### Lokale Datenspeicherung (localStorage / Service Worker)

Damit DripMate als Progressive Web App (PWA) auch offline funktioniert und Ihre Daten nicht bei jedem Seitenaufruf verloren gehen, werden Session-Daten, Ihr Zugangs-Token, Ihre Device ID sowie temporäre Brühdaten im lokalen Speicher Ihres Browsers (localStorage / IndexedDB) gespeichert. Ein Service Worker ermöglicht das Offline-Caching der App-Shell.

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technisch einwandfreien Bereitstellung des Dienstes).

---

## 8. Schriftarten (Lokales Hosting)

DripMate nutzt zur einheitlichen Darstellung die Schriftart „Sora". Um den Datenschutz unserer Nutzer zu gewährleisten, wird diese Schriftart ausschließlich lokal über unsere eigene Infrastruktur (Vercel) gehostet und direkt mit der Anwendung ausgeliefert. Beim Aufruf der Anwendung werden keine Daten an Google-Server oder andere Dritte übermittelt.

---

## 9. Ihre Rechte

### Auskunft, Berichtigung, Löschung

Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger sowie den Zweck der Verarbeitung. Sie haben außerdem das Recht, die Berichtigung oder Löschung dieser Daten zu verlangen, soweit dem keine gesetzlichen Aufbewahrungspflichten entgegenstehen.

### Einschränkung der Verarbeitung

Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.

### **Information über Ihr Widerspruchsrecht nach Art. 21 DSGVO**

**Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 Abs. 1 lit. f DSGVO (Datenverarbeitung auf der Grundlage einer Interessenabwägung) erfolgt, Widerspruch einzulegen. Legen Sie Widerspruch ein, werden wir Ihre personenbezogenen Daten nicht mehr verarbeiten, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.**

### Kontakt für Datenschutzanfragen

Für alle Anfragen zum Datenschutz wenden Sie sich bitte per E-Mail an: support@dripmate.app

---

## 10. Änderungen dieser Datenschutzerklärung

Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie stets den aktuellen rechtlichen Anforderungen oder Änderungen unserer Dienste zu entsprechen. Die jeweils aktuelle Version ist unter dripmate.app/datenschutz abrufbar. Wir empfehlen, diese Seite regelmäßig zu besuchen.
