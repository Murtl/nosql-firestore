import {Firestore} from '@google-cloud/firestore';
import {Angebot, Kurs, Kursleiter, Teilnehmer, Teilnahme, createConverter} from '../data/types';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe4() {
    console.log('📖 Aufgabe 4: Read Queries\n');

    /**
     * Man könnte jede Collection bzw. ihre Sub-Collections hier vorladen und den Abfragen nutzen.
     * Wir machen das aber nicht so, weil wir die Teilaufgaben jeweils einzeln betrachten wollen, um
     * die einzelnen nötigen Schritte jeweils zu verdeutlichen
    */

    // a) alle Orte, an denen Kurse durchgeführt werden
    /**
     * @old-relational-table Angebot
     * @collections angebote
     *
     * @logic
     * 🔸 In SQL:
     *     SELECT DISTINCT Ort FROM Angebot;
     *  🔹 In Firestore:
     *     Alle Angebote abfragen und die Orte in einem Set speichern (um Duplikate zu vermeiden).
     *
     * @difference-to-sql
     *  Firestore unterstützt keine DISTINCT-Abfrage, daher muss manuell ein Set verwendet werden,
     *  um Duplikate zu entfernen.
     */
    const angeboteSnapshot = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const orte = new Set(angeboteSnapshot.docs.map(a => a.data().Ort));
    console.log('📍 Orte:', [...orte]);

    // b) die Teilnehmer aus Augsburg
    /**
     * @old-relational-table Teilnehmer
     * @collections teilnehmer
     *
     * @logic
     *  🔸 In SQL:
     *      SELECT * FROM Teilnehmer WHERE Ort = 'Augsburg';
     *  🔹 In Firestore:
     *    Alle Teilnehmer mit Ort = 'Augsburg' abfragen.
     *
     * @difference-to-sql
     *  Firestore unterstützt WHERE-Filter, daher ist die Abfrage sehr ähnlich.
     */
    const teilnehmerAusAugsburg = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>())
        .where('Ort', '==', 'Augsburg').get();
    console.log('\n👥 Teilnehmer aus Augsburg:');
    teilnehmerAusAugsburg.forEach(t => console.log(`- ${t.data().Name}`));

    // c) die Kursleiter mit einem Gehalt zwischen 3000 € und 4000 €, sortiert nach Namen
    /**
     * @old-relational-table Kursleiter
     * @collections kursleiter
     *
     * @logic
     *  🔸 In SQL:
     *      SELECT * FROM Kursleiter WHERE Gehalt BETWEEN 3000 AND 4000 ORDER BY Name;
     *  🔹 In Firestore:
     *      Alle Kursleiter mit Gehalt >= 3000 und <= 4000 abfragen und nach Name sortieren.
     *
     * @difference-to-sql
     *  Sehr identisch, da Firestore auch WHERE und ORDER BY unterstützt.
     */
    const kursleiterSnapshot = await db.collection('kursleiter').withConverter(createConverter<Kursleiter>())
        .where('Gehalt', '>=', 3000).where('Gehalt', '<=', 4000).orderBy('Name').get();
    console.log('\n👩‍🏫 Kursleiter (Gehalt 3000€-4000€):');
    kursleiterSnapshot.forEach(k => console.log(`- ${k.data().Name}: ${k.data().Gehalt}€`));

    // d) die Kurstitel mit Datum und Ort, an dem sie stattfinden
    /**
     * @old-relational-table Angebot, Kurs
     * @collections angebote
     *
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, a.Datum, a.Ort
     *   FROM Angebot a JOIN Kurs k ON a.KursNr = k.KursNr;
     *
     * 🔹 In Firestore:
     *   - Alle Dokumente aus der Collection 'angebote' lesen
     *   - Für jedes Angebot die gefragten Informationen ausgeben
     *   - Datum (Timestamp) wird per .toDate().toLocaleDateString() in lesbares Format umgewandelt
     *   - Ausgabe: angebot.KursTitel, angebot.Datum, angebot.Ort
     *
     * @difference-to-sql
     *   In SQL erfolgt die Verknüpfung über JOIN automatisch in einer Abfrage.
     *   In Firestore haben wir durch die Redundanz in der Collection 'angebote' die KursTitel
     *   bereits im Angebot gespeichert (Vorteil unserer Datenstruktur).
     */
    const angeboteSnapshot1 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    for (const angebotDoc of angeboteSnapshot1.docs) {
        console.log(`- ${angebotDoc.data()?.KursTitel}: ${angebotDoc.data().Datum.toDate().toLocaleDateString()} in ${angebotDoc.data().Ort}`);
    }

    // e) Anfrage d) mit zusätzlicher Ausgabe der Kursleiter
    /**
     * @old-relational-table Angebot, Kurs, Fuehrt_durch, Kursleiter
     * @collections angebote, angebote/{AngNr_KursNr}/kursleiter (Sub-Collection aus angebote)
     *
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
     *   - Kursleiter liegen als Sub-Collection unter dem Angebot: 'angebote/{AngNr_KursNr}/kursleiter'
     *
     * @difference-to-sql
     *   In SQL wird alles in einem JOIN abgebildet.
     *   In Firestore muss die zugehörige Sub-Collection 'kursleiter' für jedes Angebot separat geladen werden.
     *   Außerdem haben wir durch die Redundanz in der Collection 'angebote' die KursTitel
     *   bereits im Angebot gespeichert (Vorteil unserer Datenstruktur).
     */
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    const angeboteSnapshot2 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    for (const angebotDoc of angeboteSnapshot2.docs) {
        const angebotData = angebotDoc.data();
        const kursleiterSnap = await angebotDoc.ref.collection('kursleiter').withConverter(createConverter<Kursleiter>()).get();
        let kursleiterName = kursleiterSnap.docs.map(doc => doc.data().Name).join(', ');
        if (kursleiterName.length === 0) {
            console.warn(`⚠️ Kursleiter für Angebot ${angebotDoc.id} nicht gefunden.`);
            kursleiterName = 'Unbekannt';
            continue;
        }
        console.log(`- ${angebotData?.KursTitel}: ${angebotData?.Datum.toDate().toLocaleDateString()}, in ${angebotData?.Ort}, Kursleiter: ${kursleiterName}`);
    }

    // f) alle Kurstitel mit den Titeln der Kurse, die dafür Voraussetzung sind. Hat ein Kurs keine Voraussetzungen,
    // so soll dieses Feld NULL sein. Achten Sie auf vernünftige Spaltenüberschriften. Die Ausgabe soll nach Kursen
    // sortiert erfolgen
    /**
     * @old-relational-table Kurs, Vorauss
     * @collections kurse, kurse/{KursNr}/voraussetzungen (Sub-Collection aus Kurse)
     *
     * @logic
     * 🔸 In SQL:
     *   SELECT k.Titel, v.VorNr
     *   FROM Kurs k
     *   LEFT JOIN Vorauss v ON k.KursNr = v.KursNr;

     * 🔹 In Firestore:
     *   - Alle Dokumente aus 'kurse' laden
     *   - Für jeden Kurs: Sub-Collection 'voraussetzungen' abrufen
     *   - Für jede Voraussetzung (v.id): den Kurs über 'kurse[v.id]' nachladen
     *   - Ausgabe: Titel des Kurses + Titel der Voraussetzungen

     * @difference-to-sql
     *   In SQL ist das ein einfacher LEFT JOIN.
     *   In Firestore:
     *     - Jede Voraussetzung für einen spezifischen Kurstitel muss separat gelesen werden (mehrere Reads)
     *     - Sub-Collections sind an Kurs gebunden – globale Analyse erschwert
     *     - NULL-Werte müssen manuell ersetzt werden
     */
    console.log('\n📚 Kurstitel mit Voraussetzungen:');
    console.log('Kurs\t\t\t Voraussetzungen');

    const kurseSnapshot = await db.collection('kurse')
        .withConverter(createConverter<Kurs>())
        .get();

    // Array für Ergebnisse
    const results: { kursTitel: string; voraussetzungen: string[] | null }[] = [];

    for (const kursDoc of kurseSnapshot.docs) {
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
                    const vSnap = await db.collection('kurse').doc(v.id).withConverter(createConverter<Kurs>()).get();
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

    // g) alle Teilnehmer, die einen Kurs am eigenen Wohnort gebucht haben
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
     *   - Für jeden Teilnehmer → Sub-Collection teilnahmen lesen
     *   - Für jede Teilnahme → passendes Angebot per ID laden
     *   - Wohnort vom Teilnehmer mit Ort des Angebots vergleichen
     *   - Bei Übereinstimmung ausgeben
     *
     * @difference-to-sql
     *   In SQL reicht ein einziger JOIN mit WHERE-Bedingung.
     *   In Firestore sind mehrere Reads notwendig: Teilnehmer → Teilnahmen → Angebot.
     */
    console.log('\n👥 Teilnehmer am eigenen Wohnort:');
    const teilnehmerSnapshot = await db.collection('teilnehmer').withConverter(createConverter<Teilnehmer>()).get();
    for (const tnDoc of teilnehmerSnapshot.docs) {
        const teilnehmer = tnDoc.data();
        const teilnahmenSnap = await tnDoc.ref.collection('teilnahmen').withConverter(createConverter<Teilnahme>()).get();
        for (const teilnahme of teilnahmenSnap.docs) {
            const { AngNr } = teilnahme.data();
            const angebot = await db.collection('angebote').doc(AngNr).withConverter(createConverter<Angebot>()).get();
            if (angebot.exists && angebot.data()?.Ort === teilnehmer.Ort) {
                console.log(`- ${teilnehmer.Name}: ${angebot.data()?.Ort}`);
            }
        }
    }

    // h) alle Kursangebote (Kurstitel und Angebotsnummer), zu denen es noch keine Teilnehmer gibt
    /**
     * @old-relational-table Angebot, Nimmt_teil, Teilnehmer
     * @collections angebote, teilnehmer/{TnNr}/teilnahmen (Sub-Collection aus teilnehmer)
     *
     * @logic
     * 🔸 In SQL:
     *   SELECT * FROM Angebot a
     *   LEFT JOIN Nimmt_teil nt ON a.AngNr = nt.AngNr
     *   WHERE nt.TnNr IS NULL;
     *
     * 🔹 In Firestore:
     *   - Alle `teilnahmen` über Collection Group (`collectionGroup('teilnahmen')`) abrufen
     *   - Belegte `AngNr` in Set speichern
     *   - Alle `angebote` durchlaufen
     *   - Wenn `angebot.id` nicht im Set: Ausgabe
     *   - Titel über `kurse` via KursNr nachladen
     *
     * @difference-to-sql
     *   Firestore kennt kein LEFT JOIN → manuelle Filterlogik
     *   `collectionGroup` erlaubt globale Abfrage über alle Teilnahmen
     *   (-> `collectionGroup` ist eine Möglichkeit alle Collections mit dem gleichen Namen zu durchsuchen)
     */
    console.log('\n📚 Kursangebote ohne Teilnehmer:');
    const angeboteSnapshot3 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const belegteAngebote = new Set<string>();

    // 1. Alle belegten Angebote über Collection Group Query holen
    const teilnahmenSnapshot = await db.collectionGroup('teilnahmen').withConverter(createConverter<Teilnahme>()).get();
    teilnahmenSnapshot.forEach(doc => belegteAngebote.add(doc.data().AngNr));

    // 2. Alle Angebote durchgehen, nur die ohne Teilnehmer ausgeben
    for (const angebotDoc of angeboteSnapshot3.docs) {
        if (!belegteAngebote.has(angebotDoc.id)) {
            const angebot = angebotDoc.data();
            const kurs = await db.collection('kurse').doc(angebot.KursNr).withConverter(createConverter<Kurs>()).get();
            const titel = kurs.exists ? kurs.data()?.Titel : angebot.KursNr;
            console.log(`- ${titel}, Angebot ${angebotDoc.id}`);
        }
    }

    // i) alle Kurse (egal welches Angebot) mit mindestens 2 Teilnehmern
    /**
     * @old-relational-table Nimmt_teil, Angebot, Kurs
     * @collections teilnehmer/{TnNr}/teilnahmen (Sub-Collection aus teilnehmer), angebote, kurse
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
     *  - Alle `angebote` laden: Map<AngNr → KursNr>
     *  - Alle `teilnahmen` über Collection Group Query (`collectionGroup('teilnahmen')`)
     *  - Zählung: KursNr → Teilnehmeranzahl
     *  - Alle `kurse` laden: KursNr → Titel
     *  - Ausgabe: Kurse mit mindestens 2 Teilnehmern
     *
     * @difference-to-sql
     *   Kein echtes GROUP BY → Aggregation erfolgt clientseitig
     *   `collectionGroup` ermöglicht effiziente Abfrage aller Teilnahmen
     *   Aggregation mit einfachem Zählerobjekt auf KursNr-Ebene
     */
    console.log('\n📚 Kurse mit mindestens 2 Teilnehmern (alle Angebote zusammengefasst):');

    // 1. Alle Angebote laden: Map<AngNr, KursNr>
    const angeboteSnapshot4 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    const angebotZuKurs = new Map<string, string>();
    for (const doc of angeboteSnapshot4.docs) {
        const { KursNr } = doc.data();
        angebotZuKurs.set(doc.id, KursNr);
    }

    // 2. Alle Teilnahmen über Collection Group Query laden
    const teilnahmenSnapshot1 = await db.collectionGroup('teilnahmen').withConverter(createConverter<Teilnahme>()).get();
    const kursTeilnehmerCounter: Record<string, number> = {};

    for (const teilnahme of teilnahmenSnapshot1.docs) {
        const { AngNr } = teilnahme.data();
        const kursNr = angebotZuKurs.get(AngNr);
        if (kursNr) kursTeilnehmerCounter[kursNr] = (kursTeilnehmerCounter[kursNr] || 0) + 1;
    }

    // 3. Alle Kurse laden: Map<KursNr, Titel>
    const kurseSnapshot1 = await db.collection('kurse').withConverter(createConverter<Kurs>()).get();
    const kursTitelMap = new Map<string, string>();
    for (const doc of kurseSnapshot1.docs) {
        kursTitelMap.set(doc.id, doc.data().Titel);
    }

    // 4. Ausgabe: Nur Kurse mit mindestens 2 Teilnehmern
    for (const [kursNr, anzahl] of Object.entries(kursTeilnehmerCounter)) {
        if (anzahl >= 2) {
            const titel = kursTitelMap.get(kursNr) ?? kursNr;
            console.log(`- ${titel}: ${anzahl} Teilnehmer`);
        }
    }

    // j) alle Meier, sowohl Teilnehmer als auch Kursleiter
    /**
     * @old-relational-table Teilnehmer, Kursleiter
     * @collections teilnehmer, Kursleiter
     *
     * @logic
     *   🔸 In SQL:
     *       SELECT * FROM Teilnehmer WHERE name LIKE '%Meier%' UNION SELECT * FROM Kursleiter
     *       WHERE name LIKE '%Meier%';
     *   🔹 In Firestore:
     *       Zwei separate Abfragen:
     *          - teilnehmer: Name >= 'Meier' und Name <= 'Meier\uf8ff'
     *          - kursleiter: Name >= 'Meier' und Name <= 'Meier\uf8ff'
     *
     * @difference-to-sql
     *   In SQL können Daten aus mehreren Tabellen mit UNION kombiniert werden. In Firestore kann jede
     *   Read-Operation nur auf eine Collection angewendet werden, daher werden zwei separate Abfragen durchgeführt.
     */
    console.log('\n👥 Alle Meier:');
    const teilnehmerMeier = await db.collection('teilnehmer')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff')
        .withConverter(createConverter<Teilnehmer>())
        .get();
    teilnehmerMeier.forEach(doc => console.log(`- Teilnehmer: ${doc.data().Name}`));
    const kursleiterMeier = await db.collection('kursleiter')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff')
        .withConverter(createConverter<Kursleiter>())
        .get();
    kursleiterMeier.forEach(doc => console.log(`- Kursleiter: ${doc.data().Name}`));

    // k) die Kurstitel mit der jeweiligen Anzahl der Angebote
    /**
     * @old-relational-table Kurs, Angebot
     * @collections angebote, kurse
     *
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel, COUNT(a.id) AS angebote_count FROM Kurs k LEFT JOIN Angebot a ON k.KursNr = a.KursNr
     *       GROUP BY k.KursNr, k.Titel ORDER BY k.Titel;
     *   🔹 In Firestore:
     *      - Alle `kurse` laden → Map<KursNr → Titel> + Zähler auf 0
     *      - Alle `angebote` laden → pro `KursNr` zählen
     *      - Ausgabe sortiert nach Titel
     *
     * @difference-to-sql
     *   Firestore unterstützt keine JOINs → Titel manuell aus `kurse` laden
     *   Auch kein GROUP BY oder aggregiertes COUNT pro Gruppe
     *   `count()` von Firestore kann **nicht gruppieren** (nur Gesamtanzahl oder gefilterte Query zählen)
     *   Daher erfolgt Gruppierung und Zählung manuell per JavaScript (Map + Counter)
     */
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');

    // Kurse laden
    let kursTitelMap1 = new Map<string, string>();
    const angeboteCounter = new Map<string, number>();

    const kurseSnapshot2 = await db.collection('kurse').withConverter(createConverter<Kurs>()).get();
    kurseSnapshot2.forEach(doc => {
        const kursNr = doc.id;
        const titel = doc.data().Titel;
        kursTitelMap1.set(kursNr, titel);
        angeboteCounter.set(kursNr, 0); // vorinitialisieren mit 0
    });

    // Angebote zählen
    const angeboteSnapshot5 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    angeboteSnapshot5.forEach(doc => {
        const { KursNr } = doc.data() as Angebot;
        if (angeboteCounter.has(KursNr)) {
            angeboteCounter.set(KursNr, (angeboteCounter.get(KursNr) ?? 0) + 1);
        } else {
            // falls es ein Angebot für einen Kurs gibt, der nicht mehr in 'kurse' existiert
            angeboteCounter.set(KursNr, 1);
            kursTitelMap1.set(KursNr, KursNr);
        }
    });

    // Ausgabe
    [...angeboteCounter.entries()]
        .sort(([a], [b]) => (kursTitelMap1.get(a) ?? a).localeCompare(kursTitelMap1.get(b) ?? b))
        .forEach(([kursNr, count]) => {
            const titel = kursTitelMap1.get(kursNr) ?? kursNr;
            console.log(`- ${titel}: ${count} Angebote`);
        });

    // l) die Kurstitel mit der Anzahl der Voraussetzungen, die mindestens 2 Voraussetzungen haben. Die Ausgabe
    // soll so erfolgen, dass die Kurse mit den meisten Voraussetzungen zuerst kommen
    /**
     * @old-relational-table Vorauss, Kurs
     * @collections kurse, kurse/{KursNr}/voraussetzungen (Sub-Collection aus Kurse)
     *
     * @logic
     *   🔸 In SQL:
     *       SELECT k.titel FROM Kurs k JOIN Vorauss v ON k.KursNr = v.KursNr GROUP BY k.KursNr,
     *       k.Titel HAVING COUNT(v.VorNr) >= 2;
     *   🔹 In Firestore:
     *      - Alle `kurse` laden
     *      - Für jeden Kurs: Sub-Collection `voraussetzungen` laden und zählen
     *      - Wenn Anzahl ≥ 2 → Kurs aufnehmen
     *
     * @difference-to-sql
     *    Firestore kennt kein JOIN oder GROUP BY → manuelle Verarbeitung nötig
     *    `count()` auf Sub-Collections wäre nur in Server SDKs (z. B. Admin SDK) möglich,
     *     spart aber kaum Aufwand, da die Sub-Collection ohnehin geladen werden muss
     */
    console.log('\n📚Kurse mit mindestens 2 Voraussetzungen (absteigend sortiert):');
    const kurseMitVoraussetzungen: { titel: string; anzahl: number }[] = [];

    const kurseSnapshot3 = await db.collection('kurse').withConverter(createConverter<Kurs>()).get();
    for (const kursDoc of kurseSnapshot3.docs) {
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
    for (const kurs of kurseMitVoraussetzungen) {
        console.log(`- ${kurs.titel}: ${kurs.anzahl} Voraussetzungen`);
    }

    // m) für alle Kurse (Titel ausgeben) das durchschnittliche Gehalt der Kursleiter, die ein Angebot dieses
    // Kurses durchführen (nach diesem Durchschnitt aufsteigend sortiert)
    /**
     * @old-relational-table Kurs, Fuehrt_Durch, Kursleiter
     * @collections angebote, angebote/{PersNr}/kursleiter (Sub-Collection aus angebote)
     *
     * @logic
     *   🔸 In SQL: SELECT k.Titel, AVG(kl.Gehalt) FROM Kurs k JOIN Fuehrt_Durch fd ON k.KursNr = fd.KursNr
     *   JOIN Kursleiter kl ON fd.PersNr = kl.PersNr GROUP BY k.KursNr, k.Titel;
     *   🔹 In Firestore:
     *     - Alle `angebote` laden
     *      - Je Angebot: Sub-Collection `kursleiter` abrufen
     *      - Für jede KursNr: Gehälter sammeln
     *      - Durchschnitt berechnen und sortieren
     *
     * @difference-to-sql
     *    Kein GROUP BY oder AVG in Firestore
     *    `average()` von Firestore ist aktuell nur auf flachen Collections ohne Gruppierung möglich
     *    Aggregation daher manuell (Map<KursNr → Gehaltsliste> + clientseitiges avg)
     */
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs (aufsteigend):');

    const kursGehaelterMap = new Map<string, { titel: string; gehaelter: number[] }>();
    const angeboteSnapshot6 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();

    for (const angebot of angeboteSnapshot6.docs) {
        const { KursNr, KursTitel } = angebot.data();

        // Sub-Collection 'kursleiter' laden
        const kursleiterSnap = await angebot.ref.collection('kursleiter').withConverter(createConverter<Kursleiter>()).get();

        if (!kursGehaelterMap.has(KursNr)) {
            kursGehaelterMap.set(KursNr, { titel: KursTitel ?? KursNr, gehaelter: [] });
        }

        for (const leiter of kursleiterSnap.docs) {
            kursGehaelterMap.get(KursNr)?.gehaelter.push(leiter.data().Gehalt);
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


    // n) alle Paare von Kursleitern, die denselben Kurs halten, und den entsprechenden Kurstiteln.
    // Geben Sie jedes Paar nur einmal aus
    /**
     * @old-relational-table Fuehrt_Durch, Kursleiter, Kurs
     * @collections angebote, angebote/{PersNr}/kursleiter (Sub-Collection aus angebote)
     *
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
     *
     * @difference-to-sql
     *   Kein Self-Join möglich – Paare müssen im Client konstruiert werden.
     *   Dank Redundanz des Kurstitels in 'angebote' konnten die zusätzlichen Abfragen verringert werden.
     */
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');

    // Kursleiter je KursNr sammeln
    const kursleiterProKurs: Record<string, Map<number, string>> = {}; // KursNr → Map<PersNr, Name>
    const kursTitelMap2 = new Map<string, string>();

    const angeboteSnapshot7 = await db.collection('angebote').withConverter(createConverter<Angebot>()).get();
    for (const angebot of angeboteSnapshot7.docs) {
        const angebotData = angebot.data();
        const kursNr = angebotData.KursNr;
        const titel = angebotData.KursTitel ?? kursNr;
        kursTitelMap2.set(kursNr, titel);

        // Sub-Collection "kursleiter" lesen
        const leiterSnap = await angebot.ref.collection('kursleiter').withConverter(createConverter<Kursleiter>()).get();

        for (const doc of leiterSnap.docs) {
            const { Name } = doc.data();

            if (!kursleiterProKurs[kursNr]) {
                kursleiterProKurs[kursNr] = new Map();
            }

            kursleiterProKurs[kursNr].set(Number(doc.id), Name); // Duplikate werden durch Map automatisch vermieden
        }
    }

    // Paare bilden
    for (const [kursNr, leiterMap] of Object.entries(kursleiterProKurs)) {
        const titel = kursTitelMap2.get(kursNr) ?? kursNr;
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
