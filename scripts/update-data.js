import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe5() {
    console.log('♻️ Aufgabe 5: Update Queries\n');

    // a) Alle Angebote vom Jahr 2023 auf 2024 aktualisieren
    /**
     * @old-relational-table Angebot
     * @collection angebote
     * @logic
     *   🔸 In SQL (PostgreSQL) einfache UPDATE-Anweisung:
     *          UPDATE Angebot SET Datum = DATE + INTERVAL '1 year' WHERE EXTRACT(YEAR FROM Datum) = 2023;
     *   🔹 In Firestore:
     *          - laden aller Angebote, welche mit "2023" bei Datum starten
     *          - abändern des Datum Strings
     *          - anschließendes updaten in der Datenbank
     * @difference-to-sql
     *    Laden aller Angebote, welche im Jahr 2023 stattfinden und anschließendes manuelles abändern des Datum, sowie speichern in der Datenbank.
     *    In SQL erfolgt dies automatisch mit der Update-Anweisung
     */
    const angebote2023 = await db.collection('angebote')
        .where('Datum', '>=', '2023')
        .where('Datum', '<=', '2023\uf8ff')
        .get();
    for (const doc of angebote2023.docs) {
        const angebot = doc.data();
        const neuesDatum = angebot.Datum.replace('2023', '2024');
        await doc.ref.update({ Datum: neuesDatum });
        console.log(`🔄 Angebot ${doc.id} Datum aktualisiert auf ${neuesDatum}`);
    }

    // b) Alle Angebote von "Wedel" nach "Augsburg"
    /**
     * @old-relational-table Angebot
     * @collection angebote
     * @logic
     *   🔸 In SQL (PostgreSQL) einfache UPDATE-Anweisung:
     *          UPDATE Angebot SET Ort = 'Augsburg' WHERE Ort = 'Wedel';
     *
     *   🔹 In Firestore:
     *          - laden aller Angebote mit Ort == 'Wedel'
     *          - iterieren über aller erhaltenen Angebote mit updaten des Orts in der Datenbank
     * @difference-to-sql
     *    Manuelles updaten der Dokumente.
     */
    const angeboteWedel = await db.collection('angebote').where('Ort', '==', 'Wedel').get();
    for (const doc of angeboteWedel.docs) {
        await doc.ref.update({ Ort: 'Augsburg' });
        console.log(`📍 Angebot ${doc.id} von Wedel nach Augsburg verschoben.`);
    }

    console.log('\n✅ Fertig.');
}

await aufgabe5();
