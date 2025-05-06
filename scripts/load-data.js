import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

async function load(collectionName, filePath) {
    console.log(`📄 Lade Datei: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Datei nicht gefunden: ${filePath}`);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        for (const entry of data) {
            const { id, ...rest } = entry;
            console.log(`📄 Schreibe ${collectionName}/${id}...`);
            await db.collection(collectionName).doc(id).set(rest);
            console.log(`✅ ${collectionName}/${id} gespeichert`);
        }

    } catch (err) {
        console.error(`❌ Fehler bei ${collectionName}:`, err.message);
        console.error(err.stack);
    }
}

async function main() {
    console.log("📁 Lade Daten...");
    await load('Kurse', '../data/kurse.json');
    await load('Kursleiter', '../data/kursleiter.json');
    await load('Teilnehmer', '../data/teilnehmer.json');
    console.log("✅ Fertig.");
}

await main();