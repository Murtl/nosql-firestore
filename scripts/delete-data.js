import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"
    const kursSnapshot = await db.collection('kurse').where('Titel', '==', 'C-Programmierung').get();
    if (kursSnapshot.empty) {
        console.log('❌ Kurs "C-Programmierung" nicht gefunden.');
        return;
    }
    const kursNr = kursSnapshot.docs[0].id;
    const kursLiteraturSnapshot = await db.collection('kursliteratur').where('KursNr', '==', kursNr).get();
    if (kursLiteraturSnapshot.empty) {
        console.log('❌ Keine Kursliteratur für "C-Programmierung" gefunden.');
        return;
    }
    for (const doc of kursLiteraturSnapshot.docs) {
        await doc.ref.delete();
        console.log(`📚 Kursliteratur ${doc.id} für "C-Programmierung" gelöscht.`);
    }

    // b) Lösche alle Kurse mit weniger als 2 Teilnehmern
    const teilnahmenSnapshot = await db.collection('teilnahmen').get();
    const kursZaehler = {};

    teilnahmenSnapshot.forEach(doc => {
        const kursKey = `${doc.data().KursNr}_${doc.data().AngNr}`;
        kursZaehler[kursKey] = (kursZaehler[kursKey] || 0) + 1;
    });

    for (const [key, count] of Object.entries(kursZaehler)) {
        if (count < 2) {
            const [kursNr, angNr] = key.split('_');
            const angebotDocId = `${angNr}_${kursNr}`;
            await db.collection('angebote').doc(angebotDocId).delete();
            console.log(`🗑️ Angebot ${angebotDocId} gelöscht, da weniger als 2 Teilnehmer.`);
        }
    }
}

await aufgabe6();
