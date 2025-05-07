# Dokumentation der Semesteraufgabe NoSQL – Firestore

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


Gerne! Hier ist eine überarbeitete Version von **„3. Anpassungen an die Datenbank-Struktur“** – passend zu deiner aktuellen, verbesserten Firestore-Umsetzung mit **vier Hauptcollections und Subcollections**:

---

## 3. Alternativ: Anpassungen an die Datenbank-Struktur (optimiertes NoSQL-Modell mit Subcollections)

Da Firestore als dokumentenbasierte NoSQL-Datenbank arbeitet und keine Joins wie relationale Systeme unterstützt, wurde die ursprüngliche relationale Struktur logisch in vier Haupt-Collections mit verschachtelten **Subcollections** umgewandelt.

### 📦 Neue Struktur in Firestore:

| Relationale Tabelle | Firestore-Struktur                                   |
| ------------------- | ---------------------------------------------------- |
| `Kurs`              | Collection: `kurse` → Dokument-ID: `KursNr`          |
| `KursLit`           | Subcollection: `kurse/{KursNr}/kursliteratur`        |
| `Vorauss`           | Subcollection: `kurse/{KursNr}/voraussetzungen`      |
| `Teilnehmer`        | Collection: `teilnehmer` → Dokument-ID: `TnNr`       |
| `Nimmt_teil`        | Subcollection: `teilnehmer/{TnNr}/teilnahmen`        |
| `Gebuehren`         | als Feld in `teilnahmen` enthalten                   |
| `Angebot`           | Collection: `angebote` → Dokument-ID: `AngNr_KursNr` |
| `Fuehrt_durch`      | Subcollection: `angebote/{AngNr_KursNr}/kursleiter`  |
| `Kursleiter`        | Collection: `kursleiter` → Dokument-ID: `PersNr`     |

---

### 🧠 Modellierungsprinzipien (NoSQL-Praktiken)

* **Daten nahe an der Nutzung**: Teilnahmen sind direkt bei Teilnehmern gespeichert, Kursleiter direkt bei Angeboten.
* **Verzicht auf Joins**: Keine Fremdschlüssel, sondern Einbettung/Verknüpfung durch klare Pfade und dokumentorientierte Struktur.
* **Lesefreundlich**: Oft genutzte Daten (z. B. Kursliteratur, Gebühren) sind direkt dort verfügbar, wo sie gebraucht werden.

---

### 🔑 ID-Strategie

In Firestore ist jede Subcollection unter einem bestimmten Pfad gespeichert. Die Hauptdokumente verwenden weiterhin die aus relationaler Sicht eindeutigen Primärschlüssel:

| Collection   | ID                                      |
| ------------ | --------------------------------------- |
| `kurse`      | `KursNr` (z. B. `"G08"`)                |
| `teilnehmer` | `TnNr` als String (z. B. `"143"`)       |
| `angebote`   | Kombi: `AngNr_KursNr` (z. B. `"1_G08"`) |
| `kursleiter` | `PersNr` als String (z. B. `"29594"`)   |

Subcollections nutzen systematisch generierte Dokument-IDs oder einfache strukturierte Felder (`teilnahme_0`, `standard`, etc.).

---

### 📄 Beispielstruktur: Firestore (vereinfacht)

```json
"kurse": {
  "P13": {
    "Titel": "C-Programmierung",
    "kursliteratur": {
      "standard": { "Bestand": 3, "Bedarf": 5, "Preis": 15.20 }
    },
    "voraussetzungen": {
      "G08": { "Voraussetzung": "G08" },
      "G10": { "Voraussetzung": "G10" }
    }
  }
}

"teilnehmer": {
  "143": {
    "Name": "Schmidt, M.",
    "Ort": "Wedel",
    "teilnahmen": {
      "teilnahme_0": { "AngNr": 2, "KursNr": "G08", "Gebuehr": 500 }
    }
  }
}
```

---

### 🔁 Vorteile dieser alternativen Struktur

* ✅ **CRUD-freundlich**: Einfaches Lesen, Aktualisieren und Löschen einzelner Entitäten
* ✅ **Skalierbar**: Ideal für Firestore, keine Abhängigkeit von JOINs
* ✅ **Klar strukturiert**: Entitäten sind dort gespeichert, wo sie logisch hingehören
* ✅ **Weniger Redundanz**: Subcollections ermöglichen Wiederverwendung bei geringerer Duplikation

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
