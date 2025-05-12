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

    /**
     * @old-relational-table Kurs
     * @table kurse
     * @id Für die Kurse-Tabelle wird die KursNr als ID verwendet
     */
    await load('kurse', '../data/kurse.json', (e) => e.KursNr);

    /**
     * @old-relational-table Teilnehmer
     * @table teilnehmer
     * @id Für die Teilnehmer-Tabelle wird die TnNr als ID verwendet
     */
    await load('teilnehmer', '../data/teilnehmer.json', (e) => e.TnNr.toString());

    /**
     * @old-relational-table Angebot
     * @table angebote
     * @id Für die Angebote-Tabelle wird die Kombination aus AngNr und KursNr als ID verwendet
     */
    await load('angebote', '../data/angebote.json', (e) => `${e.AngNr}_${e.KursNr}`);

    /**
     * @old-relational-table Kursleiter
     * @table kursleiter
     * @id Für die Kursleiter-Tabelle wird die PersNr als ID verwendet
     */
    await load('kursleiter', '../data/kursleiter.json', (e) => e.PersNr.toString());

    /**
     * @old-relational-table Vorauss
     * @table voraussetzungen
     * @id Für die voraussetzungen-Tabelle wird die Kombination aus VorNr und KursNr als ID verwendet
     * @note Könnte man als direkte Subcollection unter kurse/KursNr anlegen.
     */
    await load('voraussetzungen', '../data/voraussetzungen.json', (e) => `${e.VorNr}_${e.KursNr}`);

    /**
     * @old-relational-table Nimmt_teil
     * @table teilnahmen
     * @id Für die Teilnahmen-Tabelle wird die Kombination aus AngNr, KursNr und TnNr als ID verwendet
     * @note Könnte man als direkte Subcollection unter teilnehmer/TnNr anlegen.
     */
    await load('teilnahmen', '../data/teilnahmen.json', (e) => `${e.AngNr}_${e.KursNr}_${e.TnNr}`);

    /**
     * @old-relational-table Fuehrt_durch
     * @table fuehrt_durch
     * @id Für die fuehrt_durch-Tabelle wird die Kombination aus AngNr und KursNr als ID verwendet
     * @note Da ein Kursangebot nur einen Kursleiter hat, ist die Zusammensetzung aus AngNr und KursNr ausreichend.
     * Sobald es aber mehrere Kursleiter für ein Angebot gibt, muss die PersNr auch in die ID aufgenommen werden.
     * @note2 Könnte man als direkte Subcollection unter angebote/AngNr_KursNr anlegen.
     */
    await load('fuehrt_durch', '../data/fuehrt_durch.json', (e) => `${e.AngNr}_${e.KursNr}`);

    /**
     * @old-relational-table Gebuehren
     * @table gebuehren
     * @id Für die gebuehren-Tabelle wird die Kombination aus AngNr, KursNr und TnNr als ID verwendet
     * @note Könnte man als direkte Subcollection unter teilnahmen/AngNr_KursNr anlegen.
     */
    await load('gebuehren', '../data/gebuehren.json', (e) => `${e.AngNr}_${e.KursNr}_${e.TnNr}`);

    /**
     * @old-relational-table KursLit
     * @table kursliteratur
     * @id Für die kursliteratur-Tabelle wird die KursNr als ID verwendet
     * @note Könnte man als direkte Subcollection unter kurse/KursNr anlegen.
     */
    await load('kursliteratur', '../data/kursliteratur.json', (e) => e.KursNr);

    console.log("✅ Fertig.");
}

await main();
