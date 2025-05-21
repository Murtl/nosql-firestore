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
    const teilnehmerAusAugsburg =
        await db.collection('teilnehmer').where('Ort', '==', 'Augsburg').get();
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

    /**
     * @old-relational-table Angebot, Kurs
     * @collections angebote, kurse
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort
     *   FROM Angebot a JOIN Kurs k ON a.KursNr = k.KursNr;
     *
     * 🔹 In Firestore:
     *   - Alle Dokumente aus der Collection 'angebote' lesen
     *   - Für jedes Angebot das zugehörige Kurs-Dokument über KursNr (Document-ID) laden
     *   - Datum (Timestamp) wird per .toDate().toLocaleDateString() in lesbares Format umgewandelt
     *   - Ausgabe: kurse.Titel, angebot.Datum, angebot.Ort
     *
     * @difference-to-sql
     *   In SQL erfolgt die Verknüpfung über JOIN automatisch in einer Abfrage.
     *   In Firestore müssen die verknüpften Daten (z. B. Kurs) manuell über ihre ID nachgeladen werden.
     *       -> Dies führt zu mehreren Leseoperationen und mehr Codeaufwand.
     */
    // d) Kurstitel mit Datum und Ort
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    const angebote = await db.collection('angebote').get();
    for (const angebotDoc of angebote.docs) {
        const angebot = angebotDoc.data();
        const kurs =
            await db.collection('kurse').doc(angebot.KursNr).get();
        if (kurs.exists) {
            console.log(`- ${kurs.data().Titel}: ${angebot.Datum} in ${angebot.Ort}`);
        }
    }

    /**
     * @old-relational-table Angebot, Kurs, Fuehrt_durch, Kursleiter
     * @collections angebote, kurse, kursleiter (Subcollection unter angebote: kursleiter)
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort, l.Name
     *   FROM Angebot a
     *   JOIN Kurs k ON a.KursNr = k.KursNr
     *   JOIN Fuehrt_durch f ON f.AngNr = a.AngNr AND f.KursNr = a.KursNr
     *   JOIN Kursleiter l ON f.PersNr = l.PersNr;
     *
     * 🔹 In Firestore:
     *   - Alle Angebote aus 'angebote' laden
     *   - Für jedes Angebot: Kurs über 'kurse[angebot.KursNr]' laden
     *   - Kursleiter liegen als Subcollection unter dem Angebot: 'angebote/{id}/kursleiter'
     *   - Für jede ID in Subcollection: Name aus 'kursleiter' Collection nachladen
     *
     * @difference-to-sql
     *   In SQL wird alles in einem JOIN abgebildet.
     *   In Firestore sind mehrere Schritte nötig:
     *   - Kursleiter-IDs liegen dezentral in einer Subcollection
     *   - Kursleiter-Details müssen einzeln nachgeladen werden
     *   - Es gibt keinen direkten JOIN → viele Einzel-Reads
     */
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angebote.docs) {
        const angebot = angebotDoc.data();
        const kurs =
            await db.collection('kurse').doc(angebot.KursNr).get();
        const kursleiterSnap =
            await db.collection('angebote').doc(angebotDoc.id).collection('kursleiter').get();
        const kursleiterNamen = [];
        for (const leiter of kursleiterSnap.docs) {
            const kursleiterDoc =
                await db.collection('kursleiter').doc(leiter.id).get();
            if (kursleiterDoc.exists) {
                kursleiterNamen.push(kursleiterDoc.data().Name);
            }
        }
        const leiterText = kursleiterNamen.length > 0 ? kursleiterNamen.join(', ') : 'Keine Angabe';
        console.log(`- ${kurs.data().Titel}: ${angebot.Datum}, ${angebot.Ort}, Kursleiter: ${leiterText}`);
    }

    /**
     * @old-relational-table Kurs, Vorauss
     * @collections kurse, kurse/{KursNr}/voraussetzungen (Subcollection aus Kurse)
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, v.VorNr
     *   FROM Kurs k
     *   LEFT JOIN Vorauss v ON k.KursNr = v.KursNr;

    * 🔹 In Firestore:
    *   - Alle Dokumente aus 'kurse' laden
    *   - Für jeden Kurs: Subcollection 'voraussetzungen' abrufen
    *   - Für jede Voraussetzung (v.id): den Kurs über 'kurse[v.id]' nachladen
    *   - Ausgabe: Titel des Kurses + Titel der Voraussetzungen

    * @difference-to-sql
    *   In SQL ist das ein einfacher LEFT JOIN.
    *   In Firestore:
    *     - Jede Voraussetzung muss separat gelesen werden (mehrere Reads)
    *     - Subcollections sind an Kurs gebunden – globale Analyse erschwert
    *     - Bei NULL-Werte wird nichts geschrieben
    */
    // f) Kurstitel mit Voraussetzungen
    console.log('\n📚 Kurstitel mit Voraussetzungen:\n');
    const kurseSnapshot = await db.collection('kurse').get();
    const kurseMitVoraussetzungen = [];

    for (const kursDoc of kurseSnapshot.docs) {
        const kursId = kursDoc.id;
        const kursTitel = kursDoc.data().Titel;
        const voraussetzungenSnapshot =
            await db.collection('kurse').doc(kursId).collection('voraussetzungen').get();
        const vorausTitel = [];
        for (const v of voraussetzungenSnapshot.docs) {
            const vorKurs =
                await db.collection('kurse').doc(v.id).get();
            if (vorKurs.exists) vorausTitel.push(vorKurs.data().Titel);
        }
        kurseMitVoraussetzungen.push({
            kursTitel,
            vorausTitel: vorausTitel.length > 0 ? vorausTitel : ['NULL']
        });
    }

    kurseMitVoraussetzungen.sort((a, b) => a.kursTitel.localeCompare(b.kursTitel));
    console.log('Kurs'.padEnd(40) + 'Voraussetzungen');
    console.log('-'.repeat(80));
    for (const kurs of kurseMitVoraussetzungen) {
        const vorausText = kurs.vorausTitel.join(', ');
        console.log(kurs.kursTitel.padEnd(40) + vorausText);
    }

    /**
     * @old-relational-table Teilnehmer, Angebot, Nimmt_teil
     * @collections teilnehmer, teilnehmer/{TnNr}/teilnahmen, angebote
     *
     * @logic
     * 🔸 In SQL:
     *   SELECT t.Name, a.Ort
     *   FROM Teilnehmer t
     *   JOIN Nimmt_teil nt ON t.TnNr = nt.TnNr
     *   JOIN Angebot a ON a.AngNr = nt.AngNr
     *   WHERE t.Ort = a.Ort;
     *
     * 🔹 In Firestore:
     *   - Alle Teilnehmer laden
     *   - Für jeden Teilnehmer → Subcollection teilnahmen lesen
     *   - Für jede Teilnahme → passendes Angebot per ID laden
     *   - Wohnort vom Teilnehmer mit Ort des Angebots vergleichen
     *   - Bei Übereinstimmung ausgeben
     *
     * @difference-to-sql
     *   In SQL reicht ein einziger JOIN mit WHERE-Bedingung.
     *   In Firestore sind mehrere Reads notwendig: Teilnehmer → Teilnahmen → Angebot.
     */
    // g) Teilnehmer, die einen Kurs am eigenen Wohnort gebucht haben
    console.log('\n👥 Teilnehmer am eigenen Wohnort:');
    const teilnehmerSnap = await db.collection('teilnehmer').get();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnehmer = tnDoc.data();
        const teilnahmen =
            await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr } = teilnahme.data();
            const angebot =
                await db.collection('angebote').doc(`${AngNr}`).get();
            if (angebot.exists && angebot.data().Ort === teilnehmer.Ort) {
                console.log(`- ${teilnehmer.Name}: ${angebot.data().Ort}`);
            }
        }
    }

      /**
     * @old-relational-table Angebot, Nimmt_teil, Teilnehmer
     * @collections angebote, teilnehmer/{id}/teilnahmen
     * @logic
     * 🔸 In SQL:
     *   SELECT * FROM Angebot a
     *   LEFT JOIN Nimmt_teil nt ON a.AngNr = nt.AngNr
     *   WHERE nt.TnNr IS NULL;
     *
     * 🔹 In Firestore:
     *   - Alle Teilnehmer durchlaufen
     *   - Pro Teilnehmer: Subcollection 'teilnahmen' abrufen
     *   - Alle belegten AngNr in Set speichern
     *   - Danach: Alle Angebote durchgehen
     *   - Wenn Angebot.ID nicht im Set → ausgeben
     *   - Kurs-Titel wird über Angebot.KursNr aus 'kurse' nachgeladen
     *
     * @difference-to-sql
     *   Firestore kennt kein LEFT JOIN oder NULL-Filter.
     *   Stattdessen: Manuelle Umsetzung über Set-Logik + Subcollection-Zugriff.
     *   Kein direkter globaler Query auf teilnahmen → iteration notwendig.
     */
    // h) Kursangebote ohne Teilnehmer
    console.log('\n📚 Kursangebote ohne Teilnehmer:');
    const angeboteSnap = await db.collection('angebote').get();
    const belegteAngebote = new Set();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmen =
            await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr} = teilnahme.data();
            belegteAngebote.add(`${AngNr}`);
        }
    }
    for (const angebotDoc of angeboteSnap.docs) {
        if (!belegteAngebote.has(angebotDoc.id)) {
            const angebot = angebotDoc.data();
            const kurs =
                await db.collection('kurse').doc(angebot.KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data().Titel : angebot.KursNr}, Angebot ${angebotDoc.id}`);
        }
    }

    /**
     * @old-relational-table Nimmt_teil, Kurs, Angebot
     * @collections teilnehmer, teilnehmer/{id}/teilnahmen , angebote, kurse
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, COUNT(*) AS Anzahl
     *   FROM Nimmt_teil nt
     *   JOIN Angebot a ON nt.AngNr = a.AngNr
     *   JOIN Kurs k ON a.KursNr = k.KursNr
     *   GROUP BY nt.AngNr
     *   HAVING COUNT(*) >= 2;
     *
     * 🔹 In Firestore:
     *   - Für jeden Teilnehmer `teilnehmer/{TnNr}` die Subcollection `teilnahmen` lesen
     *   - Für jede Teilnahme: `AngNr` zählen (Counter-Map)
     *   - Nur Angebote mit ≥ 2 Einträgen verwenden
     *   - Jeweils dazugehöriges `angebot` und `kurs` per ID nachladen
     *   - Ausgabe: Kurstitel + Teilnehmeranzahl
     *
     * @difference-to-sql
     *   - Kein GROUP BY oder HAVING in Firestore → Zählung erfolgt manuell im Code
     *   - Kein Join zwischen Teilnahme, Angebot, Kurs → alles muss mit separaten `.get()`-Operationen verknüpft werden
     *   - Mehrere Lesezugriffe pro Ergebnis → langsamer & komplexer
     */
     // i) Kurse mit mindestens 2 Teilnehmern
    console.log('\n📚 Kurse mit mind. 2 Teilnehmern:');
    const teilnahmeCounter = {};
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmen =
            await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr} = teilnahme.data();
            const key = `${AngNr}`;
            teilnahmeCounter[key] = (teilnahmeCounter[key] || 0) + 1;
        }
    }
    for (const [angebotId, count] of Object.entries(teilnahmeCounter)) {
        if (count >= 2) {
            const angebot =
                await db.collection('angebote').doc(angebotId).get();
            const kurs =
                await db.collection('kurse').doc(angebot.data().KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data().Titel : angebot.data().KursNr}: ${count} Teilnehmer`);
        }
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
     *   In SQL können Daten aus mehreren Tabellen mit UNION kombiniert werden. In Firestore kann jede
     *   Read-Operation nur auf eine Collection angewendet werden, daher werden zwei separate Abfragen durchgeführt.
     */
    console.log('\n👥 Alle Meier:');
    const teilnehmerMeier = await db.collection('teilnehmer')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff').get();
    teilnehmerMeier.forEach(doc =>
        console.log(`- Teilnehmer: ${doc.data().Name}`));
    const kursleiterMeier =
        await db.collection('kursleiter')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff').get();
    kursleiterMeier.forEach(doc =>
        console.log(`- Kursleiter: ${doc.data().Name}`));

    // k) Kurstitel mit Anzahl der Angebote
    /**
     * @old-relational-table Kurs, Angebot
     * @collections kurse, angebote
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel, COUNT(a.id) AS angebote_count FROM Kurs k LEFT JOIN Angebot a ON k.KursNr = a.KursNr
     *       GROUP BY k.KursNr, k.Titel ORDER BY k.Titel;
     *   🔹 In Firestore:
     *       Erst alle Kurse laden, dann für jeden Kurs alle Angebote laden und zählen. Alternative wäre zusätzliches
     *       Attribut in der Kurse-Collection zu speichern und dieses über Trigger zu aktualisieren.
     * @difference-to-sql
     *   Firestore untersützt weder JOINS noch Aggreagationen wie COUNT. Daher muss manuell
     *   iteriert und gezählt werden.
     */
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');
    const kurseSnap = await db.collection('kurse').get();
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angeboteCount = (await db.collection('angebote').
        where('KursNr', '==', kursId).get()).size;
        console.log(`- ${kursDoc.data().Titel}: ${angeboteCount} Angebote`);
    }

    // l) Kurstitel mit Anzahl der Voraussetzungen (mind. 2)
    /**
     * @old-relational-table Vorauss, Kurs
     * @collections voraussetzungen, kurse
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel FROM Kurs k JOIN Vorauss v ON k.KursNr = v.KursNr GROUP BY k.KursNr,
     *       k.Titel HAVING COUNT(v.VorNr) >= 2;
     *   🔹 In Firestore:
     *       Erst Kurse laden, dann je Kurs die Subcollection "voraussetzungen" laden und zählen.
     * @difference-to-sql
     *   Firestore unterstützt weder JOINS noch Aggreagationen wie COUNT, daher muss manuell
     *   iteriert und gezählt werden.
     */
    console.log('\n📚 Kurstitel mit mindestens 2 Voraussetzungen:');
    const vorausList = [];  // ← hier wird die Liste korrekt initialisiert
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await db.collection('kurse').
        doc(kursDoc.id).collection('voraussetzungen').get();
        if (vorausSnap.size >= 2) {
            vorausList.push({ titel: kursDoc.data().Titel, count: vorausSnap.size });
        }
    }
    vorausList.sort((a, b) => b.count - a.count);
    vorausList.forEach(k => console.log(`- ${k.titel}: ${k.count} Voraussetzungen`));


    // m) Durchschnittliches Gehalt der Kursleiter pro Kurs
    /**
     * @alt-structure kurse > angebote > kursleiter (Subcollection)
     * @collections kurse, angebote, kursleiter
     * @logic
     *   🔸 In SQL: SELECT k.Titel, AVG(kl.Gehalt) FROM Kurs k JOIN Fuehrt_Durch fd ON k.KursNr = fd.KursNr
     *   JOIN Kursleiter kl ON fd.PersNr = kl.PersNr GROUP BY k.KursNr, k.Titel;
     *   🔹 In Firestore:
     *       Für jeden Kurs alle zugehörigen Angebote abfragen.
     *       Für jedes Angebot die Subcollection `kursleiter` durchgehen und deren Gehälter aufsummieren.
     *       Danach Durchschnitt berechnen und sortiert ausgeben.
     * @difference-to-sql
     *   Kein JOIN oder AVG vorhanden – die geschachtelte Struktur erfordert rekursives
     *   Traversieren über mehrere Ebenen.
     */
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    const kursGehaelter = [];
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angebote = await db.collection('angebote').
        where('KursNr', '==', kursId).get();
        const gehaltSum = [];
        for (const angebot of angebote.docs) {
            const leiterSnap = await db.collection('angebote').
            doc(angebot.id).collection('kursleiter').get();
            for (const leiter of leiterSnap.docs) {
                const leiterDoc =
                    await db.collection('kursleiter').doc(leiter.id).get();
                if (leiterDoc.exists) gehaltSum.push(leiterDoc.data().Gehalt);
            }
        }
        if (gehaltSum.length > 0) {
            const avg = gehaltSum.reduce((a, b) => a + b, 0) / gehaltSum.length;
            kursGehaelter.push({ titel: kursDoc.data().Titel, durchschnitt: avg });
        }
    }
    kursGehaelter.sort((a, b) => b.durchschnitt - a.durchschnitt);
    kursGehaelter.forEach(e => console.log(`- ${e.titel}: ${e.durchschnitt.toFixed(2)} €`));

    // n) Kursleiter-Paare, die denselben Kurs halten
    /**
     * @alt-structure angebote > kursleiter (Subcollection), angebote referenzieren KursNr
     * @collections angebote, kursleiter, kurse
     * @logic
     *   🔸 In SQL:
     *       SELECT kl1.Name, kl2.Name, k.Titel
     *       FROM Fuehrt_Durch fd1
     *       JOIN Fuehrt_Durch fd2 ON fd1.KursNr = fd2.KursNr AND fd1.PersNr < fd2.PersNr
     *       JOIN Kursleiter kl1 ON fd1.PersNr = kl1.PersNr
     *       JOIN Kursleiter kl2 ON fd2.PersNr = kl2.PersNr
     *       JOIN Kurs k ON fd1.KursNr = k.KursNr;
     *   🔹 In Firestore:
     *       Alle Angebote laden und die `kursleiter`-Subcollections durchgehen.
     *       Für jede KursNr eine Liste von Leitern aufbauen.
     *       Wenn mindestens zwei vorhanden sind, alle eindeutigen Paare bilden und ihre Namen + Kurstitel ausgeben.
     * @difference-to-sql
     *   Kein Self-Join möglich – Paare müssen manuell im Client konstruiert werden.
     *   Subcollections pro Angebot erhöhen die Tiefe der Traversierung.
     */
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');
    const kursLeiterMap = {};
    const angeboteSnapAll = await db.collection('angebote').get();
    for (const angebotDoc of angeboteSnapAll.docs) {
        const angebot = angebotDoc.data();
        if (!kursLeiterMap[angebot.KursNr]) kursLeiterMap[angebot.KursNr] = new Set();
        const leiterSnap =
            await db.collection('angebote').doc(angebotDoc.id).collection('kursleiter').get();
        leiterSnap.docs.forEach(d =>
            kursLeiterMap[angebot.KursNr].add(d.id));
    }
    for (const [kursNr, leiterSet] of Object.entries(kursLeiterMap)) {
        const leiter = Array.from(leiterSet);
        if (leiter.length < 2) continue;
        const kurs =
            await db.collection('kurse').doc(kursNr).get();
        for (let i = 0; i < leiter.length - 1; i++) {
            for (let j = i + 1; j < leiter.length; j++) {
                const l1 =
                    await db.collection('kursleiter').doc(leiter[i]).get();
                const l2 =
                    await db.collection('kursleiter').doc(leiter[j]).get();
                if (l1.exists && l2.exists) {
                    console.log(`- ${kurs.data().Titel}: ${l1.data().Name} & ${l2.data().Name}`);
                }
            }
        }
    }

    console.log('\n✅ Fertig.');
}

await aufgabe4();
