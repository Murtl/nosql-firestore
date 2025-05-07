import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

async function load(collectionName, filePath, idGenerator) {
    console.log(`📄 Lade Datei: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Datei nicht gefunden: ${filePath}`);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        for (const entry of data) {
            const id = idGenerator(entry);
            console.log(`📄 Schreibe ${collectionName}/${id}...`);
            await db.collection(collectionName).doc(id).set(entry);
            console.log(`✅ ${collectionName}/${id} gespeichert`);
        }

    } catch (err) {
        console.error(`❌ Fehler bei ${collectionName}:`, err.message);
        console.error(err.stack);
    }
}

async function main() {
    console.log("📁 Lade Daten...");

    await load('kurse', '../data/kurse.json', (e) => e.KursNr);
    await load('teilnehmer', '../data/teilnehmer.json', (e) => e.TnNr.toString());
    await load('angebote', '../data/angebote.json', (e) => `${e.AngNr}_${e.KursNr}`);
    await load('kursleiter', '../data/kursleiter.json', (e) => e.PersNr.toString());
    await load('voraussetzungen', '../data/voraussetzungen.json', (e) => `${e.VorNr}_${e.KursNr}`);
    await load('teilnahmen', '../data/teilnahmen.json', (e) => `${e.AngNr}_${e.KursNr}_${e.TnNr}`);
    await load('fuehrt_durch', '../data/fuehrt_durch.json', (e) => `${e.AngNr}_${e.KursNr}`);
    await load('gebuehren', '../data/gebuehren.json', (e) => `${e.AngNr}_${e.KursNr}_${e.TnNr}`);
    await load('kursliteratur', '../data/kursliteratur.json', (e) => e.KursNr);

    console.log("✅ Fertig.");
}

await main();
