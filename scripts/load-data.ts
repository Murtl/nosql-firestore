import fs from 'fs';
import { Firestore, Timestamp, FirestoreDataConverter } from '@google-cloud/firestore';
import {Angebot, createConverter, Kurs, Kursleiter, Teilnehmer} from "../data/types";

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

const kursConverter = createConverter<Kurs>();
const angebotConverter = createConverter<Angebot>();
const kursleiterConverter = createConverter<Kursleiter>();
const teilnehmerConverter = createConverter<Teilnehmer>();

async function loadStructuredData<T>(
    collectionName: string,
    filePath: string,
    converter: FirestoreDataConverter<T>,
    preprocess?: (doc: any) => T
) {
    console.log(`📄 Lade ${collectionName} aus Datei: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Datei nicht gefunden: ${filePath}`);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data: Record<string, any> = JSON.parse(raw);

        for (const id of Object.keys(data)) {
            let document = data[id];
            if (preprocess) {
                document = preprocess(document);
            }

            const docRef = db.collection(collectionName).doc(id).withConverter(converter);
            await docRef.set(document);

            // Spezialfälle je Collection
            if (collectionName === 'kurse') {
                const { kursliteratur, voraussetzungen } = data[id] as Kurs;

                if (kursliteratur && Object.keys(kursliteratur).length > 0) {
                    await docRef.collection('kursliteratur').doc('standard').set(kursliteratur);
                }

                if(voraussetzungen && voraussetzungen.length > 0) {
                    for (const v of voraussetzungen) {
                        await docRef.collection('voraussetzungen').doc(v).set({ Voraussetzung: v });
                    }
                }
            }

            if (collectionName === 'angebote') {
                for (const pid of data[id].kursleiter) {
                    await docRef.collection('kursleiter').doc(pid.toString()).set({ PersNr: pid });
                }
            }

            if (collectionName === 'teilnehmer') {
                for (const teilnahme of data[id].teilnahmen) {
                    const index: number = data[id].teilnahmen.indexOf(teilnahme);
                    await docRef.collection('teilnahmen').doc(`teilnahme_${index}`).set(teilnahme);
                }
            }

            console.log(`✅ ${collectionName}/${id} gespeichert`);
        }
    } catch (err) {
        console.error(`❌ Fehler beim Laden von ${collectionName}:`, err);
    }
}

async function main() {
    console.log("🚀 Starte Datenimport in Firestore...");

    await loadStructuredData<Kurs>(
        'kurse',
        'data/kurse.json',
        kursConverter
    );

    await loadStructuredData<Teilnehmer>(
        'teilnehmer',
        'data/teilnehmer.json',
        teilnehmerConverter
    );

    await loadStructuredData<Angebot>(
        'angebote',
        'data/angebote.json',
        angebotConverter,
        (doc) => ({
            ...doc,
            Datum: Timestamp.fromDate(new Date(doc.Datum))
        })
    );

    await loadStructuredData<Kursleiter>(
        'kursleiter',
        'data/kursleiter.json',
        kursleiterConverter
    );

    console.log("✅ Alle Daten erfolgreich geladen.");
}

main().catch(console.error);
