// Deterministische Pflichtprüfung: Diese Themen werden IMMER an den Coach eskaliert –
// unabhängig davon, was die KI entscheidet, und nicht abschaltbar.

export const MANDATORY_TOPICS = ["Schmerzen", "Verletzungen", "Krankheitssymptome", "Medikamente", "Schwangerschaft"] as const;
export type MandatoryTopic = (typeof MANDATORY_TOPICS)[number];

const PATTERNS: [MandatoryTopic, RegExp][] = [
  ["Schmerzen", /schmerz|\btut\b[^.!?]{0,40}\bweh\b|weh\s?getan|wehtut|ziept|stechen|stiche?\s+in|brennt\s+(im|in|am)|aua|autsch|muskelkater/],
  ["Verletzungen", /verletz|zerr|verstauch|umgeknickt|gerissen|riss\b|bänder|baender|prellung|gebrochen|\bbruch|knochenbruch|fraktur|ausgerenkt|luxation|bandscheib|sehnenscheid|entzündung|entzuendung|gestürzt|gestuerzt/],
  [
    "Krankheitssymptome",
    /krank|fieber|erkält|erkaelt|grippe|infekt|husten|schnupfen|halsweh|übel|uebel|erbroch|durchfall|schwindel|ohnmacht|kreislauf|atemnot|kurzatmig|herzrasen|herzstolper|brustenge|engegefühl|engegefuehl|migräne|migraene|kopfweh|corona|covid|taub(heit)?\b|kribbeln/,
  ],
  [
    "Medikamente",
    /medikament|tablette|pille\b|ibuprofen|ibu\b|paracetamol|aspirin|diclofenac|voltaren|antibiotik|kortison|cortison|insulin|blutdrucksenker|blutverdünn|blutverduenn|betablocker|schmerzmittel|spritze/,
  ],
  ["Schwangerschaft", /schwanger|schwangerschaft|stillzeit|ich\s+stille|stillen\b.*(baby|kind)|wochenbett|entbindung|kinderwunsch|\bssw\b/],
];

export function detectMandatoryEscalation(text: string): { topic: MandatoryTopic; match: string } | null {
  const t = text.toLowerCase();
  for (const [topic, re] of PATTERNS) {
    const m = re.exec(t);
    if (m) return { topic, match: m[0] };
  }
  return null;
}
