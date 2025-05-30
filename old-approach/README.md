# Dokumentation der Semesteraufgabe NoSQL – Firestore - alter Ansatz

## Info

Nach der Zwischenpräsentation am 14.05.2025 hat sich der Ansatz 2 als deutlich besser herausgestellt.
Daher wurde der alte Ansatz komplett verworfen und der neue Ansatz weiter verfolgt.

Alles im Ordner `old-approach` ist nicht mehr relevant und wird nicht mehr weiter verfolgt.

## 1. Ausgangssituation

Die Ausgangslage war eine relationale Kurs-Datenbank, welche in Form von SQL-Dumps (`createKursRel.txt`) vorlag. 
Ziel war es, diese Datenbank in eine NoSQL-Datenbank (Google Firestore) zu überführen.

---

## 2. Wahl der NoSQL-Datenbank

Ausgewählt wurde **Google Firestore**, eine dokumentenbasierte NoSQL-Datenbank. 
Firestore bietet folgende wesentliche Merkmale:

* Dokumentenorientierte Speicherung (JSON-ähnliche Struktur).
* Automatische Skalierung, hoher Bedienkomfort und einfacher Zugriff per SDK (Node.js).

Firestore eignet sich gut für kleinere bis mittelgroße Anwendungen, bei denen schnelle 
Entwicklung und einfache Skalierbarkeit im Vordergrund stehen.

---

## 3. Anpassungen an die Datenbank-Struktur

Aufgrund der unterschiedlichen Natur von relationalen und NoSQL-Datenbanken mussten einige Anpassungen 
vorgenommen werden:

### Relationale Struktur ➡️ NoSQL-Struktur:

**Relationale Tabellen** wurden in Firestore-Collections umgewandelt:

* `Kurs` → Collection: **kurse**
* `Teilnehmer` → Collection: **teilnehmer**
* `Angebot` → Collection: **angebote**
* `Kursleiter` → Collection: **kursleiter**
* `Vorauss` → Collection: **voraussetzungen**
* `Nimmt_teil` → Collection: **teilnahmen**
* `Fuehrt_durch` → Collection: **fuehrt\_durch**
* `Gebuehren` → Collection: **gebuehren**
* `KursLit` → Collection: **kursliteratur**

### ID-Strategie

Die IDs wurden explizit aus den ursprünglichen relationalen Daten generiert, z. B.:

* `kurse`: `KursNr` → `"G08"`
* `teilnehmer`: `TnNr` → `"143"`
* `angebote`: Kombination aus `AngNr` und `KursNr` → `"1_G08"`
* `kursleiter`: `PersNr` → `27183`
* `voraussetzungen`: Kombination aus `VorNr` und `KursNr` → `"G08_I09"`
* `teilnahmen`: Kombination aus `AngNr`, `KursNr` und `TnNr` → `"1_G08_145"`
* `fuehrt_durch`: Kombination aus `AngNr` und `KursNr` → `"1_G08"`
* `gebuehren`: Kombination aus `AngNr`, `KursNr` und `TnNr` → `"1_G08_145"`
* `kursliteratur`: `KursNr` → `"G08"`

Für weitere Informationen zur ID-Strategie siehe `load-data.js`.

---

## 4. CRUD-Operationen

### (C) Create

Das initiale Laden der Daten erfolgte mittels eines Node.js-Skripts `load-data.js`, das JSON-Daten aus 
Dateien liest und mit der zuvor beschriebenen ID-Strategie via Firestore-Client (`google-cloud/firestore`) in die 
lokale Firestore-Emulator-Datenbank schreibt.

### (R) Read

Abfragen wurden als separate Skripte umgesetzt. Beispiele:

* Alle Kursorte ausgeben.
* Teilnehmer aus Augsburg.
* Kursleiter mit Gehalt zwischen 3000€ und 4000€.

Beispiel-Abfrage in JavaScript:

```javascript
const snapshot = await db.collection('kursleiter')
    .where('Gehalt', '>=', 3000)
    .where('Gehalt', '<=', 4000)
    .orderBy('Name')
    .get();

snapshot.forEach(doc => {
    console.log(doc.data());
});
```

### (U) Update

Zwei Update-Operationen wurden umgesetzt:

* Jahreszahlen aller Angebote von 2023 auf 2024 angepasst.
* Alle Angebote, die zuvor in „Wedel“ stattfanden, auf „Augsburg“ geändert.

Beispiel-Update:

```javascript
const snapshot = await db.collection('angebote').where('Ort', '==', 'Wedel').get();
snapshot.forEach(doc => {
    doc.ref.update({ Ort: 'Augsburg' });
});
```

### (D) Delete

Zwei Delete-Operationen wurden realisiert:

* Löschen der Kursliteratur zu „C-Programmierung“.
* Löschen aller Kursangebote mit weniger als 2 Teilnehmern.

Beispiel-Delete:

```javascript
await db.collection('kursliteratur').doc('P13').delete();
```

---

## 5. Erfahrungen mit Firestore

### Vorteile:

* Einfache Installation und intuitive Bedienung mit Node.js.
* Strukturierte und klare API, die CRUD-Operationen deutlich vereinfacht.
* Gute Integration mit Emulator für lokale Entwicklung.

### Herausforderungen:

* Anpassungen beim Übergang von relational zu NoSQL nötig, insbesondere für relationale Abfragen (JOINs).
* IDs mussten strategisch geplant werden, um effiziente Abfragen zu ermöglichen.

Firestore erwies sich als eine flexible und robuste Lösung für Anwendungen, die keine komplexen 
JOIN-Abfragen oder Transaktionen über mehrere Dokumente hinweg erfordern.

---

## 6. Fazit

Die Umstellung von relational zu Firestore erfordert eine gute Planung hinsichtlich Datenmodellierung 
und ID-Verwaltung. Firestore punktet mit einfacher Skalierbarkeit und schnellem Einstieg, stößt aber bei 
komplexen relationalen Strukturen an Grenzen. Für kleinere Anwendungen und Prototypen ist es ideal, für große, 
stark relationale Strukturen sollte eine andere Datenbank erwogen werden.

---
