import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"
    const kursSnapshot = await db.collection('kurse').where('Titel', '==', 'C-Programmierung').get();
    if (kursSnapshot.empty) {
        console.log('❌ Kurs "C-Programmierung" nicht gefunden.');
    } else {
        const kursDocRef = kursSnapshot.docs[0].ref;
        const litRef = kursDocRef.collection('kursliteratur').doc('standard');
        await litRef.delete();
        console.log(`📚 Kursliteratur für "C-Programmierung" gelöscht.`);
    }

    // b) Lösche alle Kursangebote mit weniger als 2 Teilnehmern
    const angeboteSnapshot = await db.collection('angebote').get();
    const teilnehmerSnapshot = await db.collection('teilnehmer').get();

    // Zähle Teilnehmer pro Angebot
    const angebotTeilnahmeZaehler = {};

    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmen = await db.collection('teilnehmer').doc(teilnehmerDoc.id).collection('teilnahmen').get();
        for (const t of teilnahmen.docs) {
            const { AngNr, KursNr } = t.data();
            const angebotId = `${AngNr}_${KursNr}`;
            angebotTeilnahmeZaehler[angebotId] = (angebotTeilnahmeZaehler[angebotId] || 0) + 1;
        }
    }

    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebotId = angebotDoc.id;
        const teilnehmerAnzahl = angebotTeilnahmeZaehler[angebotId] || 0;
        if (teilnehmerAnzahl < 2) {
            await angebotDoc.ref.delete();
            console.log(`🗑️ Angebot ${angebotId} gelöscht (nur ${teilnehmerAnzahl} Teilnehmer).`);
        }
    }

    console.log('\n✅ Löschvorgänge abgeschlossen.');
}

await aufgabe6();
