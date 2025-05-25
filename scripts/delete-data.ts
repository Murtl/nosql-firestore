import { Firestore } from '@google-cloud/firestore';
import {Kurs, Teilnehmer, Teilnahme, Angebot, createConverter} from '../data/types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe6() {
    console.log('🗑️ Aufgabe 6: Delete Queries\n');

    // a) Lösche die Kursliteratur für "C-Programmierung"
    /**
     * @old-relational-table Kurs, KursLiteratur
     * @collections kurse, kurse/kursliteratur
     *
     * @id
     *   In "kurse": Dokumenten-ID = KursNr (z.B.: "P13")
     *   In Subcollection "kursliteratur": Dokumenten-ID = "standard"
     *
     * @logic
     *   🔸 In SQL:
     *      Ermittle KursNr für den Kurs mit Titel "C-Programmierung"
     *          SELECT KursNr FROM Kurs WHERE Titel = 'C-Programmierung';
     *      Lösche die zugehörige Literatur:
     *          DELETE FROM KursLiteratur WHERE KursNr = 'P13';
     *
     *   🔹 In Firestore:
     *      1. Suche im Collection "kurse" nach einem Dokument mit Feld `Titel` == "C-Programmierung".
     *      2. Greife auf das Dokument `kursliteratur/standard` innerhalb des gefundenen Kurses zu.
     *      3. Lösche das Dokument `standard` in der Subcollection `kursliteratur`.
     *
     * @risk
     * Es gibt keine automatische Prüfung oder Foreign-Key-Beziehungen:
     * - Die Literatur kann gelöscht werden, auch wenn sie noch z.B. in einem Angebot verwendet wird.
     * - Entwickler müssen selbst für Konsistenz sorgen.
     *
     * @difference-to-sql
     * In SQL genügt ein einfacher `DELETE` mit WHERE-Klausel über `KursNr`.
     * In Firestore ist eine Suche nach dem Titel erforderlich,
     * gefolgt vom Zugriff auf die Subcollection `kursliteratur`, um das "standard"-Dokument zu löschen.
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
     *
     * @id
     *   In "angebote": Dokumenten-ID = AngNr_KursNr (z.B.: "2_P13")
     *   In "teilnehmer": Dokumenten-ID = TnNr
     *   In Subcollection "teilnahmen": Feld AngNr_KursNr referenziert Angebot
     *
     * @logic
     *   🔸 In SQL:
     *      Finde Angebote mit weniger als 2 Teilnehmern:
     *             SELECT A.AngNr
     *             FROM Angebot A
     *             JOIN Nimmt_teil NT ON A.AngNr = NT.AngNr
     *             GROUP BY A.AngNr
     *             HAVING COUNT(*) < 2;
     *
     *      Lösche die Einträge in "Nimmt_teil" und "Gebuehren":
     *             DELETE FROM Nimmt_teil WHERE AngNr = <zu löschende AngNr>;
     *             DELETE FROM Gebuehren WHERE AngNr = <zu löschende AngNr>;
     *
     *      Lösche das Angebot:
     *             DELETE FROM Angebot WHERE AngNr = <zu löschende AngNr>;
     *
     *   🔹 In Firestore:
     *       1. Lade alle Dokumente aus "angebote" und "teilnehmer".
     *       2. Zähle pro Angebot, wie viele Teilnehmer eine Teilnahme mit der entsprechenden AngNr_KursNr haben.
     *       3. Wenn die Anzahl < 2, lösche:
     *                - das Angebot selbst
     *                - alle zugehörigen "teilnahmen"
     * @risk
     * In Firestore gibt es keine referenzielle Integrität:
     *      - Teilnahmen, die auf nicht existierende Angebote zeigen, müssen manuell bereinigt werden.
     *      - Ein versehentliches Löschen kann nicht durch Constraints verhindert werden.
     *      - Entwickler müssen sicherstellen, dass keine "verwaisten" Dokumente entstehen.
     *      - Ohne Transaktionen oder Batch-Operationen kann es zu Inkonsistenzen beim Löschen kommen
     *
     * @difference-to-sql
     * - In Firestore gibt es KEIN JOIN + WHERE + DELETE + GROUP BY oder CASCADEN-Delete.
     * - In SQL kann man JOINS und Bedingungen direkt im DELETE kombinieren.
     * - In Firestore müssen Dokumente einzeln geladen und verglichen werden.
     * - Zählung und Selektion müssen manuell in der Applikation durchgeführt werden.
     * - Zudem erfolgt die Navigation zu "teilnahmen" über die Subcollection jedes Teilnehmers.
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
              await angebotDoc.ref.collection('kursleiter').get().then(kursleiterSnap => {
                  // Lösche alle Kursleiter für dieses Angebot
                  const deletePromises = kursleiterSnap.docs.map(k => k.ref.delete());
                  return Promise.all(deletePromises);
              });
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


  /*
    // Hinweis: Zusatz zu Aufgabe b - Löschen von Angeboten mit <2 Teilnehmern
    // Transaktion und Batch-Operationen für konsistente Löschvorgänge bei großen Datenmengen
    const angeboteSnapshot = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const teilnehmerSnapshot = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>()).get();

    // Zähle die Teilnehmer pro Angebot
    const angebotTeilnahmeZaehler: Record<string, number> = {};
    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmenSnap = await teilnehmerDoc.ref.collection('teilnahmen').get();
        for (const t of teilnahmenSnap.docs) {
            const { AngNr } = t.data() as Teilnahme;
            angebotTeilnahmeZaehler[AngNr] = (angebotTeilnahmeZaehler[AngNr] || 0) + 1;
        }
    }

    const zuLoeschendeAngebote: string[] = [];

    await db.runTransaction(async (transaction) => {
    for (const angebotDoc of angeboteSnapshot.docs) {
              const angebotId = angebotDoc.id;
              const teilnehmerAnzahl = angebotTeilnahmeZaehler[angebotId] || 0;

              if (teilnehmerAnzahl < 2) {
                  const kursleiterSnap = await angebotDoc.ref.collection('kursleiter').get();
                  kursleiterSnap.docs.forEach(kursleiterDoc => {
                      transaction.delete(kursleiterDoc.ref);
                  });

                  transaction.delete(angebotDoc.ref);
                  zuLoeschendeAngebote.push(angebotId);

                  console.log(`🗑️ Angebot ${angebotId} gelöscht in Transaktion (nur ${teilnehmerAnzahl} Teilnehmer).`);
              }
          }
      });

    // BATCH: Lösche verknüpfte Teilnahmen
    let batch = db.batch();
    let opCount = 0;
    const MAX_BATCH_OPS = 490;

    for (const teilnehmerDoc of teilnehmerSnapshot.docs) {
        const teilnahmenSnap = await teilnehmerDoc.ref.collection('teilnahmen').get();
        for (const teilnahmeDoc of teilnahmenSnap.docs) {
            const { AngNr } = teilnahmeDoc.data() as Teilnahme;
            if (zuLoeschendeAngebote.includes(AngNr)) {
                batch.delete(teilnahmeDoc.ref);
                console.log(`🗑️ Teilnahme ${teilnahmeDoc.id} gelöscht (bezog sich auf Angebot ${AngNr}).`);

                opCount++;
                if (opCount >= MAX_BATCH_OPS) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
        }
    }
    if (opCount > 0) {
        await batch.commit();
    }
   */

console.log('\n✅ Löschvorgänge abgeschlossen.');
}

aufgabe6().catch(console.error);
