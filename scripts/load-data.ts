import fs from 'fs';
import { Firestore, Timestamp, FirestoreDataConverter } from '@google-cloud/firestore';
import { Angebot, createConverter, Kurs, Kursleiter, Teilnehmer } from "../data/types";

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

const kursConverter = createConverter<Kurs>();
const angebotConverter = createConverter<Angebot>();
const kursleiterConverter = createConverter<Kursleiter>();
const teilnehmerConverter = createConverter<Teilnehmer>();

// Kursleiterdaten laden
const rawKursleiter = fs.readFileSync('data/kursleiter.json', 'utf-8');
const kursleiterData: Record<string, Kursleiter> = JSON.parse(rawKursleiter);
const kursleiterCache = new Map<number, Kursleiter>();
for (const [id, kl] of Object.entries(kursleiterData)) {
    kursleiterCache.set(Number(id), kl);
}

// Kursdaten laden
const rawKurse = fs.readFileSync('data/kurse.json', 'utf-8');
const kursData: Record<string, Kurs> = JSON.parse(rawKurse);
const kursTitelMap = new Map<string, string>();
for (const [id, kurs] of Object.entries(kursData)) {
    kursTitelMap.set(id, kurs.Titel);
}

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

                if (voraussetzungen && voraussetzungen.length > 0) {
                    for (const v of voraussetzungen) {
                        await docRef.collection('voraussetzungen').doc(v).set({ Voraussetzung: v });
                    }
                }
            }

            if (collectionName === 'angebote') {
                const kursleiterArray = document.kursleiter;
                for (const leiter of kursleiterArray) {
                    await docRef.collection('kursleiter').doc(leiter.PersNr.toString()).set({
                        PersNr: leiter.PersNr,
                        Gehalt: leiter.Gehalt
                    });
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
        (doc) => {
            const kursleiterInfos = doc.kursleiter.map((pid: number) => {
                const k = kursleiterCache.get(pid);
                return {
                    PersNr: pid,
                    Name: k?.Name ?? "Unbekannt",
                    Gehalt: k?.Gehalt ?? 0
                };
            });

            const titel = kursTitelMap.get(doc.KursNr) ?? "Unbekannter Kurs";

            return {
                ...doc,
                Datum: Timestamp.fromDate(new Date(doc.Datum)),
                KursTitel: titel,
                kursleiter: kursleiterInfos
            };
        }
    );

    await loadStructuredData<Kursleiter>(
        'kursleiter',
        'data/kursleiter.json',
        kursleiterConverter
    );

    console.log("✅ Alle Daten erfolgreich geladen.");
}

main().catch(console.error);
