import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"

    /**
     * @old-relational-table KursLit
     * @collection kursliteratur
     * @id KursNr wird als Dokumenten-ID verwendet (z.B.: "P13" für C-Programmierung)
     * @note
     *   🔸 In SQL: Eine einfache DELETE-Anweisung mit WHERE-Subquery reicht aus, z.B.:
     *       DELETE FROM KursLit WHERE KursNr = (SELECT KursNr FROM Kurs WHERE Titel = 'C-Programmierung');
     *   🔹 In Firestore: Kein JOIN möglich – KursNr muss zuerst über Titel ermittelt und dann manuell zum Löschen verwendet werden.
     *   🔹 Kein direkter Fremdschlüssel – KursNr dient als lose Verknüpfung; Datenintegrität muss durch Anwendung gewährleistet werden.
     * @delete
     *   Löscht alle Dokumente aus "kursliteratur", bei denen KursNr mit der des Kurses "C-Programmierung" übereinstimmt.
     * @differences-to-sql
     *   Firestore benötigt mehrere Schritte (1. Kurs suchen, 2. KursNr holen, 3. Kursliteratur manuell löschen),
     *   während SQL dies direkt über verknüpfte Tabellen abbildet.
     */
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

    /**
     * @old-relational-table Nimmt_teil, Angebot
     * @collections teilnahmen, angebote
     * @id
     *   In "teilnahmen": Dokumenten-ID = AngNr_KursNr_TnNr
     *   In "angebote": Dokumenten-ID = AngNr_KursNr (z. B. "2_P13")
     * @logic
     *   🔸 In SQL: Man könnte dies mit einem GROUP BY + COUNT(*) und HAVING < 2 lösen, z. B.:
     *       DELETE FROM Angebot WHERE (AngNr, KursNr) IN (
     *           SELECT AngNr, KursNr FROM Nimmt_teil GROUP BY AngNr, KursNr HAVING COUNT(*) < 2
     *       );
     *   🔹 In Firestore: Kein GROUP BY – manuelles Zählen notwendig.
     *       Kursangebot muss anhand der dokumentierten Teilnahmebeziehungen analysiert und gelöscht werden.
     * @risk
     *   🔸 In SQL: Mit referentieller Integrität könnte man verbundene Datensätze konsistent mitlöschen (z. B. via ON DELETE CASCADE).
     *   🔹 In Firestore: Nur das Angebot wird gelöscht – Daten in anderen Collections wie "gebuehren" oder "fuehrt_durch" bleiben bestehen,
     *       was zu Inkonsistenzen führen kann, wenn nicht separat bereinigt.
     * @difference-to-sql
     *   SQL behandelt Beziehungen automatisch und unterstützt mächtige Abfragen; Firestore erfordert iteratives Denken und Verantwortung
     *   für Konsistenz in der Anwendung selbst.
     */
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
