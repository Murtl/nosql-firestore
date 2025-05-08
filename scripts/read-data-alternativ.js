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
        const angebot = angebotDoc.data();
        const kurs = await db.collection('kurse').doc(angebot.KursNr).get();
        if (kurs.exists) {
            console.log(`- ${kurs.data().Titel}: ${angebot.Datum} in ${angebot.Ort}`);
        }
    }

    // e) Kurstitel mit Datum, Ort und Kursleiter
    console.log('\n📚 Kurstitel mit Datum, Ort und Kursleiter:');
    for (const angebotDoc of angebote.docs) {
        const angebot = angebotDoc.data();
        const kurs = await db.collection('kurse').doc(angebot.KursNr).get();
        const kursleiterSnap = await db.collection('angebote').doc(angebotDoc.id).collection('kursleiter').get();
        const kursleiterNamen = [];
        for (const leiter of kursleiterSnap.docs) {
            const kursleiterDoc = await db.collection('kursleiter').doc(leiter.id).get();
            if (kursleiterDoc.exists) {
                kursleiterNamen.push(kursleiterDoc.data().Name);
            }
        }
        const leiterText = kursleiterNamen.length > 0 ? kursleiterNamen.join(', ') : 'Keine Angabe';
        console.log(`- ${kurs.data().Titel}: ${angebot.Datum}, ${angebot.Ort}, Kursleiter: ${leiterText}`);
    }

    // f) Kurstitel mit Voraussetzungen
    console.log('\n📚 Kurstitel mit Voraussetzungen:\n');
    const kurseSnapshot = await db.collection('kurse').get();
    const kurseMitVoraussetzungen = [];

    for (const kursDoc of kurseSnapshot.docs) {
        const kursId = kursDoc.id;
        const kursTitel = kursDoc.data().Titel;
        const voraussetzungenSnapshot = await db.collection('kurse').doc(kursId).collection('voraussetzungen').get();
        const vorausTitel = [];
        for (const v of voraussetzungenSnapshot.docs) {
            const vorKurs = await db.collection('kurse').doc(v.id).get();
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

    // g) Teilnehmer, die einen Kurs am eigenen Wohnort gebucht haben
    console.log('\n👥 Teilnehmer am eigenen Wohnort:');
    const teilnehmerSnap = await db.collection('teilnehmer').get();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnehmer = tnDoc.data();
        const teilnahmen = await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr } = teilnahme.data();
            const angebot = await db.collection('angebote').doc(`${AngNr}`).get();
            if (angebot.exists && angebot.data().Ort === teilnehmer.Ort) {
                console.log(`- ${teilnehmer.Name}: ${angebot.data().Ort}`);
            }
        }
    }

    // h) Kursangebote ohne Teilnehmer
    console.log('\n📚 Kursangebote ohne Teilnehmer:');
    const angeboteSnap = await db.collection('angebote').get();
    const belegteAngebote = new Set();
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmen = await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr} = teilnahme.data();
            belegteAngebote.add(`${AngNr}`);
        }
    }
    for (const angebotDoc of angeboteSnap.docs) {
        if (!belegteAngebote.has(angebotDoc.id)) {
            const angebot = angebotDoc.data();
            const kurs = await db.collection('kurse').doc(angebot.KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data().Titel : angebot.KursNr}, Angebot ${angebotDoc.id}`);
        }
    }

    // i) Kurse mit mindestens 2 Teilnehmern
    console.log('\n📚 Kurse mit mind. 2 Teilnehmern:');
    const teilnahmeCounter = {};
    for (const tnDoc of teilnehmerSnap.docs) {
        const teilnahmen = await db.collection('teilnehmer').doc(tnDoc.id).collection('teilnahmen').get();
        for (const teilnahme of teilnahmen.docs) {
            const { AngNr} = teilnahme.data();
            const key = `${AngNr}`;
            teilnahmeCounter[key] = (teilnahmeCounter[key] || 0) + 1;
        }
    }
    for (const [angebotId, count] of Object.entries(teilnahmeCounter)) {
        if (count >= 2) {
            const angebot = await db.collection('angebote').doc(angebotId).get();
            const kurs = await db.collection('kurse').doc(angebot.data().KursNr).get();
            console.log(`- ${kurs.exists ? kurs.data().Titel : angebot.data().KursNr}: ${count} Teilnehmer`);
        }
    }

    // j) Alle Meier
    console.log('\n👥 Alle Meier:');
    const teilnehmerMeier = await db.collection('teilnehmer')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff').get();
    teilnehmerMeier.forEach(doc => console.log(`- Teilnehmer: ${doc.data().Name}`));
    const kursleiterMeier = await db.collection('kursleiter')
        .where('Name', '>=', 'Meier')
        .where('Name', '<=', 'Meier\uf8ff').get();
    kursleiterMeier.forEach(doc => console.log(`- Kursleiter: ${doc.data().Name}`));

    // k) Kurstitel mit Anzahl der Angebote
    console.log('\n📚 Kurstitel mit Anzahl der Angebote:');
    const kurseSnap = await db.collection('kurse').get();
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angeboteCount = (await db.collection('angebote').where('KursNr', '==', kursId).get()).size;
        console.log(`- ${kursDoc.data().Titel}: ${angeboteCount} Angebote`);
    }

    // l) Kurstitel mit Anzahl der Voraussetzungen (mind. 2)
    console.log('\n📚 Kurstitel mit mindestens 2 Voraussetzungen:');
    const vorausList = [];  // ← hier wird die Liste korrekt initialisiert
    for (const kursDoc of kurseSnap.docs) {
        const vorausSnap = await db.collection('kurse').doc(kursDoc.id).collection('voraussetzungen').get();
        if (vorausSnap.size >= 2) {
            vorausList.push({ titel: kursDoc.data().Titel, count: vorausSnap.size });
        }
    }
    vorausList.sort((a, b) => b.count - a.count);
    vorausList.forEach(k => console.log(`- ${k.titel}: ${k.count} Voraussetzungen`));


    // m) Durchschnittliches Gehalt der Kursleiter pro Kurs
    console.log('\n📚 Durchschnittliches Gehalt der Kursleiter pro Kurs:');
    const kursGehaelter = [];
    for (const kursDoc of kurseSnap.docs) {
        const kursId = kursDoc.id;
        const angebote = await db.collection('angebote').where('KursNr', '==', kursId).get();
        const gehaltSum = [];
        for (const angebot of angebote.docs) {
            const leiterSnap = await db.collection('angebote').doc(angebot.id).collection('kursleiter').get();
            for (const leiter of leiterSnap.docs) {
                const leiterDoc = await db.collection('kursleiter').doc(leiter.id).get();
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
    console.log('\n👩‍🏫 Kursleiter-Paare für denselben Kurs:');
    const kursLeiterMap = {};
    const angeboteSnapAll = await db.collection('angebote').get();
    for (const angebotDoc of angeboteSnapAll.docs) {
        const angebot = angebotDoc.data();
        if (!kursLeiterMap[angebot.KursNr]) kursLeiterMap[angebot.KursNr] = new Set();
        const leiterSnap = await db.collection('angebote').doc(angebotDoc.id).collection('kursleiter').get();
        leiterSnap.docs.forEach(d => kursLeiterMap[angebot.KursNr].add(d.id));
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
                    console.log(`- ${kurs.data().Titel}: ${l1.data().Name} & ${l2.data().Name}`);
                }
            }
        }
    }

    console.log('\n✅ Fertig.');
}

await aufgabe4();
