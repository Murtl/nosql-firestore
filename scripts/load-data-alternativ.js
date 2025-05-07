import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

// Emulator-Verbindung setzen
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

/**
 * Lädt ein JSON-Objekt in eine Collection mit der gegebenen ID-Struktur.
 * @param {string} collectionName - Name der Haupt-Collection in Firestore
 * @param {string} filePath - Pfad zur JSON-Datei
 */
async function loadStructuredData(collectionName, filePath) {
    console.log(`📄 Lade ${collectionName} aus Datei: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Datei nicht gefunden: ${filePath}`);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        for (const id of Object.keys(data)) {
            const document = data[id];
            console.log(`📄 Schreibe ${collectionName}/${id}...`);

            // Schreibe das Hauptdokument
            const docRef = db.collection(collectionName).doc(id);
            const { teilnahmen, kursliteratur, voraussetzungen, kursleiter, ...mainData } = document;
            await docRef.set(mainData);

            // Falls eingebettete Subcollections vorhanden sind
            if (teilnahmen) {
                for (const [index, t] of teilnahmen.entries()) {
                    await docRef.collection('teilnahmen').doc(`teilnahme_${index}`).set(t);
                }
            }

            if (kursliteratur && Object.keys(kursliteratur).length > 0) {
                await docRef.collection('kursliteratur').doc('standard').set(kursliteratur);
            }

            if (voraussetzungen && voraussetzungen.length > 0) {
                for (const v of voraussetzungen) {
                    await docRef.collection('voraussetzungen').doc(v).set({ Voraussetzung: v });
                }
            }

            if (kursleiter && kursleiter.length > 0) {
                for (const pid of kursleiter) {
                    await docRef.collection('kursleiter').doc(pid.toString()).set({ PersNr: pid });
                }
            }

            console.log(`✅ ${collectionName}/${id} gespeichert`);
        }

    } catch (err) {
        console.error(`❌ Fehler beim Laden von ${collectionName}:`, err.message);
        console.error(err.stack);
    }
}

async function main() {
    console.log("🚀 Starte Datenimport in Firestore...");

    /**
     * Hauptcollection: kurse
     * Struktur: beinhaltet kursliteratur & voraussetzungen als Subcollections
     */
    await loadStructuredData('kurse', '../data-alternativ/kurse.json');

    /**
     * Hauptcollection: teilnehmer
     * Struktur: beinhaltet teilnahmen (mit Gebühr) als Subcollection
     */
    await loadStructuredData('teilnehmer', '../data-alternativ/teilnehmer.json');

    /**
     * Hauptcollection: angebote
     * Struktur: beinhaltet kursleiter als Subcollection
     */
    await loadStructuredData('angebote', '../data-alternativ/angebote.json');

    /**
     * Hauptcollection: kursleiter
     * Struktur: flache Struktur ohne Subcollections
     */
    await loadStructuredData('kursleiter', '../data-alternativ/kursleiter.json');

    console.log("✅ Alle Daten erfolgreich geladen.");
}

await main();
