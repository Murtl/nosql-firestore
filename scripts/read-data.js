import { Firestore } from '@google-cloud/firestore';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const db = new Firestore({ projectId: 'custom-emulator', ssl: false });

async function aufgabe4() {
    console.log('📖 Aufgabe 4: Read Queries\n');

    // a) Alle Orte, an denen Kurse durchgeführt werden
    const angeboteSnapshot = await db.collection('angebote').get();
    const orte = new Set();
    angeboteSnapshot.forEach(doc => orte.add(doc.data().Ort));
    console.log('📍 Orte:', [...orte]);

    // b) Teilnehmer aus Augsburg
    const teilnehmerAusAugsburg = await db.collection('teilnehmer').where('Ort', '==', 'Augsburg').get();
    console.log('\n👥 Teilnehmer aus Augsburg:');
    teilnehmerAusAugsburg.forEach(doc => console.log(`- ${doc.data().Name}`));

    // c) Kursleiter mit Gehalt zwischen 3000€ und 4000€
    const kursleiter = await db.collection('kursleiter')
        .where('Gehalt', '>=', 3000)
        .where('Gehalt', '<=', 4000)
        .orderBy('Name').get();
    console.log('\n👩‍🏫 Kursleiter (Gehalt 3000€-4000€):');
    kursleiter.forEach(doc => console.log(`- ${doc.data().Name}: ${doc.data().Gehalt}€`));

    // d) Kurstitel mit Datum und Ort
    console.log('\n📚 Kurstitel mit Datum und Ort:');
    const angebote = await db.collection('angebote').get();
    for (const angebotDoc of angebote.docs) {
        const kurs = await db.collection('kurse').doc(angebotDoc.data().KursNr).get();
        console.log(`- ${kurs.data().Titel}: ${angebotDoc.data().Datum} in ${angebotDoc.data().Ort}`);
    }

    // e) Kurstitel mit Datum, Ort und Kursleiter
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angebote.docs) {
        const kurs = await db.collection('kurse').doc(angebotDoc.data().KursNr).get();
        const fuehrtDurch = await db.collection('fuehrt_durch').doc(angebotDoc.id).get();
        const kursleiterDoc = await db.collection('kursleiter').doc(fuehrtDurch.data().PersNr.toString()).get();
        console.log(`- ${kurs.data().Titel}: ${angebotDoc.data().Datum}, ${angebotDoc.data().Ort}, Kursleiter: ${kursleiterDoc.data().Name}`);
    }

    // f) Kurstitel mit Voraussetzungen
    console.log('\n📚 Kurstitel mit Voraussetzungen:\n');

    // Schritt 1: Alle Kurse laden
    const kurseSnapshot = await db.collection('kurse').get();
    const kurseMitVoraussetzungen = [];

    // Schritt 2: Voraussetzungen pro Kurs sammeln
    for (const kursDoc of kurseSnapshot.docs) {
        const kursId = kursDoc.id;
        const kursTitel = kursDoc.data().Titel;

        const voraussetzungenSnapshot = await db.collection('voraussetzungen').where('KursNr', '==', kursId).get();
        const vorTitelPromises = voraussetzungenSnapshot.docs.map(async v => {
            const vorKursDoc = await db.collection('kurse').doc(v.data().VorNr).get();
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
    console.log('\n👥 Teilnehmer am eigenen Wohnort:');
    const teilnahmen = await db.collection('teilnahmen').get();
    for (const teilnahmeDoc of teilnahmen.docs) {
        const { TnNr, AngNr, KursNr } = teilnahmeDoc.data();
        const teilnehmer = await db.collection('teilnehmer').doc(TnNr.toString()).get();
        const angebot = await db.collection('angebote').doc(`${AngNr}_${KursNr}`).get();
        if (teilnehmer.exists && angebot.exists && teilnehmer.data().Ort === angebot.data().Ort) {
            console.log(`- ${teilnehmer.data().Name}: ${angebot.data().Ort}`);
        }
    }

    // h) Kursangebote ohne Teilnehmer
    console.log('\n📚 Kursangebote ohne Teilnehmer:');
    const angebotIdsMitTeilnehmer = new Set(teilnahmen.docs.map(doc => `${doc.data().AngNr}_${doc.data().KursNr}`));
    angebote.docs.forEach(doc => {
        if (!angebotIdsMitTeilnehmer.has(doc.id)) {
            console.log(`- Angebot ${doc.id}`);
        }
    });

    // i) Kurse mit mindestens 2 Teilnehmern
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
    console.log('\n👥 Alle Meier:');
    const meierTeilnehmer = await db.collection('teilnehmer').where('Name', '>=', 'Meier').where('Name', '<=', 'Meier\uf8ff').get();
    meierTeilnehmer.forEach(doc => console.log(`- Teilnehmer: ${doc.data().Name}`));
    const meierKursleiter = await db.collection('kursleiter').where('Name', '>=', 'Meier').where('Name', '<=', 'Meier\uf8ff').get();
    meierKursleiter.forEach(doc => console.log(`- Kursleiter: ${doc.data().Name}`));

    // k. Kurstitel mit Anzahl der Angebote
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');
    const kurseSnapshotAll = await db.collection('kurse').get();
    for (const kursDoc of kurseSnapshotAll.docs) {
        const angeboteCount = (await db.collection('angebote').where('KursNr', '==', kursDoc.id).get()).size;
        console.log(`- ${kursDoc.data().Titel}: ${angeboteCount} Angebote`);
    }

    // l. Kurstitel mit Anzahl der Voraussetzungen (mind. 2 Voraussetzungen)
    console.log('\n📚 Kurstitel mit mindestens 2 Voraussetzungen:');
    const voraussetzungenSnapshotAll = await db.collection('voraussetzungen').get();
    const voraussetzungCounter = {};
    voraussetzungenSnapshotAll.docs.forEach(doc => {
        const kursNr = doc.data().KursNr;
        voraussetzungCounter[kursNr] = (voraussetzungCounter[kursNr] || 0) + 1;
    });
    const sortedVoraussetzungen = Object.entries(voraussetzungCounter)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]);
    for (const [kursNr, count] of sortedVoraussetzungen) {
        const kurs = await db.collection('kurse').doc(kursNr).get();
        console.log(`- ${kurs.data().Titel}: ${count} Voraussetzungen`);
    }

    // m. Durchschnittliches Gehalt der Kursleiter pro Kurs
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    const kursGehalt = {};
    const fuehrtDurchSnapshot = await db.collection('fuehrt_durch').get();
    for (const fdDoc of fuehrtDurchSnapshot.docs) {
        const { KursNr, PersNr } = fdDoc.data();
        const kursleiterDoc = await db.collection('kursleiter').doc(PersNr.toString()).get();
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
        const kurs = await db.collection('kurse').doc(kursNr).get();
        console.log(`- ${kurs.data().Titel}: Durchschnittliches Gehalt ${durchschnitt}€`);
    }

    // n. Alle Paare von Kursleitern, die denselben Kurs halten
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
            const kurs = await db.collection('kurse').doc(kursNr).get();
            for (let i = 0; i < leiterArray.length - 1; i++) {
                for (let j = i + 1; j < leiterArray.length; j++) {
                    const leiter1 = await db.collection('kursleiter').doc(leiterArray[i].toString()).get();
                    const leiter2 = await db.collection('kursleiter').doc(leiterArray[j].toString()).get();
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
