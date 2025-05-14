import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe4() {
    console.log('📖 Aufgabe 4: Read Queries\n');

    // a) Alle Orte, an denen Kurse durchgeführt werden
    /**
     * @old-relational-table Angebot
     * @collections angebote
     * @logic
     * 🔸 In SQL:
     *     SELECT DISTINCT Ort FROM Angebot;
     *  🔹 In Firestore:
     *     Alle Angebote abfragen und die Orte in einem Set speichern (um Duplikate zu vermeiden).
     * @difference-to-sql
     *  Firestore unterstützt keine DISTINCT-Abfrage, daher muss manuell ein Set verwendet werden,
     *  um Duplikate zu entfernen.
     */
    const angeboteSnapshot = await db.collection('angebote').get();
    const orte = new Set();
    angeboteSnapshot.forEach(doc => orte.add(doc.data().Ort));
    console.log('📍 Orte:', [...orte]);

    // b) Teilnehmer aus Augsburg
    /**
     * @old-relational-table Teilnehmer
     * @collections teilnehmer
     * @logic
     *  🔸 In SQL:
     *      SELECT * FROM Teilnehmer WHERE Ort = 'Augsburg';
     *  🔹 In Firestore:
     *    Alle Teilnehmer mit Ort = 'Augsburg' abfragen.
     * @difference-to-sql
     *  Firestore unterstützt WHERE-Filter, daher ist die Abfrage sehr ähnlich.
     */
    const teilnehmerAusAugsburg = await db.collection('teilnehmer')
        .where('Ort', '==', 'Augsburg').get();
    console.log('\n👥 Teilnehmer aus Augsburg:');
    teilnehmerAusAugsburg.forEach(doc =>
        console.log(`- ${doc.data().Name}`));

    // c) Kursleiter mit Gehalt zwischen 3000€ und 4000€
    /**
     * @old-relational-table Kursleiter
     * @collections kursleiter
     * @logic
     *  🔸 In SQL:
     *      SELECT * FROM Kursleiter WHERE Gehalt BETWEEN 3000 AND 4000 ORDER BY Name;
     *  🔹 In Firestore:
     *      Alle Kursleiter mit Gehalt >= 3000 und <= 4000 abfragen und nach Name sortieren.
     * @difference-to-sql
     *  Sehr identisch, da Firestore auch WHERE und ORDER BY unterstützt.
     */
    const kursleiter = await db.collection('kursleiter')
        .where('Gehalt', '>=', 3000)
        .where('Gehalt', '<=', 4000)
        .orderBy('Name').get();
    console.log('\n👩‍🏫 Kursleiter (Gehalt 3000€-4000€):');
    kursleiter.forEach(doc =>
        console.log(`- ${doc.data().Name}: ${doc.data().Gehalt}€`));

    // d) Kurstitel mit Datum und Ort
    /**
     * @old-relational-table Angebot, Kurs
     * @collections angebote, kurse
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort
     *   FROM Angebot a JOIN Kurs k ON a.KursNr = k.KursNr;
     *
     * 🔹 In Firestore:
     *   - Alle Dokumente aus 'angebote' laden
     *   - Für jedes Angebot: KursNr → passender Kurs aus 'kurse'
     *   - Ausgabe: kurs.Titel, angebot.Datum, angebot.Ort
     *
     * @difference-to-sql
     *   In SQL reicht ein JOIN. In Firestore muss jedes Kurs-Dokument separat nachgeladen werden.
     */
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    const angebote = await db.collection('angebote').get();
    for (const angebotDoc of angebote.docs) {
        const kurs = await db.collection('kurse').
        doc(angebotDoc.data().KursNr).get();
        console.log(`- ${kurs.data().Titel}: ${angebotDoc.data().Datum} in ${angebotDoc.data().Ort}`);
    }

    // e) Kurstitel mit Datum, Ort und Kursleiter
    /**
     * @old-relational-table Angebot, Kurs, Fuehrt_durch, Kursleiter
     * @collections angebote, kurse, fuehrt_durch, kursleiter
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort, l.Name
     *   FROM Angebot a
     *   JOIN Kurs k ON a.KursNr = k.KursNr
     *   JOIN Fuehrt_durch f ON f.AngNr = a.AngNr AND f.KursNr = a.KursNr
     *   JOIN Kursleiter l ON f.PersNr = l.PersNr;
     *
     * 🔹 In Firestore:
     *   - Angebot laden → KursNr → Titel aus 'kurse'
     *   - Angebot.ID → passenden Eintrag aus 'fuehrt_durch'
     *   - PersNr → Kursleiter-Dokument aus 'kursleiter'
     *
     * @difference-to-sql
     *   Kein Mehrfach-JOIN wie in SQL möglich – jede Verbindung wird über separate Dokumente gelöst.
     */
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angebote.docs) {
        const kurs = await db.collection('kurse').
        doc(angebotDoc.data().KursNr).get();
        const fuehrtDurch = await db.collection('fuehrt_durch').
        doc(angebotDoc.id).get();
        const kursleiterDoc = await db.collection('kursleiter').
        doc(fuehrtDurch.data().PersNr.toString()).get();
        console.log(`- ${kurs.data().Titel}: ${angebotDoc.data().Datum}, ${angebotDoc.data().Ort}, 
        Kursleiter: ${kursleiterDoc.data().Name}`);
    }

    // f) Kurstitel mit Voraussetzungen
    /**
     * @old-relational-table Kurs, Vorauss
     * @collections kurse, voraussetzungen
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, v.VorNr FROM Kurs k LEFT JOIN Vorauss v ON k.KursNr = v.KursNr;
     *
     * 🔹 In Firestore:
     *   - Alle Kurse laden
     *   - Für jeden Kurs: voraussetzungen mit where('KursNr', '==', kursId)
     *   - Für jede VorNr: Kurs nachladen, um Titel zu bekommen
     *
     * @difference-to-sql
     *   Kein LEFT JOIN – Kurse ohne Voraussetzungen müssen manuell mit 'NULL' befüllt werden.
     */
    console.log('\n📚 Kurstitel mit Voraussetzungen:\n');

    // Schritt 1: Alle Kurse laden
    const kurseSnapshot = await db.collection('kurse').get();
    const kurseMitVoraussetzungen = [];

    // Schritt 2: Voraussetzungen pro Kurs sammeln
    for (const kursDoc of kurseSnapshot.docs) {
        const kursId = kursDoc.id;
        const kursTitel = kursDoc.data().Titel;

        const voraussetzungenSnapshot =
            await db.collection('voraussetzungen').where('KursNr', '==', kursId).get();
        const vorTitelPromises = voraussetzungenSnapshot.docs.map
        (async v => {
            const vorKursDoc =
                await db.collection('kurse').doc(v.data().VorNr).get();
            return vorKursDoc.exists ? vorKursDoc.data().Titel : null;
        });

        const vorTitel = await Promise.all(vorTitelPromises);
        kurseMitVoraussetzungen.push({
            kursTitel,
            vorausTitel: vorTitel.filter(Boolean)
        });
    }

    // Schritt 3: Sortieren nach Kurstitel
    kurseMitVoraussetzungen.sort((a, b) => a.kursTitel.localeCompare(b.kursTitel));

    // Schritt 4: Ausgabe
    console.log('Kurs'.padEnd(40) + 'Voraussetzungen');
    console.log('-'.repeat(80));
    for (const kurs of kurseMitVoraussetzungen) {
        const vorausText = kurs.vorausTitel.length > 0 ? kurs.vorausTitel.join(', ') : 'NULL';
        console.log(kurs.kursTitel.padEnd(40) + vorausText);
    }

    // g) Teilnehmer, die einen Kurs am eigenen Wohnort gebucht haben
        /**
     * @old-relational-table Teilnehmer, Nimmt_teil, Angebot
     * @collections teilnehmer, teilnahmen, angebote
     * @logic
     * 🔸 In SQL:
     *   SELECT t.Name, a.Ort FROM Teilnehmer t
     *   JOIN Nimmt_teil nt ON t.TnNr = nt.TnNr
     *   JOIN Angebot a ON nt.AngNr = a.AngNr AND nt.KursNr = a.KursNr
     *   WHERE t.Ort = a.Ort;
     *
     * 🔹 In Firestore:
     *   - Alle teilnahmen laden
     *   - Für jede Teilnahme: Teilnehmer und Angebot-Dokument nachladen
     *   - Ort vergleichen → Ausgabe bei Übereinstimmung
     *
     * @difference-to-sql
     *   Kein WHERE über mehrere Tabellen möglich – Vergleich findet im Code statt.
     */
    console.log('\n👥 Teilnehmer am eigenen Wohnort:');
    const teilnahmen = await db.collection('teilnahmen').get();
    for (const teilnahmeDoc of teilnahmen.docs) {
        const { TnNr, AngNr, KursNr } = teilnahmeDoc.data();
        const teilnehmer =
            await db.collection('teilnehmer').doc(TnNr.toString()).get();
        const angebot =
            await db.collection('angebote').doc(`${AngNr}_${KursNr}`).get();
        if (teilnehmer.exists && angebot.exists && teilnehmer.data().Ort === angebot.data().Ort) {
            console.log(`- ${teilnehmer.data().Name}: ${angebot.data().Ort}`);
        }
    }

    // h) Kursangebote ohne Teilnehmer
    /**
     * @old-relational-table Angebot, Nimmt_teil
     * @collections angebote, teilnahmen
     * @logic
     * 🔸 In SQL:
     *   SELECT * FROM Angebot a
     *   LEFT JOIN Nimmt_teil nt ON nt.AngNr = a.AngNr AND nt.KursNr = a.KursNr
     *   WHERE nt.TnNr IS NULL;
     *
     * 🔹 In Firestore:
     *   - Alle teilnahmen laden → IDs kombinieren und in Set speichern
     *   - Alle angebote prüfen → wenn ID nicht im Set → ausgeben
     *
     * @difference-to-sql
     *   Kein LEFT JOIN oder NULL-Filter – muss clientseitig nachgebaut werden.
     */

    console.log('\n📚 Kursangebote ohne Teilnehmer:');
    const angebotIdsMitTeilnehmer = new Set(teilnahmen.docs.map(
        doc => `${doc.data().AngNr}_${doc.data().KursNr}`));
    angebote.docs.forEach(doc => {
        if (!angebotIdsMitTeilnehmer.has(doc.id)) {
            console.log(`- Angebot ${doc.id}`);
        }
    });

    // i) Kurse mit mindestens 2 Teilnehmern
    /**
     * @old-relational-table Nimmt_teil, Kurs
     * @collections teilnahmen, angebote, kurse
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, COUNT(*) FROM Nimmt_teil nt
     *   JOIN Kurs k ON nt.KursNr = k.KursNr
     *   GROUP BY nt.AngNr, nt.KursNr
     *   HAVING COUNT(*) >= 2;
     *
     * 🔹 In Firestore:
     *   - Alle teilnahmen durchlaufen → Counter-Map aufbauen pro AngNr_KursNr
     *   - Bei ≥2 ausgeben → ggf. Titel über Angebot/Kurs nachladen
     *
     * @difference-to-sql
     *   Kein GROUP BY / HAVING → Zählung erfolgt komplett im Code.
     */
    console.log('\n📚 Kurse mit mind. 2 Teilnehmern:');
    const teilnehmerCounter = {};
    teilnahmen.forEach(doc => {
        const key = `${doc.data().AngNr}_${doc.data().KursNr}`;
        teilnehmerCounter[key] = (teilnehmerCounter[key] || 0) + 1;
    });
    for (const [key, count] of Object.entries(teilnehmerCounter)) {
        if (count >= 2) console.log(`- Angebot ${key}: ${count} Teilnehmer`);
    }

    // j) Alle Meier
    /**
     * @old-relational-table Teilnehmer, Kursleiter
     * @collections teilnehmer, Kursleiter
     * @logic
     *   🔸 In SQL:
     *       SELECT * FROM Teilnehmer WHERE name LIKE '%Meier%' UNION SELECT * FROM Kursleiter
     *       WHERE name LIKE '%Meier%';
     *   🔹 In Firestore:
     *       Zwei separate Abfragen:
     *          - teilnehmer: Name >= 'Meier' und Name <= 'Meier\uf8ff'
     *          - kursleiter: Name >= 'Meier' und Name <= 'Meier\uf8ff'
     * @difference-to-sql
     *   In SQL können Daten aus mehreren Tabellen mit UNION kombiniert werden. In Firestore
     *   kann jede Read-Operation nur auf eine Collection angewendet werden, daher
     *   werden zwei separate Abfragen durchgeführt.
     */
    console.log('\n👥 Alle Meier:');
    const meierTeilnehmer = await db.collection('teilnehmer').
    where('Name', '>=', 'Meier').where('Name', '<=', 'Meier\uf8ff').get();
    meierTeilnehmer.forEach(doc =>
        console.log(`- Teilnehmer: ${doc.data().Name}`));
    const meierKursleiter = await db.collection('kursleiter').
    where('Name', '>=', 'Meier').where('Name', '<=', 'Meier\uf8ff').get();
    meierKursleiter.forEach(doc =>
        console.log(`- Kursleiter: ${doc.data().Name}`));

    // k. Kurstitel mit Anzahl der Angebote
    /**
     * @old-relational-table Teilnehmer, Kursleiter
     * @collections teilnehmer, Kursleiter
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel, COUNT(a.id) AS angebote_count FROM Kurs k LEFT JOIN Angebot a ON k.KursNr = a.KursNr
     *       GROUP BY k.KursNr, k.Titel ORDER BY k.Titel;
     *   🔹 In Firestore:
     *       Erst alle Kurse laden, dann für jeden Kurs alle Angebote laden und zählen. Alternative wäre zusätzliches
     *       Attribut in der Kurse-Collection zu speichern und dieses über Trigger zu aktualisieren.
     * @difference-to-sql
     *   Firestore unterstützt weder JOINS noch Aggreagationen wie COUNT, daher muss manuell
     *   iteriert und gezählt werden.
     */
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');
    const kurseSnapshotAll = await db.collection('kurse').get();
    for (const kursDoc of kurseSnapshotAll.docs) {
        const kursId = kursDoc.id;
        const angeboteCount = (await db.collection('angebote').
        where('KursNr', '==', kursId).get()).size;
        console.log(`- ${kursDoc.data().Titel}: ${angeboteCount} Angebote`);
    }

    // l. Kurstitel mit Anzahl der Voraussetzungen (mind. 2 Voraussetzungen)
    /**
     * @old-relational-table Vorauss, Kurs
     * @collections voraussetzungen, kurse
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel FROM Kurs k JOIN Vorauss v ON k.KursNr = v.KursNr GROUP BY k.KursNr,
     *       k.Titel HAVING COUNT(v.VorNr) >= 2;
     *   🔹 In Firestore:
     *       Erst alle Voraussetzungen laden und zählen pro Kurs. Dann die Kurse mit mindestens
     *       2 Voraussetzungen laden.
     * @difference-to-sql
     *   Firestore unterstützt weder JOINS noch Aggreagationen wie COUNT, daher muss manuell
     *   iteriert und gezählt werden.
     */
    console.log('\n📚 Kurstitel mit mindestens 2 Voraussetzungen:');
    const voraussetzungenSnapshotAll =
        await db.collection('voraussetzungen').get();
    const voraussetzungCounter = {};
    voraussetzungenSnapshotAll.docs.forEach(doc => {
        const kursNr = doc.data().KursNr;
        voraussetzungCounter[kursNr] = (voraussetzungCounter[kursNr] || 0) + 1;
    });
    const sortedVoraussetzungen = Object.entries(voraussetzungCounter)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]);
    for (const [kursNr, count] of sortedVoraussetzungen) {
        const kurs =
            await db.collection('kurse').doc(kursNr).get();
        console.log(`- ${kurs.data().Titel}: ${count} Voraussetzungen`);
    }

    // m. Durchschnittliches Gehalt der Kursleiter pro Kurs
    /**
     * @old-relational-table Kursleiter, Fuehrt_Durch, Kurs
     * @collections kursleiter, fuehrt_durch, kurse
     * @logic
     *   🔸 In SQL: SELECT k.Titel, AVG(kl.Gehalt) FROM Kurs k JOIN Fuehrt_Durch fd ON k.KursNr =
     *   fd.KursNr JOIN Kursleiter kl ON fd.PersNr = kl.PersNr GROUP BY k.KursNr, k.Titel;
     *   🔹 In Firestore:
     *       Alle Dokumente aus fuehrt_durch laden. Für jeden Eintrag das Kursleiter-Gehalt summieren und zählen.
     *       Danach pro Kurs den Durchschnitt berechnen und Kurstitel nachladen.
     * @difference-to-sql
     *   Kein direktes JOIN oder AVG in Firestore – manuelles Sammeln, Aggregieren und Zuordnen erforderlich.
     */
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    const kursGehalt = {};
    const fuehrtDurchSnapshot =
        await db.collection('fuehrt_durch').get();
    for (const fdDoc of fuehrtDurchSnapshot.docs) {
        const { KursNr, PersNr } = fdDoc.data();
        const kursleiterDoc =
            await db.collection('kursleiter').doc(PersNr.toString()).get();
        if (kursleiterDoc.exists) {
            const gehalt = kursleiterDoc.data().Gehalt;
            if (!kursGehalt[KursNr]) kursGehalt[KursNr] = { sum: 0, count: 0 };
            kursGehalt[KursNr].sum += gehalt;
            kursGehalt[KursNr].count += 1;
        }
    }
    const gehaltDurchschnittArray = [];
    for (const [kursNr, { sum, count }] of Object.entries(kursGehalt)) {
        gehaltDurchschnittArray.push({
            kursNr,
            durchschnitt: (sum / count).toFixed(2)
        });
    }
    gehaltDurchschnittArray.sort((a, b) => a.durchschnitt - b.durchschnitt);
    for (const { kursNr, durchschnitt } of gehaltDurchschnittArray) {
        const kurs =
            await db.collection('kurse').doc(kursNr).get();
        console.log(`- ${kurs.data().Titel}: Durchschnittliches Gehalt ${durchschnitt}€`);
    }

    // n. Alle Paare von Kursleitern, die denselben Kurs halten
    /**
     * @old-relational-table Kursleiter, Fuehrt_Durch, Kurs
     * @collections kursleiter, fuehrt_durch, kurse
     * @logic
     *   🔸 In SQL:
     *       SELECT kl1.Name, kl2.Name, k.Titel
     *       FROM Fuehrt_Durch fd1
     *       JOIN Fuehrt_Durch fd2 ON fd1.KursNr = fd2.KursNr AND fd1.PersNr < fd2.PersNr
     *       JOIN Kursleiter kl1 ON fd1.PersNr = kl1.PersNr
     *       JOIN Kursleiter kl2 ON fd2.PersNr = kl2.PersNr
     *       JOIN Kurs k ON fd1.KursNr = k.KursNr;
     *   🔹 In Firestore:
     *       Alle fuehrt_durch-Einträge laden. Pro Kurs eine Set-Liste aller Leiter aufbauen.
     *       Für Kurse mit mehr als einem Leiter alle eindeutigen Paare bilden und deren Namen + Kurstitel nachladen.
     * @difference-to-sql
     *   Kein Self-Join in Firestore möglich. Paare müssen clientseitig gebildet und nacheinander aufgelöst werden.
     */
    console.log('\n👩‍🏫 Paare von Kursleitern, die denselben Kurs halten:');
    const kursAngeboteLeiter = {};
    fuehrtDurchSnapshot.docs.forEach(doc => {
        const { KursNr, PersNr } = doc.data();
        if (!kursAngeboteLeiter[KursNr]) kursAngeboteLeiter[KursNr] = new Set();
        kursAngeboteLeiter[KursNr].add(PersNr);
    });
    for (const [kursNr, leiterSet] of Object.entries(kursAngeboteLeiter)) {
        const leiterArray = Array.from(leiterSet);
        if (leiterArray.length > 1) {
            const kurs =
                await db.collection('kurse').doc(kursNr).get();
            for (let i = 0; i < leiterArray.length - 1; i++) {
                for (let j = i + 1; j < leiterArray.length; j++) {
                    const leiter1 =
                        await db.collection('kursleiter').doc(leiterArray[i].toString()).get();
                    const leiter2 =
                        await db.collection('kursleiter').doc(leiterArray[j].toString()).get();
                    if (leiter1.exists && leiter2.exists) {
                        console.log(`- ${kurs.data().Titel}: ${leiter1.data().Name} & ${leiter2.data().Name}`);
                    }
                }
            }
        }
    }

    console.log('\n✅ Fertig.');
}

await aufgabe4();
