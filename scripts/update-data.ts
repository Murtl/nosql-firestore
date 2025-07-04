import { Firestore, Timestamp } from '@google-cloud/firestore';
import {Angebot, createConverter} from '../data/types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe5() {
    console.log('♻️ Aufgabe 5: Update Queries\n');

    // a) Alle Angebote vom Jahr 2023 auf 2024 aktualisieren
    /**
     * @old-relational-table Angebot
     * @collection angebote
     *
     * @logic
     *   🔸 In SQL einfache UPDATE-Anweisung:
     *          UPDATE Angebot SET Datum = DATE + INTERVAL '1 year' WHERE EXTRACT(YEAR FROM Datum) = 2023;
     *   🔹 In Firestore:
     *          - laden aller Angebote, bei welchen der Timestamp im Jahr 2023 liegt
     *          - abändern des Timestamps
     *          - anschließendes updaten in der Datenbank
     *
     * @difference-to-sql
     *    Laden aller Angebote, welche im Jahr 2023 stattfinden und anschließendes manuelles Abändern des Datums, sowie speichern in der Datenbank.
     *    In SQL erfolgt dies automatisch mit der Update-Anweisung
     */
    const startOf2023 = Timestamp.fromDate(new Date("2023-01-01T00:00:00Z"));
    const startOf2024 = Timestamp.fromDate(new Date("2024-01-01T00:00:00Z"));

    const angebote2023 = await db.collection('angebote')
        .withConverter(createConverter<Angebot>())
        .where('Datum', '>=', startOf2023)
        .where('Datum', '<', startOf2024)
        .get();
    for (const doc of angebote2023.docs) {
        const angebot = doc.data();
        const date = angebot.Datum.toDate();
        const neuesDatum = Timestamp.fromDate(new Date(date.setFullYear(2024)));
        await doc.ref.update({Datum: neuesDatum});
        console.log(`🔄 Angebot ${doc.id} Datum aktualisiert auf ${neuesDatum.toDate().toLocaleDateString()}`);
    }

    // b) Alle Angebote von "Wedel" nach "Augsburg"
    /**
     * @old-relational-table Angebot
     * @collection angebote
     *
     * @logic
     *   🔸 In SQL einfache UPDATE-Anweisung:
     *          UPDATE Angebot SET Ort = 'Augsburg' WHERE Ort = 'Wedel';
     *
     *   🔹 In Firestore:
     *          - laden aller Angebote mit Ort == 'Wedel'
     *          - iterieren über alle erhaltenen Angebote mit Updaten des Orts in der Datenbank
     *
     * @difference-to-sql
     *    Manuelles Updaten der Dokumente.
     */
    const angeboteWedel = await db.collection('angebote')
        .withConverter(createConverter<Angebot>())
        .where('Ort', '==', 'Wedel').get();

    for (const doc of angeboteWedel.docs) {
        await doc.ref.update({ Ort: 'Augsburg' });
        console.log(`📍 Angebot ${doc.id} von Wedel nach Augsburg verschoben.`);
    }


    /**
     * Sobald man update-Anfragen hat, die mehrere Collections betreffen, bei denen mehrere Daten redundant gehalten werden,
     * dann sollte man in Betracht ziehen, eine Transaktion oder Batch-Operation zu verwenden. Diese Vorgehensweise
     * wird beispielhaft bei den delete-Queries als Kommentar am Ende der Datei beschrieben.
     */


    console.log('\n✅ Fertig.');
}

aufgabe5().catch(console.error);
