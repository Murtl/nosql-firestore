import fs from 'fs';
import {Firestore, Timestamp, FirestoreDataConverter} from '@google-cloud/firestore';
import {Angebot, createConverter, Kurs, Kursleiter, RawAngebotJson, Teilnehmer} from "../data/types";

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});

const kursConverter = createConverter<Kurs>();
const angebotConverter = createConverter<Angebot>();
const kursleiterConverter = createConverter<Kursleiter>();
const teilnehmerConverter = createConverter<Teilnehmer>();

const kursTitelMap = new Map<string, string>();
const kursleiterCache = new Map<number, Kursleiter>();

function loadJsonFile<T>(path: string): Record<string, T> {
    if (!fs.existsSync(path)) {
        throw new Error(`Datei nicht gefunden: ${path}`);
    }

    const raw = fs.readFileSync(path, 'utf-8');
    return JSON.parse(raw) as Record<string, T>;
}

async function loadStructuredData<T>(
    collectionName: string,
    filePath: string,
    converter: FirestoreDataConverter<T>
) {
    console.log(`📄 Lade ${collectionName} aus Datei: ${filePath}`);

    try {
        const data = loadJsonFile<T>(filePath);

        for (const [id, document] of Object.entries(data)) {
            const docRef = db.collection(collectionName).doc(id).withConverter(converter);

            if (collectionName === 'kurse') {
                const kurs = document as unknown as Kurs;
                const { kursliteratur, voraussetzungen, ...rest } = kurs;

                await docRef.set(rest as T);

                if (kursliteratur && Object.keys(kursliteratur).length > 0) {
                    await docRef.collection('kursliteratur').doc('standard').set(kursliteratur);
                }

                if (voraussetzungen && voraussetzungen.length > 0) {
                    for (const v of voraussetzungen) {
                        await docRef.collection('voraussetzungen').doc(v).set({ Voraussetzung: v });
                    }
                }

                kursTitelMap.set(id, kurs.Titel);
            }

            else if (collectionName === 'angebote') {
                const { kursleiter: leiterIds, Datum, KursNr, Ort } = document as RawAngebotJson;

                // Kursleiterdaten aus Cache aufbauen
                const kursleiterInfos = leiterIds
                    .map((pid) => {
                        const k = kursleiterCache.get(pid);
                        if (!k) {
                            console.warn(`⚠️ Kursleiter mit PersNr ${pid} nicht im Cache gefunden.`);
                            return undefined;
                        }
                        return {
                            PersNr: pid,
                            Name: k.Name,
                            Gehalt: k.Gehalt
                        };
                    })
                    .filter((k): k is Kursleiter & { PersNr: number } => k !== undefined);

                // KursTitel aus TitelMap
                const titel = kursTitelMap.get(KursNr) ?? "Unbekannter Kurs";

                const angebotDoc: Omit<Angebot, 'kursleiter'> = {
                    KursNr,
                    KursTitel: titel,
                    Datum: Timestamp.fromDate(new Date(Datum as unknown as string)),
                    Ort
                };

                const docRef = db.collection(collectionName).doc(id).withConverter(angebotConverter);
                await docRef.set(angebotDoc);

                for (const leiter of kursleiterInfos) {
                    await docRef.collection('kursleiter').doc(leiter.PersNr.toString()).set({
                        Name: leiter.Name,
                        Gehalt: leiter.Gehalt
                    });
                }

            }

            else if (collectionName === 'teilnehmer') {
                const teilnehmer = document as unknown as Teilnehmer;
                const { teilnahmen, ...rest } = teilnehmer;

                await docRef.set(rest as T);

                if (teilnahmen && teilnahmen.length > 0) {
                    for (let i = 0; i < teilnahmen.length; i++) {
                        await docRef.collection('teilnahmen').doc(`teilnahme_${i}`).set(teilnahmen[i]);
                    }
                }
            }

            else {
                await docRef.set(document);
            }

            if (collectionName === 'kursleiter') {
                kursleiterCache.set(Number(id), document as unknown as Kursleiter);
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

    await loadStructuredData<Kursleiter>(
        'kursleiter',
        'data/kursleiter.json',
        kursleiterConverter
    );

    await loadStructuredData<Angebot>(
        'angebote',
        'data/angebote.json',
        angebotConverter
    );

    console.log("✅ Alle Daten erfolgreich geladen.");
}

main().catch(console.error);
