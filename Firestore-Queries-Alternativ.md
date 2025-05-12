
# 📘 Dokumentation – Firestore NoSQL Umsetzung (Subcollection-Modell)

## 1. Einleitung

Ziel dieser Arbeit war die Überführung einer relationalen Kursdatenbank in ein modernes NoSQL-Modell mit Google Firestore.
Statt einer flachen Collection-zu-Tabelle-Umsetzung wurde ein hierarchisches Modell mit **Subcollections** realisiert, das die Vorteile
von Firestore als dokumentenbasierter Datenbank voll ausnutzt.

---

## 2. Datenmodell in Firestore (optimierte Struktur)

Anstelle der ursprünglichen 9 SQL-Tabellen wurden nur **vier Hauptcollections** erstellt, ergänzt um strukturierte **Subcollections**.

### 🔄 Mapping Relationale Tabellen ➝ Firestore Collections

| SQL-Tabelle      | Firestore Collection/Struktur                                 |
|------------------|--------------------------------------------------------------|
| `Kurs`           | `kurse/{KursNr}`                                              |
| `KursLit`        | `kurse/{KursNr}/kursliteratur`                                |
| `Vorauss`        | `kurse/{KursNr}/voraussetzungen`                              |
| `Teilnehmer`     | `teilnehmer/{TnNr}`                                           |
| `Nimmt_teil`     | `teilnehmer/{TnNr}/teilnahmen`                                |
| `Gebuehren`      | Eingebettet in `teilnahmen`-Dokument                         |
| `Angebot`        | `angebote/{AngNr_KursNr}`                                     |
| `Fuehrt_durch`   | `angebote/{AngNr_KursNr}/kursleiter`                          |
| `Kursleiter`     | `kursleiter/{PersNr}`                                         |

### 🧠 Modellierungsprinzipien (NoSQL-Praktiken)

* **Daten nahe an der Nutzung**: Teilnahmen sind direkt bei Teilnehmern gespeichert, Kursleiter (fuehrt_durch) direkt bei Angeboten.
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

## 3. Beispielstruktur in Firestore

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
```

```json
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

```json
"angebote": {
  "1_G08": {
    "KursNr": "G08",
    "Datum": "2023-10-13",
    "Ort": "Augsburg",
    "kursleiter": [ 38197 ],
  }
}
```

---

## 4. CRUD-Operationen

### ✅ Create (Import)

- JSON-Dateien mit verschachtelter Struktur (Subcollections)
- Eingespielt mit `load-data.js`
- IDs: Primärschlüssel aus relationaler Welt (z. B. `KursNr`, `TnNr`, `AngNr_KursNr`)

### 🔍 Read

- Alle Queries wurden an die Subcollection-Struktur angepasst
- Nutzung von `.collection(...).get()` und `.collection(...).doc().collection(...)`
- Beispiel: Teilnehmer, die Kurse am Wohnort belegt haben

```js
const teilnehmerSnap = await db.collection("teilnehmer").get();
for (const tn of teilnehmerSnap.docs) {
    const teilnahmen = await db.collection("teilnehmer").doc(tn.id).collection("teilnahmen").get();
    // ...
}
```

### ✏️ Update

- Datum: 2023 → 2024 in allen Kursangeboten
- Ort: „Wedel“ → „Augsburg“
- Ausgeführt per `.update()` direkt auf Haupt-Collection `angebote`

### 🗑️ Delete

- Kursliteratur zu „C-Programmierung“: gelöscht aus Subcollection `kursliteratur`
- Alle Angebote mit < 2 Teilnehmern: durch Aggregation aus `teilnehmer/*/teilnahmen`

---

## 5. Vorteile des Modells

✅ **Übersichtlich**: Wenige Collections, klar strukturierte Hierarchie  
✅ **Abfragefreundlich**: Daten nah an Nutzungskontext (z. B. Teilnehmer → Teilnahmen)  
✅ **Wartbar**: Jede Entität am logischen Ort  
✅ **NoSQL-konform**: Kein JOIN nötig, flache oder eingebettete Zugriffspfade

---

## 6. Fazit

Durch die Subcollection-basierte Modellierung wurde das Potenzial von Firestore ideal genutzt.
Das Datenmodell ist skalierbar, strukturiert und erlaubt saubere Trennung der Domänen (Kurse, Teilnehmer, Angebote, Kursleiter).
Der Import, die Abfragen sowie Updates/Deletes konnten effizient umgesetzt werden – bei gleichzeitig reduzierter Komplexität.

Dieses Modell eignet sich hervorragend für typische NoSQL-Anwendungsfälle wie Kursverwaltungen, Buchungssysteme oder
Schulungen ohne komplexe relationale Abhängigkeiten.
