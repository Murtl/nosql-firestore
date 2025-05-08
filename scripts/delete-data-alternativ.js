import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"

    /**
     * @old-relational-table KursLit
     * @collections kurse, kurse/kursliteratur
     * @id
     *   In "kurse": Dokumenten-ID = KursNr (z.B.: "P13")
     *   In Subcollection "kursliteratur": Dokumenten-ID = "standard"
     * @logic
     *   🔸 In SQL:
     *       DELETE FROM KursLit WHERE KursNr = 'P13';
     *   🔹 In Firestore:
     *       Kurs mit Titel "C-Programmierung" (entspricht KursNr = "P13") wird gesucht,
     *       dann wird `kurse/P13/kursliteratur/standard` gelöscht.
     * @risk
     *   🔸 In SQL: Datenlöschung wird automatisch in Beziehung gesetzt – z.B.: kann überprüft werden, ob Bedarf noch besteht.
     *   🔹 In Firestore: Es erfolgt keine automatische Prüfung, ob Literatur z.B.: noch in Gebrauch ist (z.B.: durch Angebote oder Teilnehmer).
     *       Das Löschen erfolgt direkt auf Dokumentebene.
     * @difference-to-sql
     *   In SQL reicht eine einfache WHERE-Klausel; in Firestore ist eine Suche nach dem Titel nötig,
     *   gefolgt vom Zugriff auf eine Subcollection mit fixer ID ("standard").
     */

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

    /**
     * @old-relational-table Nimmt_teil, Angebot
     * @collections angebote, teilnehmer
     * @id
     *   In "angebote": Dokumenten-ID = AngNr_KursNr (z.B.: "2_P13")
     *   In "teilnehmer": Dokumenten-ID = TnNr
     *   In Subcollection "teilnahmen": Feld AngNr_KursNr referenziert Angebot
     * @logic
     *   🔸 In SQL:
     *       DELETE FROM Angebot WHERE (AngNr, KursNr) IN (
     *           SELECT AngNr, KursNr FROM Nimmt_teil GROUP BY AngNr, KursNr HAVING COUNT(*) < 2
     *       );
     *   🔹 In Firestore:
     *       - Iteriere über alle Teilnehmer → analysiere ihre Teilnahmen.
     *       - Zähle Vorkommen jedes Angebots.
     *       - Lösche jedes Angebot aus "angebote", wenn es < 2 Teilnehmer hat.
     * @risk
     *   🔸 In SQL: Foreign Keys und CASCADE-Löschungen sichern Konsistenz.
     *   🔹 In Firestore: Nur das Angebot wird gelöscht.
     *       Referenzen in "teilnehmer" (teilnahmen), "gebuehren", oder "fuehrt_durch" bleiben bestehen → Inkonsistenzrisiko!
     * @difference-to-sql
     *   Firestore hat kein GROUP BY oder Aggregation.
     *   Zählung und Selektion müssen manuell in der Applikation durchgeführt werden.
     */
    const angeboteSnapshot = await db.collection('angebote').get();
    const teilnehmerSnapshot = await db.collection('teilnehmer').get();

    // Zähle Teilnehmer pro Angebot
    const angebotTeilnahmeZaehler = {};

    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmen = await db.collection('teilnehmer').doc(teilnehmerDoc.id).collection('teilnahmen').get();
        for (const t of teilnahmen.docs) {
            const { AngNr } = t.data();
            const angebotId = `${AngNr}`;
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
