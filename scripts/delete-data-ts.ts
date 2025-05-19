import { Firestore } from '@google-cloud/firestore';
import {Kurs, Teilnehmer, Teilnahme, Angebot, createConverter} from '../data/types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"

    // to clarify if the standard document is what refer to as die Kursliteratur
    // für den Kurs „C-Programmierung“ or if this could contain more than one document

    /**
     * @old-relational-table Kurs, KursLiteratur
     * @collections kurse, kurse/kursliteratur
     *
     * @id
     *   In "kurse": Dokumenten-ID = KursNr (z. B. "P13")
     *   In Subcollection "kursliteratur": Dokumenten-ID = "standard"
     *
     * @logic
     *   In SQL:
     *    Ermittle KursNr für den Kurs mit Titel "C-Programmierung"
     *       SELECT KursNr FROM Kurs WHERE Titel = 'C-Programmierung';
     *
     *    Lösche die zugehörige Literatur:
     *       DELETE FROM KursLiteratur WHERE KursNr = 'P13';
     *
     *   In Firestore:
     *       1. Suche im Collection "kurse" nach einem Dokument mit Feld `Titel` == "C-Programmierung".
     *       2. Greife auf das Dokument `kursliteratur/standard` innerhalb des gefundenen Kurses zu.
     *       3. Lösche das Dokument `standard` in der Subcollection `kursliteratur`.
     *
     * @risk
     *       - Es gibt keine automatische Prüfung oder Foreign-Key-Beziehungen:
     *       - Die Literatur kann gelöscht werden, auch wenn sie noch z. B. in einem Angebot verwendet wird.
     *       - Entwickler müssen selbst für Konsistenz sorgen.
     *
     * @difference-to-sql
     *   In SQL genügt ein einfacher `DELETE` mit WHERE-Klausel über `KursNr`.
     *   In Firestore ist eine Suche nach dem Titel erforderlich,
     *       gefolgt vom Zugriff auf die Subcollection `kursliteratur`, um das "standard"-Dokument zu löschen.
     */

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

    /**
     * @old-relational-table Nimmt_teil, Angebot, Gebühren
     * @collections angebote, teilnehmer, teilnehmer/teilnahmen
     * @id
     *   In "angebote": Dokumenten-ID = AngNr_KursNr (z.B.: "2_P13")
     *   In "teilnehmer": Dokumenten-ID = TnNr
     *   In Subcollection "teilnahmen": Feld AngNr_KursNr referenziert Angebot
     * @delete Das Dokument in "angebote" wird gelöscht und alle Teilnahmen in der Subcollection "teilnahmen" der Teilnehmer für diese Angebote.
     * @logic
     *   In SQL:
     *       Finde Angebote mit weniger als 2 Teilnehmern:
     *       SELECT A.AngNr
     *       FROM Angebot A
     *       JOIN Nimmt_teil NT ON A.AngNr = NT.AngNr
     *       GROUP BY A.AngNr
     *       HAVING COUNT(*) < 2;
     *
     *      Lösche die Einträge in "Nimmt_teil" und "Gebuehren":
     *       DELETE FROM Nimmt_teil WHERE AngNr = <zu löschende AngNr>;
     *       DELETE FROM Gebuehren WHERE AngNr = <zu löschende AngNr>;
     *
     *      Lösche das Angebot:
     *       DELETE FROM Angebot WHERE AngNr = <zu löschende AngNr>;
     *
     *   In Firestore:
     *       1. Lade alle Dokumente aus "angebote" und "teilnehmer".
     *       2. Zähle pro Angebot, wie viele Teilnehmer eine Teilnahme mit der entsprechenden "AngNr" haben.
     *       3. Wenn die Anzahl < 2, lösche:
     *          - das Angebot selbst (`angebote/<AngNr>`)
     *          - alle zugehörigen "teilnahmen", deren "AngNr" dieses Angebot referenziert.
     *
     * @risk
     *   In Firestore gibt es keine referenzielle Integrität:
     *      - Teilnahmen, die auf nicht existierende Angebote zeigen, müssen manuell bereinigt werden.
     *      - Ein versehentliches Löschen kann nicht durch Constraints verhindert werden.
     *
     * @difference-to-sql
     *   - In Firestore gibt es KEIN JOIN + WHERE + DELETE + GROUP BY oder CASCADEN-Delete.
     *   - In SQL kann man JOINS und Bedingungen direkt im DELETE kombinieren.
     *   - In Firestore müssen Dokumente einzeln geladen und verglichen werden.
     *   - Zählung und Selektion müssen manuell in der Applikation durchgeführt werden.
     *   - Zudem erfolgt die Navigation zu "teilnahmen" über die Subcollection jedes Teilnehmers.
     */
    const angeboteSnapshot = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const teilnehmerSnapshot = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>()).get();

    const angebotTeilnahmeZaehler: Record<string, number> = {};
    const zuLoeschendeAngebote: string[] = [];

    // Zähle die Teilnehmer pro Angebot
    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmenSnap = await teilnehmerDoc.ref.collection('teilnahmen').get();
        for (const t of teilnahmenSnap.docs) {
            const { AngNr } = t.data() as Teilnahme;
            angebotTeilnahmeZaehler[AngNr] = (angebotTeilnahmeZaehler[AngNr] || 0) + 1;
        }
    }

// Lösche Angebote mit < 2 Teilnehmern und merke dir die AngNr_KursNr
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebotId = angebotDoc.id;
        const teilnehmerAnzahl = angebotTeilnahmeZaehler[angebotId] || 0;
        if (teilnehmerAnzahl < 2) {
            await angebotDoc.ref.delete();
            zuLoeschendeAngebote.push(angebotId);
            console.log(`🗑️ Angebot ${angebotId} gelöscht (nur ${teilnehmerAnzahl} Teilnehmer).`);
        }
    }

    // Lösche zugehörige Teilnahmen in allen Teilnehmer-Dokumenten
    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmenSnap = await teilnehmerDoc.ref.collection('teilnahmen').get();
        for (const t of teilnahmenSnap.docs) {
            const { AngNr } = t.data() as Teilnahme;
            if (zuLoeschendeAngebote.includes(AngNr)) {
                await t.ref.delete();
                console.log(`🗑️ Teilnahme ${t.id} von Teilnehmer ${teilnehmerDoc.id} gelöscht (bezog sich auf Angebot ${AngNr}).`);
            }
        }
    }

    console.log('\n✅ Löschvorgänge abgeschlossen.');
}

aufgabe6().catch(console.error);
