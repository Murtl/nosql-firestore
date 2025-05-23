import {FirestoreDataConverter, QueryDocumentSnapshot, Timestamp, WithFieldValue} from '@google-cloud/firestore';

export interface Kursliteratur {
    Bestand: number;
    Bedarf: number;
    Preis: number;
}

export interface Kurs {
    Titel: string;
    kursliteratur?: Kursliteratur;
    voraussetzungen?: string[];
}

export interface RawAngebotJson {
    KursNr: string;
    Datum: Timestamp;
    Ort: string;
    kursleiter: number[];
}

export interface Angebot {
    KursNr: string;
    KursTitel: string;
    Datum: Timestamp;
    Ort: string;
    kursleiter?: Kursleiter[];
}

export interface Kursleiter {
    Name: string;
    Gehalt: number;
}

export interface Teilnahme {
    AngNr: string;
    KursNr: string;
    Gebuehr: number | null;
}

export interface Teilnehmer {
    Name: string;
    Ort: string;
    teilnahmen?: Teilnahme[];
}

export const createConverter = <T extends { [key: string]: any }>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>) => data,
    fromFirestore: (snap: QueryDocumentSnapshot): T => snap.data() as T,
});
