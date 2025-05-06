# nosql-firestore
Umsetzung der Semesteraufgabe im Wahlfach NoSQL mit Firestore (lokal) im SoSe25

## Aufsetzung des Firestore-Emulators
- da wir keine Cloud-Lösungen verwenden sollen, wird der Firestore-Emulator lokal aufgesetzt
- dazu sind folgende Schritte Voraussetzungen nötig:
  - Node.js Version 16.0 oder höher installieren
  - Java JDK Version 11 oder höher installieren
  - Firebase CLI installieren
    ```bash
    npm install -g firebase-tools
    ```
  - In Firebase einloggen
    ```bash
    firebase login
    ```
    (Läuft zwar nicht in der Cloud, aber trotzdem nötig, damit man das lokal nutzen kann etc.)
- Dann einfach in dem Projektverzeichnis firebase-emulator den Emulator starten:
  ```bash
  firebase emulators:start
  ```
- Der Emulator läuft dann auf `localhost:8080` und kann über die Firebase Console 
(http://127.0.0.1:4040/firestore/) verwaltet werden.


## Nutzung des Emulators
- Im Stammverzeichnis die Abhängigkeiten installieren:
  ```bash
  npm install
  ```
- Nachdem der Emulator läuft, können die Skripte aus dem `scripts`-Ordner ausgeführt werden
- Die Skripte sind in JavaScript geschrieben und können mit Node.js im Ordner scripts ausgeführt werden (Standard für Firestore):
  ```bash
  node <script-name>.js
  ```

## Verzeichnisstruktur
- `data/` - Enthält die Daten im json-Format, die über die Skripte in unsere Firestore-DB geschrieben werden
- `firestore-emulator/` - Enthält den Emulator
- `scripts/` - Enthält die Skripte, die unsere CRUD-Operation für die Firestore-DB durchführen


## Anwendungsbeispiel
(Wichtig: Im Terminal nach ./scripts navigieren, um die Skripte auszuführen)
- `scripts/load-data.js` - Beispiel für das Einfügen von Daten in die Firestore-DB
  ```bash
    node load-data.js 
    ```
- `scripts/query-examples.js` - Beispiel für das Auslesen von Daten mit Bedingungen aus der Firestore-DB
  ```bash
    node query-examples.js 
  ```
  