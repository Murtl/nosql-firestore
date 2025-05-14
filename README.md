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
- Die Skripte sind bereits in der `package.json` als `npm`-Skripte hinterlegt, sodass sie einfach mit 
  ```bash
  npm run <script-name>
  ```
  ausgeführt werden können. Zum Beispiel:
  ```bash
  npm run load-data
  ```


## Verzeichnisstruktur
- `data/` - Enthält die Daten im json-Format, die über die Skripte in unsere Firestore-DB geschrieben werden
- `docu/` - Enthält die Dokumentation
- `firestore-emulator/` - Enthält den Emulator
- `node_modules/` - Enthält die Abhängigkeiten, die über `npm install` installiert werden
- `old-approach/` - Enthält den alten Ansatz, der nicht mehr verwendet wird
- `scripts/` - Enthält die Skripte, die unsere CRUD-Operation für die Firestore-DB durchführen

  