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
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    for (const angebotDoc of angeboteSnapshot.docs) {
        const angebot = angebotDoc.data();
        const kursSnap = await db.collection('kurse').doc(angebot.KursNr).withConverter(createConverter<Kurs>()).get();
        if (kursSnap.exists) {
            console.log(`- ${kursSnap.data()?.Titel}: ${angebot.Datum.toDate().toLocaleDateString()} in ${angebot.Ort}`);
        }
    }

    // e) Kurstitel mit Datum, Ort und Kursleiter
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
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

    // f) Kurstitel mit Voraussetzungen
    console.log('\n📚 Kurstitel mit Voraussetzungen:');
    const kurseSnap = await db.collection('kurse').withConverter(createConverter<Kurs>()).get();
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();
        const vorausTitel = await Promise.all(vorausSnap.docs.map(async v => {
            const vSnap = await db.collection('kurse').doc(v.id).get();
            return vSnap.exists ? vSnap.data()?.Titel : 'NULL';
        }));
        console.log(`- ${kursDoc.data().Titel}: ${vorausTitel.join(', ')}`);
    }

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

    // i) Kurse mit mindestens 2 Teilnehmern
    console.log('\n📚 Kurse mit mind. 2 Teilnehmern:');
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
    const angeboteSnap = await db.collection('angebote').get();
    const titelCounter = new Map<string, number>();
    angeboteSnap.docs.forEach(doc => {
        const { KursNr, KursTitel } = doc.data() as Angebot;
        const titel = KursTitel ?? KursNr;
        titelCounter.set(titel, (titelCounter.get(titel) ?? 0) + 1);
    });
    [...titelCounter.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([titel, count]) =>
            console.log(`- ${titel}: ${count} Angebote`)
        );

    // l) Kurstitel mit mindestens 2 Voraussetzungen
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
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await kursDoc.ref.collection('voraussetzungen').get();
        if (vorausSnap.size >= 2) {
            console.log(`- ${kursDoc.data().Titel}: ${vorausSnap.size} Voraussetzungen`);
        }
    }

    // m) Durchschnittliches Gehalt der Kursleiter pro Kurs
    /**
     * @old-relational-table Kurs, Fuehrt_Durch, Kursleiter
     * @collections angebote
     * @logic
     *   🔸 In SQL: SELECT k.Titel, AVG(kl.Gehalt) FROM Kurs k JOIN Fuehrt_Durch fd ON k.KursNr = fd.KursNr
     *   JOIN Kursleiter kl ON fd.PersNr = kl.PersNr GROUP BY k.KursNr, k.Titel;
     *   🔹 In Firestore:
     *       Alle `angebote`-Dokumente laden, Kursleiter und deren Gehälter pro KursNr sammeln.
     *       Kurstitel ist bereits direkt im Angebot eingebettet.
     *       Danach Durchschnitt berechnen und sortiert ausgeben.
     * @difference-to-sql
     *   Kein JOIN oder AVG vorhanden. Um die daraus entstehenden mehrfachen Abfragen zu vermeiden, wurde mit Redundanz in der Collection `angebote` gearbeitet.
     */
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    const kursGehaelterMap = new Map<string, { titel: string, gehaelter: number[] }>();

    for (const angebot of angeboteSnap.docs) {
        const { KursNr, KursTitel, kursleiter } = angebot.data() as Angebot;
        if (!kursGehaelterMap.has(KursNr)) {
            kursGehaelterMap.set(KursNr, { titel: KursTitel ?? KursNr, gehaelter: [] });
        }

        kursleiter?.forEach(k => {
            kursGehaelterMap.get(KursNr)?.gehaelter.push(k.Gehalt);
        });
    }

    for (const { titel, gehaelter } of kursGehaelterMap.values()) {
        if (gehaelter.length === 0) continue;
        const avg = gehaelter.reduce((a, b) => a + b, 0) / gehaelter.length;
        console.log(`- ${titel}: ${avg.toFixed(2)} €`);
    }

    // n) Kursleiter-Paare, die denselben Kurs halten
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');
    /**
     * @old-relational-table Fuehrt_Durch, Kursleiter, Kurs
     * @collections angebote
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
    // Schritt 1: Kursleiter je KursNr sammeln
    const kursleiterProKurs: Record<string, Map<number, string>> = {}; // KursNr → Map<PersNr, Name>
    const kursTitelMap = new Map<string, string>();

    angeboteSnap.forEach(doc => {
        const angebot = doc.data();
        const kursNr = angebot.KursNr;
        const titel = angebot.KursTitel ?? kursNr;
        kursTitelMap.set(kursNr, titel);

        if (!kursleiterProKurs[kursNr]) kursleiterProKurs[kursNr] = new Map();

        for (const leiter of angebot.kursleiter ?? []) {
            kursleiterProKurs[kursNr].set(leiter.PersNr, leiter.Name ?? `#${leiter.PersNr}`);
        }
    });

    // Schritt 2: Ausgabe aller Kursleiter-Paare mit Namen
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
