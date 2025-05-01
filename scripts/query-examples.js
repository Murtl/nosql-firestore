import { Firestore } from '@google-cloud/firestore';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({
    projectId: 'custom-emulator',
    ssl: false
});


async function query() {
    console.log("📋 Kursleiter mit Gehalt 3000–4000:");
    const snapshot = await db.collection('Kursleiter')
        .where('gehalt', '>=', 3000)
        .where('gehalt', '<=', 4000)
        .orderBy('name')
        .get();

    snapshot.forEach(doc => console.log(doc.id, doc.data()));
}

await query();
