import {Firestore} from '@google-cloud/firestore';
import {Angebot, Kurs, Kursleiter, Teilnehmer, Teilnahme, createConverter} from '../data/types';

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
    const angeboteSnapshot = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const orte = new Set(angeboteSnapshot.docs.map(a => a.data().Ort));
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
    const teilnehmerAusAugsburg = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>())
        .where('Ort', '==', 'Augsburg').get();
    console.log('\n👥 Teilnehmer aus Augsburg:');
    teilnehmerAusAugsburg.forEach(t => console.log(`- ${t.data().Name}`));

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
    const kursleiterSnap = await db.collection('kursleiter').withConverter(createConverter<Kursleiter>())
        .where('Gehalt', '>=', 3000).where('Gehalt', '<=', 4000).orderBy('Name').get();
    console.log('\n👩‍🏫 Kursleiter (Gehalt 3000€-4000€):');
    kursleiterSnap.forEach(k => console.log(`- ${k.data().Name}: ${k.data().Gehalt}€`));

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
    console.log('\n Kurstitel mit Datum und Ort:');
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebot = angebotDoc.data();
        const kursSnap = await db.collection('kurse').doc(angebot.KursNr).withConverter(createConverter<Kurs>()).get();
        if (kursSnap.exists) {
            console.log(`- ${kursSnap.data()?.Titel}: ${angebot.Datum.toDate().toLocaleDateString()} in ${angebot.Ort}`);
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

    // e) Kurstitel mit Datum, Ort und Kursleiter
    console.log('\n Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebot = angebotDoc.data();
        const kursSnap = await db.collection('kurse').doc(angebot.KursNr).withConverter(createConverter<Kurs>()).get();
        const kursleiterSnap = await angebotDoc.ref.collection('kursleiter').get();
        const leiterNamen = await Promise.all(kursleiterSnap.docs.map(async leiterDoc => {
            const leiterSnap = await db.collection('kursleiter').doc(leiterDoc.id).get();
            return leiterSnap.exists ? leiterSnap.data()?.Name : 'Unbekannt';
        }));
        console.log(`- ${kursSnap.data()?.Titel}: ${angebot.Datum.toDate().toLocaleDateString()}, ${angebot.Ort}, Kursleiter: ${leiterNamen.join(', ')}`);
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
    *     - NULL-Werte müssen manuell ersetzt werden 
    */

    // f) Kurstitel mit Voraussetzungen
    console.log('\n Kurstitel mit Voraussetzungen:');
    const kurseSnap = await db.collection('kurse').withConverter(createConverter<Kurs>()).get();
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();
        const vorausTitel = await Promise.all(vorausSnap.docs.map(async v => {
            const vSnap = await db.collection('kurse').doc(v.id).get();
            return vSnap.exists ? vSnap.data()?.Titel : 'NULL';
        }));
        console.log(`- ${kursDoc.data().Titel}: ${vorausTitel.join(', ')}`);
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
    const teilnehmerSnap = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>()).get();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnehmer = tnDoc.data();
        const teilnahmenSnap = await tnDoc.ref.collection('teilnahmen').get();
        for (const teilnahme of teilnahmenSnap.docs) {
            const { AngNr } = teilnahme.data() as Teilnahme;
            const angebot = await db.collection('angebote').doc(AngNr).get();
            if (angebot.exists && angebot.data()?.Ort === teilnehmer.Ort) {
                console.log(`- ${teilnehmer.Name}: ${angebot.data()?.Ort}`);
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
    const belegteAngebote = new Set<string>();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmenSnap = await tnDoc.ref.collection('teilnahmen').get();
        teilnahmenSnap.forEach(doc => belegteAngebote.add(doc.data().AngNr));
    }
    for (const angebotDoc of angeboteSnapshot.docs) {
        if (!belegteAngebote.has(angebotDoc.id)) {
            const angebot = angebotDoc.data();
            const kurs = await db.collection('kurse').doc(angebot.KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data()?.Titel : angebot.KursNr}, Angebot ${angebotDoc.id}`);
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
    console.log('\n Kurse mit mind. 2 Teilnehmern:');
    const teilnahmeCounter: Record<string, number> = {};
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmenSnap = await tnDoc.ref.collection('teilnahmen').get();
        for (const teilnahme of teilnahmenSnap.docs) {
            const angNr = teilnahme.data().AngNr;
            teilnahmeCounter[angNr] = (teilnahmeCounter[angNr] || 0) + 1;
        }
    }
    for (const [angebotId, count] of Object.entries(teilnahmeCounter)) {
        if (count >= 2) {
            const angebot = await db.collection('angebote').doc(angebotId).get();
            const kurs = await db.collection('kurse').doc(angebot.data()?.KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data()?.Titel : angebot.data()?.KursNr}: ${count} Teilnehmer`);
        }
    }

    // j) Alle Meier
    console.log('\n👥 Alle Meier:');
    const teilnehmerMeier = await db.collection('teilnehmer')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff')
        .get();
    teilnehmerMeier.forEach(doc => console.log(`- Teilnehmer: ${doc.data().Name}`));
    const kursleiterMeier = await db.collection('kursleiter')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff')
        .get();
    kursleiterMeier.forEach(doc => console.log(`- Kursleiter: ${doc.data().Name}`));

    // k) Kurstitel mit Anzahl der Angebote
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angeboteCount = (await db.collection('angebote').where('KursNr', '==', kursId).get()).size;
        console.log(`- ${kursDoc.data().Titel}: ${angeboteCount} Angebote`);
    }

    // l) Kurstitel mit mindestens 2 Voraussetzungen
    console.log('\n📚 Kurstitel mit mindestens 2 Voraussetzungen:');
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();
        if (vorausSnap.size >= 2) {
            console.log(`- ${kursDoc.data().Titel}: ${vorausSnap.size} Voraussetzungen`);
        }
    }

    // m) Durchschnittliches Gehalt der Kursleiter pro Kurs
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angebote = await db.collection('angebote').where('KursNr', '==', kursId).get();
        const gehaelter: number[] = [];
        for (const angebot of angebote.docs) {
            const leiterSnap = await angebot.ref.collection('kursleiter').get();
            for (const leiter of leiterSnap.docs) {
                const leiterDoc = await db.collection('kursleiter').doc(leiter.id).get();
                if (leiterDoc.exists) gehaelter.push(leiterDoc.data()?.Gehalt);
            }
        }
        if (gehaelter.length > 0) {
            const avg = gehaelter.reduce((a, b) => a + b, 0) / gehaelter.length;
            console.log(`- ${kursDoc.data().Titel}: ${avg.toFixed(2)} €`);
        }
    }

    // n) Kursleiter-Paare, die denselben Kurs halten
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');
    const kursLeiterMap: Record<string, Set<string>> = {};
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebot = angebotDoc.data();
        const kursNr = angebot.KursNr;
        const leiterSnap = await angebotDoc.ref.collection('kursleiter').get();
        if (!kursLeiterMap[kursNr]) kursLeiterMap[kursNr] = new Set();
        leiterSnap.forEach(d => kursLeiterMap[kursNr].add(d.id));
    }
    for (const [kursNr, leiterSet] of Object.entries(kursLeiterMap)) {
        const leiter = Array.from(leiterSet);
        if (leiter.length < 2) continue;
        const kurs = await db.collection('kurse').doc(kursNr).get();
        for (let i = 0; i < leiter.length - 1; i++) {
            for (let j = i + 1; j < leiter.length; j++) {
                const l1 = await db.collection('kursleiter').doc(leiter[i]).get();
                const l2 = await db.collection('kursleiter').doc(leiter[j]).get();
                if (l1.exists && l2.exists) {
                    console.log(`- ${kurs.data()?.Titel}: ${l1.data()?.Name} & ${l2.data()?.Name}`);
                }
            }
        }
    }

    console.log('\n✅ Fertig.');
}

aufgabe4().catch(console.error);
