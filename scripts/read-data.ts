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

    // d) Kurstitel mit Datum und Ort
    /**
     * @old-relational-table Angebot, Kurs
     * @collections angebote
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort
     *   FROM Angebot a JOIN Kurs k ON a.KursNr = k.KursNr;
     *
     * 🔹 In Firestore:
     *   - Alle Dokumente aus der Collection 'angebote' lesen
     *   - Für jedes Angebot die gefragten Infos ausgeben
     *   - Datum (Timestamp) wird per .toDate().toLocaleDateString() in lesbares Format umgewandelt
     *   - Ausgabe: angebot.KursTitel, angebot.Datum, angebot.Ort
     *
     * @difference-to-sql
     *   In SQL erfolgt die Verknüpfung über JOIN automatisch in einer Abfrage.
     *   In Firestore haben wir durch die Redundanz in der Collection 'angebote' die KursTitel
     *   bereits im Angebot gespeichert (Vorteil unserer Datenstruktur).
     */
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    for (const angebotDoc of angeboteSnapshot.docs) {
        console.log(`- ${angebotDoc.data()?.KursTitel}: ${angebotDoc.data().Datum.toDate().toLocaleDateString()} in ${angebotDoc.data().Ort}`);
    }

    // e) Kurstitel mit Datum, Ort und Kursleiter
    /**
     * @old-relational-table Angebot, Kurs, Fuehrt_durch, Kursleiter
     * @collections angebote (Subcollection unter angebote: kursleiter)
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
     *   - Kursleiter liegen als Subcollection unter dem Angebot: 'angebote/{id}/kursleiter'
     *
     * @difference-to-sql
     *   In SQL wird alles in einem JOIN abgebildet.
     *   In Firestore liegt alles in der Collection 'angebote' und die Kursleiter sind ebenfalls dort redundant
     *   als Subcollection gespeichert -> macht unsere Datenstruktur möglich.
     */
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebotData = angebotDoc.data();
        const kursleiterSnap = await angebotDoc.ref.collection('kursleiter').get();
        let kursleiterName = kursleiterSnap.docs.map(doc => doc.data().Name).join(', ');
        if (kursleiterName.length === 0) {
            console.warn(`⚠️ Kursleiter für Angebot ${angebotDoc.id} nicht gefunden.`);
            kursleiterName = 'Unbekannt';
            continue;
        }
        console.log(`- ${angebotData?.KursTitel}: ${angebotData?.Datum.toDate().toLocaleDateString()}, in ${angebotData?.Ort}, Kursleiter: ${kursleiterName}`);
    }

    // f) Kurstitel mit Voraussetzungen
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
    console.log('\n📚 Kurstitel mit Voraussetzungen:\n');
    console.log('Kurs\t\t\t Voraussetzungen');

    const kurseSnap = await db.collection('kurse')
        .withConverter(createConverter<Kurs>())
        .get();

    // Array für Ergebnisse
    const results: { kursTitel: string; voraussetzungen: string[] | null }[] = [];

    for (const kursDoc of kurseSnap.docs) {
        const kurs = kursDoc.data();
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();

        if (vorausSnap.empty) {
            results.push({
                kursTitel: kurs.Titel,
                voraussetzungen: null
            });
        } else {
            const vorausTitel = await Promise.all(
                vorausSnap.docs.map(async v => {
                    const vSnap = await db.collection('kurse').doc(v.id).get();
                    return vSnap.exists ? vSnap.data()?.Titel ?? 'NULL' : 'NULL';
                })
            );

            results.push({
                kursTitel: kurs.Titel,
                voraussetzungen: vorausTitel
            });
        }
    }

    // Sortieren nach Kurs-Titel
    results.sort((a, b) => a.kursTitel.localeCompare(b.kursTitel));

    // Ausgabe
    for (const eintrag of results) {
        const vorausText = eintrag.voraussetzungen ? eintrag.voraussetzungen.join(', ') : 'NULL';
        console.log(`${eintrag.kursTitel.padEnd(25)}${vorausText}`);
    }

    // g) Teilnehmer, die einen Kurs am eigenen Wohnort gebucht haben
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

    // h) Kursangebote ohne Teilnehmer
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

    // i) Kurse mit mindestens 2 Teilnehmern
    /**
     * @old-relational-table Nimmt_teil, Angebot, Kurs
     * @collections teilnehmer, teilnehmer/{id}/teilnahmen, angebote, kurse
     *
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, COUNT(*) AS Anzahl
     *   FROM Nimmt_teil nt
     *   JOIN Angebot a ON nt.AngNr = a.AngNr
     *   JOIN Kurs k ON a.KursNr = k.KursNr
     *   GROUP BY a.KursNr
     *   HAVING COUNT(*) >= 2;
     *
     * 🔹 In Firestore:
     *   - Alle `angebote` laden → Map: Angebot-ID → KursNr
     *   - Alle Teilnehmer durchlaufen
     *   - Für jede Teilnahme in `teilnehmer/{id}/teilnahmen` → `AngNr` zählen
     *   - Aggregation in Counter-Map: KursNr → Anzahl Teilnehmer
     *   - Alle `kurse` laden → KursNr → Titel
     *   - Ausgabe: Kurse mit mindestens 2 Teilnehmern
     *
     * @difference-to-sql
     *   - Kein `GROUP BY`/`HAVING` → Aggregation muss manuell erfolgen
     *   - Kein automatischer Join: Jede Verknüpfung erfordert separate Lookups
     *   - Kein SQL-ähnlicher Ausdruck → erfordert eigene Logik für Zählung, Filterung, Ausgabe
     */

    console.log('\n📚 Kurse mit mindestens 2 Teilnehmern (alle Angebote zusammengefasst):');
    const angebotesSnap = await db.collection('angebote').get();
    const angeboteMap = new Map<string, string>();
    for (const doc of angebotesSnap.docs) {
        angeboteMap.set(doc.id, doc.data().KursNr);
    }

    // Teilnehmer durchgehen und pro KursNr zählen
    const kursCounter: Record<string, number> = {};
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmenSnap = await tnDoc.ref.collection('teilnahmen').get();
        for (const t of teilnahmenSnap.docs) {
            const kursNr = angeboteMap.get(t.data().AngNr);
            if (kursNr) kursCounter[kursNr] = (kursCounter[kursNr] || 0) + 1;
        }
    }

    // Kurse vorladen: KursNr → Titel
    const kurseMap = new Map<string, string>();
    for (const doc of kurseSnap.docs) kurseMap.set(doc.id, doc.data().Titel);

    // Ausgabe nach KursNr
    for (const [kursNr, count] of Object.entries(kursCounter)) {
        if (count >= 2) {
            const titel = kurseMap.get(kursNr) || kursNr;
            console.log(`- ${titel}: ${count} Teilnehmer`);
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
        .where('Name', '<=', 'Meier\uf8ff')
        .get();
    teilnehmerMeier.forEach(doc => console.log(`- Teilnehmer: ${doc.data().Name}`));
    const kursleiterMeier = await db.collection('kursleiter')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff')
        .get();
    kursleiterMeier.forEach(doc => console.log(`- Kursleiter: ${doc.data().Name}`));

    // k) Kurstitel mit Anzahl der Angebote
    /**
     * @old-relational-table Kurs, Angebot
     * @collections angebote
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel, COUNT(a.id) AS angebote_count FROM Kurs k LEFT JOIN Angebot a ON k.KursNr = a.KursNr
     *       GROUP BY k.KursNr, k.Titel ORDER BY k.Titel;
     *   🔹 In Firestore:
     *       Alle `angebote`-Dokumente laden.
     *       Für jedes Dokument den `KursTitel` erfassen und die Anzahl der Vorkommen zählen.
     *       Anschließend sortiert nach Titel ausgeben.
     * @difference-to-sql
     *   Firestore untersützt weder JOINS noch Aggregationen wie COUNT. Daher muss manuell
     *   iteriert und gezählt werden.
     */
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');

    // Kurse laden
    let kursTitelMap = new Map<string, string>();
    const angeboteCounter = new Map<string, number>();

    kurseSnap.forEach(doc => {
        const kursNr = doc.id;
        const titel = doc.data().Titel;
        kursTitelMap.set(kursNr, titel);
        angeboteCounter.set(kursNr, 0); // vorinitialisieren mit 0
    });

    // Angebote zählen
    const angeboteSnap = await db.collection('angebote').get();
    angeboteSnap.forEach(doc => {
        const { KursNr } = doc.data() as Angebot;
        if (angeboteCounter.has(KursNr)) {
            angeboteCounter.set(KursNr, (angeboteCounter.get(KursNr) ?? 0) + 1);
        } else {
            // falls es ein Angebot für einen Kurs gibt, der nicht mehr in 'kurse' existiert
            angeboteCounter.set(KursNr, 1);
            kursTitelMap.set(KursNr, KursNr);
        }
    });

    // Ausgabe
    [...angeboteCounter.entries()]
        .sort(([a], [b]) => (kursTitelMap.get(a) ?? a).localeCompare(kursTitelMap.get(b) ?? b))
        .forEach(([kursNr, count]) => {
            const titel = kursTitelMap.get(kursNr) ?? kursNr;
            console.log(`- ${titel}: ${count} Angebote`);
        });

    // l) Kurstitel mit mindestens 2 Voraussetzungen
    /**
     * @old-relational-table Vorauss, Kurs
     * @collections kurse, kurse/{KursNr}/voraussetzungen (Subcollection aus Kurse)
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
    const kurseMitVoraussetzungen: { titel: string; anzahl: number }[] = [];

    for (const kursDoc of kurseSnap.docs) {
        const titel = kursDoc.data().Titel;
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();

        if (vorausSnap.size >= 2) {
            kurseMitVoraussetzungen.push({
                titel,
                anzahl: vorausSnap.size
            });
        }
    }

    // Nach Anzahl absteigend sortieren
    kurseMitVoraussetzungen.sort((a, b) => b.anzahl - a.anzahl);

    // Ausgabe
    console.log('\n📚Kurse mit mindestens 2 Voraussetzungen (absteigend sortiert):\n');
    for (const kurs of kurseMitVoraussetzungen) {
        console.log(`- ${kurs.titel}: ${kurs.anzahl} Voraussetzungen`);
    }

    // m) Durchschnittliches Gehalt der Kursleiter pro Kurs
    /**
     * @old-relational-table Kurs, Fuehrt_Durch, Kursleiter
     * @collections angebote, angebote/{id}/kursleiter (Subcollection aus Angebote)
     * @logic
     *   🔸 In SQL: SELECT k.Titel, AVG(kl.Gehalt) FROM Kurs k JOIN Fuehrt_Durch fd ON k.KursNr = fd.KursNr
     *   JOIN Kursleiter kl ON fd.PersNr = kl.PersNr GROUP BY k.KursNr, k.Titel;
     *   🔹 In Firestore:
     *       Alle `angebote`-Dokumente laden, Kursleiter und deren Gehälter pro KursNr sammeln.
     *       Kurstitel ist bereits als Subcollection direkt im Angebot eingebettet.
     *       Danach Durchschnitt berechnen und sortiert ausgeben.
     * @difference-to-sql
     *   Kein JOIN oder AVG vorhanden. Um die daraus entstehenden mehrfachen Abfragen zu vermeiden,
     *   wurde mit Redundanz in der Collection `angebote` gearbeitet.
     */
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs (aufsteigend):');

    const kursGehaelterMap = new Map<string, { titel: string; gehaelter: number[] }>();

    for (const angebot of angeboteSnap.docs) {
        const { KursNr, KursTitel } = angebot.data() as Angebot;

        // Subcollection 'kursleiter' laden
        const kursleiterSnap = await angebot.ref.collection('kursleiter').get();
        const kursleiterList = kursleiterSnap.docs.map(doc => doc.data() as { PersNr: number, Gehalt: number });

        if (!kursGehaelterMap.has(KursNr)) {
            kursGehaelterMap.set(KursNr, { titel: KursTitel ?? KursNr, gehaelter: [] });
        }

        for (const leiter of kursleiterList) {
            kursGehaelterMap.get(KursNr)?.gehaelter.push(leiter.Gehalt);
        }
    }

    // Ergebnisse berechnen
    const result: { titel: string; avg: number }[] = [];

    for (const { titel, gehaelter } of kursGehaelterMap.values()) {
        if (gehaelter.length === 0) continue;
        const avg = gehaelter.reduce((a, b) => a + b, 0) / gehaelter.length;
        result.push({ titel, avg });
    }

    // Aufsteigend sortieren
    result.sort((a, b) => a.avg - b.avg);

    // Ausgabe
    for (const { titel, avg } of result) {
        console.log(`- ${titel}: ${avg.toFixed(2)} €`);
    }


    // n) Kursleiter-Paare, die denselben Kurs halten
    /**
     * @old-relational-table Fuehrt_Durch, Kursleiter, Kurs
     * @collections angebote, angebote/{id}/kursleiter (Subcollection aus Angebote)
     * @logic
     *   🔸 In SQL:
     *       SELECT kl1.Name, kl2.Name, k.Titel
     *       FROM Fuehrt_Durch fd1
     *       JOIN Fuehrt_Durch fd2 ON fd1.KursNr = fd2.KursNr AND fd1.PersNr < fd2.PersNr
     *       JOIN Kursleiter kl1 ON fd1.PersNr = kl1.PersNr
     *       JOIN Kursleiter kl2 ON fd2.PersNr = kl2.PersNr
     *       JOIN Kurs k ON fd1.KursNr = k.KursNr;
     *   🔹 In Firestore:
     *       Alle `angebote`-Dokumente laden.
     *       Pro KursNr alle darin vorkommenden Kursleiter (über mehrere Angebote hinweg) sammeln.
     *       Sobald mindestens zwei Kursleiter für denselben Kurs vorhanden sind, alle eindeutigen Paare bilden
     *       und mit dem redundanten `KursTitel` direkt ausgeben.
     * @difference-to-sql
     *   Kein Self-Join möglich – Paare müssen im Client konstruiert werden.
     *   Dank Redundanz in 'angebote' sind keine Subcollection- oder Zusatzabfragen auf `kursleiter` oder `kurse` nötig.
     */
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');

    // Kursleiter je KursNr sammeln
    const kursleiterProKurs: Record<string, Map<number, string>> = {}; // KursNr → Map<PersNr, Name>
    kursTitelMap = new Map<string, string>();

    for (const angebot of angeboteSnap.docs) {
        const angebotData = angebot.data();
        const kursNr = angebotData.KursNr;
        const titel = angebotData.KursTitel ?? kursNr;
        kursTitelMap.set(kursNr, titel);

        // Subcollection "kursleiter" lesen
        const leiterSnap = await angebot.ref.collection('kursleiter').get();

        for (const doc of leiterSnap.docs) {
            const { Name } = doc.data() as Kursleiter;

            if (!kursleiterProKurs[kursNr]) {
                kursleiterProKurs[kursNr] = new Map();
            }

            kursleiterProKurs[kursNr].set(Number(doc.id), Name); // Duplikate werden durch Map automatisch vermieden
        }
    }

    // Paare bilden
    for (const [kursNr, leiterMap] of Object.entries(kursleiterProKurs)) {
        const titel = kursTitelMap.get(kursNr) ?? kursNr;
        const leiter = Array.from(leiterMap.entries()); // [PersNr, Name]

        if (leiter.length < 2) continue;

        for (let i = 0; i < leiter.length - 1; i++) {
            for (let j = i + 1; j < leiter.length; j++) {
                const name1 = leiter[i][1];
                const name2 = leiter[j][1];
                console.log(`- ${titel}: ${name1} & ${name2}`);
            }
        }
    }


    console.log('\n✅ Fertig.');
}

aufgabe4().catch(console.error);
