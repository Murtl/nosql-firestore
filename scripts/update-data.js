import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe5() {
    console.log('♻️ Aufgabe 5: Update Queries\n');

    // a) Alle Angebote vom Jahr 2023 auf 2024 aktualisieren
    const angeboteSnapshot = await db.collection('angebote').get();
    for (const doc of angeboteSnapshot.docs) {
        const angebot = doc.data();
        if (angebot.Datum.includes('2023')) {
            const neuesDatum = angebot.Datum.replace('2023', '2024');
            await doc.ref.update({ Datum: neuesDatum });
            console.log(`🔄 Angebot ${doc.id} Datum aktualisiert auf ${neuesDatum}`);
        }
    }

    // b) Alle Angebote von "Wedel" nach "Augsburg"
    const angeboteWedel = await db.collection('angebote').where('Ort', '==', 'Wedel').get();
    for (const doc of angeboteWedel.docs) {
        await doc.ref.update({ Ort: 'Augsburg' });
        console.log(`📍 Angebot ${doc.id} von Wedel nach Augsburg verschoben.`);
    }

    console.log('\n✅ Fertig.');
}

await aufgabe5();
