# Putenplanung — Rationsberechnung und Anbauplanung

Werkzeug für einen Putenmastbetrieb: berechnet Futterrationen je Mastphase und plant
gleichzeitig, welche Kulturen auf welcher Fläche angebaut und welche Partien verfüttert
statt verkauft werden.

Wird über GitHub Pages veröffentlicht und läuft auf iPad, Handy und PC im Browser.
Die Familie nutzt es vom Startbildschirm aus wie eine App. Kein Server, keine Anmeldung.

## Betrieb

- Puten- und Hühnerhaltung, rund 600 ha, sandige Böden in Sachsen
- Ein Teil des Futtergetreides kommt vom eigenen Betrieb, der Rest wird zugekauft
- Nutzer ist Landwirt und Agrarstudent, kein Softwareentwickler. Auch die Eltern
  arbeiten mit dem Werkzeug, überwiegend am Handy

## Sprache und Ton

- **Code, Kommentare, Oberfläche, Commit-Messages und Antworten auf Deutsch**
- Fachbegriffe der Fütterung deutsch verwenden: Einwaage, Ration, Mischung, Anteil,
  Höchstanteil, Rohprotein, Alleinfutter. Nicht "Blend", "Constraint", "Feature"
- Meldungen in der Oberfläche sagen, was zu tun ist, nicht was technisch schiefging

## Datenschutz — die wichtigste Regel

Die veröffentlichte Seite ist öffentlich im Internet erreichbar.

- **Niemals Betriebsdaten ins Repository schreiben.** Keine Preise, Erträge, Flächen,
  Tierzahlen oder Vorräte des Betriebs im Code, in Beispieldateien oder in Tests.
  Die eingebauten Startwerte sind allgemeine Tabellenwerte und bleiben das auch
- Eingegebene Daten bleiben auf dem Gerät des Nutzers
- Beim Teilen per Link stehen die Daten ausschließlich im Fragment hinter `#`.
  Dieser Teil wird vom Browser nie an den Server übertragen. Niemals in den
  Query-String (`?`) legen und niemals irgendwohin senden

## Fachliche Grundlagen — die Einheiten sind die häufigste Fehlerquelle

- Nährwerte stehen **je kg Ware bei 88 % TS**, nicht je kg Trockenmasse
- Energie: ME in **MJ/kg** (Geflügel, umsetzbare Energie). Alles andere in **Prozent**
- Anteile in der Ration: **Prozent der Mischung**, Summe genau 100
- Mengen im Jahresmodell: **Tonnen**. Preise: **€ je Tonne**. In der Praxis rechnet der
  Betrieb oft in €/dt — bei Anzeigen beides sauber auseinanderhalten
- Aminosäuren gibt es in zwei Sätzen, die **niemals gemischt werden dürfen**:
  - brutto: `lys`, `mc`, `thr` (Gesamtaminosäuren)
  - praecaecal verdaulich: `plys`, `pmc`, `pthr`
  Umgestellt wird immer beides gleichzeitig — Futtermittelwerte **und** Bedarfsnormen.
  Werden verdauliche Futterwerte gegen Bruttobedarf gerechnet, ist die Ration
  unterversorgt, ohne dass es auffällt
- Phasen: Hähne P1–P6 bis zur 21./22. Woche, Hennen H1–H5 bis zur 16. Woche.
  Frühe Phasen brauchen viel Protein bei wenig Energie, späte umgekehrt
- Bedarfswerte sind Richtwerte. Vorgaben des Züchters (Aviagen, Hybrid) und die Werte
  des Mischfutterwerks gehen vor. Nichts fest verdrahten, alles editierbar lassen

## Aufbau der Rechnung

Zwei lineare Optimierungsprobleme, gelöst mit einem eigenen Zwei-Phasen-Simplex
(kein externes Paket, damit die Seite ohne Abhängigkeiten läuft).

**Einzelne Phase:** Variablen sind die Anteile je Futtermittel in Prozent.
Nebenbedingungen: Summe = 100, Nährstoffgrenzen der Phase, Höchst- und Mindestanteile
je Komponente. Ziel: geringste Kosten.

**Jahresmodell:** ein einziges LP über alle Phasen und Kulturen.
- `f[i][p]` Tonnen Komponente i in Phase p
- `h[c]` Hektar je Kultur (nur im Flächenmodus)
- `v[c]` Tonnen Verkauf je Kultur
- `z[i]` Tonnen Zukauf
- Ziel: Anbaukosten + Zukauf − Verkaufserlöse, minimiert

Zeilen: Einwaage je Phase, Nährstoffgrenzen je Phase, Höchstanteile je Komponente und
Phase, Erntebilanz je Kultur, Gesamtfläche, Fruchtfolgegrenzen je Kultur und Gruppe.

### Zwei Fallstricke, die schon einmal zugeschlagen haben

