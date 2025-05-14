import { Firestore } from '@google-cloud/firestore';
import {Kurs, Teilnehmer, Teilnahme, Angebot, createConverter} from '../data/types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"
    const kursSnapshot = await db.collection('kurse')
        .withConverter(createConverter<Kurs>())
        .where('Titel', '==', 'C-Programmierung').get();

    if (kursSnapshot.empty) {
        console.log('❌ Kurs "C-Programmierung" nicht gefunden.');
    } else {
        const kursDocRef = kursSnapshot.docs[0].ref;
        const litRef = kursDocRef.collection('kursliteratur').doc('standard');
        await litRef.delete();
        console.log('📚 Kursliteratur für "C-Programmierung" gelöscht.');
    }

    // b) Lösche alle Kursangebote mit weniger als 2 Teilnehmern
    const angeboteSnapshot = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const teilnehmerSnapshot = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>()).get();

    const angebotTeilnahmeZaehler: Record<string, number> = {};

    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmenSnap = await teilnehmerDoc.ref.collection('teilnahmen').get();
        for (const t of teilnahmenSnap.docs) {
            const { AngNr } = t.data() as Teilnahme;
            angebotTeilnahmeZaehler[AngNr] = (angebotTeilnahmeZaehler[AngNr] || 0) + 1;
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

aufgabe6().catch(console.error);
