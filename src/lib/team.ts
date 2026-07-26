/**
 * Felles team- og forfatterdata for HMS Nova.
 * Brukes av /team og /forfatter/[slug].
 */

export interface TeamMemberContact {
  email: string;
  phone: string;
  linkedin: string;
}

export interface TeamMember {
  slug: string;
  name: string;
  title: string;
  image: string;
  /** CSS object-position for å vise ansikt (f.eks. "top", "50% 25%") */
  imagePosition?: string;
  bio: string;
  longBio: string;
  credentials: string[];
  expertise: string[];
  contact: TeamMemberContact;
  teamLabel: string;
  articlesWritten?: number;
  companiesHelped?: number;
}

export const TEAM_MEMBERS: Record<string, TeamMember> = {
  "kenneth-kristiansen": {
    slug: "kenneth-kristiansen",
    name: "Kenneth Kristiansen",
    title: "HMS-ekspert og gründer",
    image: "/team/kenneth-kristiansen.png",
    imagePosition: "50% 20%",
    bio: "Kenneth er gründer av HMS Nova og brenner for å gjøre HMS-arbeid enkelt og tilgjengelig. Med erfaring fra både privat og offentlig sektor, kombinerer han praktisk kunnskap med moderne teknologi for å bygge trygghet i norske bedrifter.",
    longBio: `
Kenneth startet HMS Nova med en visjon: HMS-arbeid skal være enkelt, ikke byråkratisk.

Gjennom erfaring med komplekse HMS-systemer og frustrerte bedriftseiere, så han behovet for en moderne, brukervennlig løsning. HMS Nova bygger trygghet - ikke byråkrati.

I dag jobber Kenneth med å utvikle HMS Nova videre og hjelper bedrifter med digitalisering av HMS-arbeid.
    `,
    credentials: [
      "Gründer av HMS Nova",
      "Godkjent kursleverandør (HMS Nova AS)",
      "Erfaring med HMS og kvalitetsstyring",
      "Spesialist på digitalisering av HMS",
      "Utvikler av moderne HMS-løsninger"
    ],
    expertise: [
      "HMS-systemer",
      "ISO 9001 sertifisering",
      "Risikovurdering",
      "Arbeidsmiljø",
      "Internkontroll",
      "Digitalisering",
      "Ledelsessystemer"
    ],
    contact: {
      email: "kenneth@kksas.no",
      phone: "+47 99 11 29 16",
      linkedin: ""
    },
    teamLabel: "gründer og utvikler",
    articlesWritten: 5,
    companiesHelped: 50,
  },
  "kai-arne-odegard": {
    slug: "kai-arne-odegard",
    name: "Kai Arne Ødegård",
    title: "Salgssjef",
    image: "/team/kai-arne.png",
    imagePosition: "50% 10%",
    bio: "Kai Arne er salgssjef i HMS Nova og har over 40 års erfaring innen salg og ledelse. Han har drevet flere egne firmaer og hjelper norske bedrifter med å finne HMS-løsninger som passer deres behov.",
    longBio: `
Kai Arne bringer over 40 års erfaring fra salg og virksomhetsledelse inn i HMS Nova. Gjennom å ha drevet flere egne selskaper kjenner han utfordringene bedriftseiere møter – og verdien av løsninger som faktisk fungerer i praksis.

Som salgssjef i HMS Nova jobber han tett med bedrifter som ønsker mer informasjon, tilpasning eller innføring av HMS Nova. Han brenner for å matche riktig løsning med riktig kunde, slik at HMS-arbeid blir en styrke – ikke en byrde.

I dag er Kai Arne et naturlig første kontaktpunkt for bedrifter som vurderer HMS Nova og ønsker en uforpliktende samtale om behov og muligheter.
    `,
    credentials: [
      "Salgssjef i HMS Nova",
      "40+ års erfaring innen salg og ledelse",
      "Erfaring med oppstart og drift av flere virksomheter",
      "Spesialist på kundedialog og behovsanalyse",
      "Første kontaktpunkt for salg og informasjon om HMS Nova"
    ],
    expertise: [
      "Salg og kundedialog",
      "HMS Nova og produktinformasjon",
      "Behovsanalyse",
      "Virksomhetsledelse",
      "B2B-salg",
      "Oppstart og drift av selskaper"
    ],
    contact: {
      email: "kai@kksas.no",
      phone: "+47 91 54 08 24",
      linkedin: ""
    },
    teamLabel: "salgssjef",
    articlesWritten: 0,
    companiesHelped: 0,
  },
  "tommy-kristiansen": {
    slug: "tommy-kristiansen",
    name: "Tommy Kristiansen",
    title: "HMS Leder",
    image: "/team/tommy-kristiansen.png",
    imagePosition: "50% 5%",
    bio: "Tommy er HMS leder i HMS Nova med bakgrunn fra HMS-kurs og HMS-ledelse, brannvern og lang erfaring som faglærer, adjunkt og verkstedleder. Han bidrar med pedagogikk, ledelse og praktisk HMS-kompetanse til teamet.",
    longBio: `
Tommy har utdannelse og kurs i HMS og HMS-ledelse (ABL), brannvern (Falken) og bred erfaring fra skole og næringsliv. Som faglærer og adjunkt ved Hedmark fylkeskommune har han jobbet med opplæring og sikkerhetskultur over mange år.

Gjennom stillinger som verkstedleder og daglig leder kjenner han krav og praksis fra arbeidslivet. Den kombinasjonen av pedagogikk, ledelse og HMS gjør ham til en naturlig HMS leder i HMS Nova – med fokus på at opplæring og rutiner skal fungere i virkeligheten.

Tommy er også aktiv i frivillig arbeid som kursinstruktør i Norges Bilsportforbund og trener i Furnes Håndball.
    `,
    credentials: [
      "HMS Leder i HMS Nova",
      "HMS og HMS-ledelse (ABL, 2007)",
      "Brannvern (Falken, 2007)",
      "Adjunkt og faglærer – Hedmark fylkeskommune",
      "Erfaring som verkstedleder og daglig leder",
      "Administrasjon og ledelse (Høyskolen i Buskerud)",
      "Spesialpedagogikk (Høyskolen i Oslo)",
      "Kursinstruktør Norges Bilsportforbund"
    ],
    expertise: [
      "HMS og HMS-ledelse",
      "Brannvern",
      "Opplæring og pedagogikk",
      "Ledelse og verksted",
      "Arbeidsmiljø",
      "Sikkerhetskultur"
    ],
    contact: {
      email: "tommy.h.kristiansen@gmail.com",
      phone: "+47 93 66 08 18",
      linkedin: ""
    },
    teamLabel: "HMS leder",
    articlesWritten: 0,
    companiesHelped: 0,
  },
} as const;

export type TeamMemberSlug = keyof typeof TEAM_MEMBERS;

export function getTeamMember(slug: string): TeamMember | undefined {
  return TEAM_MEMBERS[slug as TeamMemberSlug];
}

export function getAllTeamMembers(): TeamMember[] {
  return Object.values(TEAM_MEMBERS);
}