1. **Verkauf muss auf die eigene Ernte begrenzt sein.** Ohne die Zeile
   `v[c] ≤ ertrag · h[c]` kauft die Rechnung unbegrenzt zu und verkauft weiter,
   sobald irgendwo der Zukaufpreis unter dem Verkaufspreis liegt. Das LP wird dann
   unbeschränkt. Diese Schranke bei jeder Änderung am Modell erhalten.
2. **Der Dualwert der Einwaage-Zeile sind nicht die Futterkosten.** Weil die rechten
   Seiten der Nährstoff- und Anteilszeilen ebenfalls an der Phasenmenge hängen, misst
   dieser Dualwert nur einen Teil. Die Futterkosten je Phase werden aus der Lösung
   bewertet: Zukaufware zum Marktpreis, Eigenware zu ihrem innerbetrieblichen Wert
   (negativer Dualwert der Erntebilanz). Das stimmte im Test exakt mit einer
   Störrechnung überein — bei Änderungen erneut so prüfen.

### Zur Auslegung der Ergebnisse

- **Wert im Trog** = negativer Dualwert der Erntebilanz. Solange Zukauf unbegrenzt
  erlaubt ist, deckelt der Zukaufspreis diesen Wert. Echte Knappheitswerte entstehen
  erst, wenn Zukauf gesperrt oder begrenzt ist
- Schattenpreise sind **örtliche Steigungen**: gültig für kleine Änderungen
- Bei degenerierten Lösungen sind Dualwerte nicht eindeutig. Zwei Läufe können
  unterschiedliche Schattenpreise bei gleichem Zielwert liefern — kein Fehler

## Technische Konventionen

- JavaScript ohne Build-Schritt und ohne Laufzeit-Abhängigkeiten
- Kein CDN, keine Web-Fonts. Alles liegt im Repository
- Einstiegsdatei heißt `index.html`, sonst liefert GitHub Pages sie nicht direkt aus
- Wird der Code in Dateien zerlegt: **einfache `<script src="...">`-Tags, kein
  `type="module"`.** Module werden beim Öffnen vom Dateisystem (`file://`) vom Browser
  blockiert; mit einfachen Skript-Tags läuft die Seite sowohl über Pages als auch per
  Doppelklick
- Rechenkern (`solver`, `modell`) strikt getrennt von der Oberfläche, damit er ohne
  Browser mit node getestet werden kann
- Zahlen im deutschen Format anzeigen (Komma), intern Punkt
- Bedienbar am Handy: ausreichend große Tippflächen, Tabellen horizontal scrollbar,
  Zahlenfelder mit passender Tastatur

## Speichern und Teilen

- **Automatisch merken:** Der komplette Stand wird im Browser gespeichert und beim
  Öffnen wiederhergestellt. Fehlt ein gespeicherter Stand, gelten die Startwerte.
  Ein Knopf setzt alles zurück, mit Rückfrage
- **Teilen per Link:** erzeugt eine Adresse mit dem Stand im Fragment und kopiert sie
  in die Zwischenablage. Beim Öffnen fragt das Programm, ob der Stand übernommen
  werden soll — nie ungefragt überschreiben
- **Sichern und Laden als Datei** bleibt zusätzlich erhalten
- Der gespeicherte Stand braucht eine Versionsnummer, damit ältere Stände nach
  Änderungen an der Datenstruktur nicht zu Abstürzen führen, sondern sauber
  aufgefangen werden

## Tests

Der Rechenkern ist ohne Tests nicht vertrauenswürdig: eine falsche Ration sieht am
Bildschirm richtig aus und fällt erst im Stall auf. Vor jeder Änderung am Modell:

- Simplex gegen von Hand nachgerechnete Beispiele, einschließlich der Dualwerte
- Zufallsprobleme, bei denen jede Nebenbedingung der Lösung nachgerechnet wird
- Jahresmodell: Einwaage je Phase, alle Nährstoffgrenzen, Höchstanteile, Erntebilanz,
  Flächensumme, Fruchtfolge- und Gruppengrenzen gegen die Lösung nachrechnen
- Unlösbare Fälle müssen als unlösbar erkannt werden, nicht stillschweigend etwas liefern
- Dualwerte gegen eine Störrechnung: rechte Seite um eine Einheit ändern, neu rechnen,
  Zieldifferenz mit dem gemeldeten Dualwert vergleichen
- Speichern und Teilen: Stand sichern, wieder laden, mit dem Original vergleichen

Bei Änderungen an Nährwerten oder Bedarfsnormen zusätzlich einen Lauf mit
realistischen Zahlen ansehen und die Rezeptur fachlich prüfen. Eine mathematisch
optimale Ration kann fütterungstechnisch unsinnig sein.

## Offene Punkte

- Chargendokumentation: welche Mischung wurde wann in welcher Menge gefahren
- Mehrjahresbetrachtung mit echter Fruchtfolge statt nur Flächenanteilen
- Eigene Analysewerte je Partie statt Tabellenwerten, mit Erntejahr
- Silo- und Bestellplanung aus dem Futterbedarf
- Phytase und Elektrolytbilanz (dEB) — beide mit direkten Folgen für
  Fußballengesundheit und Phosphorbedarf
