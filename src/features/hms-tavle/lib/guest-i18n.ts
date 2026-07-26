/**
 * Språkstøtte for gjesteflyten på Digital HMS Tavle (norsk og engelsk).
 *
 * Reiselivsbedrifter har internasjonale gjester. Ordboken dekker meldingsskjema,
 * kvittering, statusside og e-post slik at gjesten møter samme språk hele veien.
 *
 * Filen er klient-trygg: ingen Prisma-import.
 */

import type { GuestStatus, GuestType } from "./gjesteservice-config";

export type GuestLocale = "nb" | "en";

interface GuestTypeText {
  label: string;
  description: string;
  placeholder: string;
}

interface GuestStatusText {
  label: string;
  description: string;
}

export interface GuestDictionary {
  pageTitle: string;
  pageIntro: string;
  confidentialNotice: string;
  chooseType: string;
  messageLabel: string;
  messageHint: string;
  roomLabel: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  optional: string;
  consentLabel: string;
  consentHint: string;
  attachmentsLabel: string;
  attachmentsHint: string;
  addAttachment: string;
  removeAttachment: string;
  submit: string;
  submitting: string;
  back: string;
  changeType: string;
  receiptTitle: string;
  receiptIntro: string;
  trackingTitle: string;
  trackingHint: string;
  copyLink: string;
  copied: string;
  openStatus: string;
  newMessage: string;
  serviceGoal: string;
  statusTitle: string;
  statusIntro: string;
  submittedAt: string;
  answerTitle: string;
  answerPending: string;
  notFoundTitle: string;
  notFoundBody: string;
  privacyFooter: string;
  urgentNotice: string;
  types: Record<GuestType, GuestTypeText>;
  statuses: Record<GuestStatus, GuestStatusText>;
}

const nb: GuestDictionary = {
  pageTitle: "Meld fra til oss",
  pageIntro:
    "Vi ønsker å gjøre oppholdet ditt best mulig. Fortell oss hva som kan bli bedre, så tar vi tak i det.",
  confidentialNotice:
    "Meldingen din er konfidensiell. Den behandles kun av oss og vises aldri til andre gjester.",
  chooseType: "Hva gjelder det?",
  messageLabel: "Din melding",
  messageHint: "Beskriv gjerne hva som skjedde og når.",
  roomLabel: "Rom / bord",
  nameLabel: "Navn",
  emailLabel: "E-post",
  phoneLabel: "Telefon",
  optional: "valgfritt",
  consentLabel: "Ja, dere kan kontakte meg om denne saken",
  consentHint:
    "Vi bruker kontaktinformasjonen kun til å følge opp denne saken, og sletter den etter 24 måneder.",
  attachmentsLabel: "Bilder",
  attachmentsHint: "Du kan legge til inntil 3 bilder (maks 10 MB hver).",
  addAttachment: "Legg til bilde",
  removeAttachment: "Fjern",
  submit: "Send melding",
  submitting: "Sender...",
  back: "Tilbake",
  changeType: "Endre type",
  receiptTitle: "Takk – meldingen er mottatt",
  receiptIntro: "Vi har registrert saken din og starter oppfølgingen.",
  trackingTitle: "Følg saken din",
  trackingHint:
    "Lagre denne lenken. Den er privat og viser kun din egen sak – ingen andre får se den.",
  copyLink: "Kopier lenke",
  copied: "Lenken er kopiert",
  openStatus: "Åpne min sak",
  newMessage: "Send ny melding",
  serviceGoal: "Vårt serviceløfte",
  statusTitle: "Din sak",
  statusIntro: "Her ser du status og hva vi har gjort.",
  submittedAt: "Sendt inn",
  answerTitle: "Hva vi gjorde",
  answerPending: "Vi jobber med saken og oppdaterer denne siden så snart den er behandlet.",
  notFoundTitle: "Vi fant ikke denne saken",
  notFoundBody: "Sporingslenken er ugyldig eller saken er slettet. Kontakt oss gjerne direkte.",
  privacyFooter:
    "Behandles etter internkontrollforskriften § 5. Personopplysninger slettes automatisk etter 24 måneder.",
  urgentNotice:
    "Trenger du hjelp med en gang? Kontakt resepsjonen direkte. Ring 113 ved akutt fare.",
  types: {
    AVVIK: {
      label: "Feil, mangel eller farlig situasjon",
      description: "Noe er ødelagt, uttrygt eller utgjør en risiko",
      placeholder: "Beskriv hva som er feil og hvor det er.",
    },
    KLAGE: {
      label: "Klage",
      description: "Du er ikke fornøyd med noe hos oss",
      placeholder: "Beskriv hva du er misfornøyd med.",
    },
    MATFORGIFTNING: {
      label: "Sykdom etter mat eller drikke",
      description: "Symptomer du mistenker kommer fra mat eller drikke",
      placeholder: "Beskriv symptomer, når du ble syk og hva du spiste eller drakk.",
    },
    SPORSMAAL: {
      label: "Spørsmål",
      description: "Du trenger informasjon eller hjelp",
      placeholder: "Skriv spørsmålet ditt.",
    },
    TILBAKEMELDING: {
      label: "Tilbakemelding",
      description: "Ros, forslag eller andre innspill",
      placeholder: "Fortell oss hva du tenker.",
    },
  },
  statuses: {
    NY: { label: "Mottatt", description: "Saken din er registrert hos oss." },
    LEST: { label: "Under behandling", description: "Resepsjonen har sett saken og følger den opp." },
    BEHANDLET: { label: "Behandlet", description: "Vi har gjort noe med saken." },
    LUKKET: { label: "Ferdig", description: "Saken er avsluttet." },
  },
};

const en: GuestDictionary = {
  pageTitle: "Send us a message",
  pageIntro:
    "We want your stay to be as good as possible. Tell us what could be better and we will take care of it.",
  confidentialNotice:
    "Your message is confidential. Only we handle it, and it is never shown to other guests.",
  chooseType: "What is it about?",
  messageLabel: "Your message",
  messageHint: "Please describe what happened and when.",
  roomLabel: "Room / table",
  nameLabel: "Name",
  emailLabel: "Email",
  phoneLabel: "Phone",
  optional: "optional",
  consentLabel: "Yes, you may contact me about this case",
  consentHint:
    "We use your contact details only to follow up this case, and delete them after 24 months.",
  attachmentsLabel: "Photos",
  attachmentsHint: "You can add up to 3 photos (max 10 MB each).",
  addAttachment: "Add photo",
  removeAttachment: "Remove",
  submit: "Send message",
  submitting: "Sending...",
  back: "Back",
  changeType: "Change category",
  receiptTitle: "Thank you – we have received your message",
  receiptIntro: "Your case is registered and we have started working on it.",
  trackingTitle: "Follow your case",
  trackingHint:
    "Save this link. It is private and shows only your own case – nobody else can see it.",
  copyLink: "Copy link",
  copied: "Link copied",
  openStatus: "Open my case",
  newMessage: "Send another message",
  serviceGoal: "Our service promise",
  statusTitle: "Your case",
  statusIntro: "Here you can see the status and what we have done.",
  submittedAt: "Submitted",
  answerTitle: "What we did",
  answerPending: "We are working on your case and will update this page as soon as it is resolved.",
  notFoundTitle: "We could not find this case",
  notFoundBody: "The tracking link is invalid or the case has been deleted. Please contact us directly.",
  privacyFooter:
    "Handled under the Norwegian Internal Control Regulations section 5. Personal data is deleted automatically after 24 months.",
  urgentNotice: "Need immediate help? Contact the reception desk. Call 113 in an emergency.",
  types: {
    AVVIK: {
      label: "Fault, defect or safety concern",
      description: "Something is broken, unsafe or poses a risk",
      placeholder: "Describe what is wrong and where it is.",
    },
    KLAGE: {
      label: "Complaint",
      description: "You are not satisfied with something",
      placeholder: "Describe what you are unhappy about.",
    },
    MATFORGIFTNING: {
      label: "Illness after food or drink",
      description: "Symptoms you suspect came from food or drink",
      placeholder: "Describe your symptoms, when you got ill and what you ate or drank.",
    },
    SPORSMAAL: {
      label: "Question",
      description: "You need information or help",
      placeholder: "Write your question.",
    },
    TILBAKEMELDING: {
      label: "Feedback",
      description: "Praise, suggestions or other input",
      placeholder: "Tell us what you think.",
    },
  },
  statuses: {
    NY: { label: "Received", description: "Your case is registered with us." },
    LEST: { label: "In progress", description: "Reception has seen your case and is following up." },
    BEHANDLET: { label: "Resolved", description: "We have taken action on your case." },
    LUKKET: { label: "Completed", description: "The case is closed." },
  },
};

const dictionaries: Record<GuestLocale, GuestDictionary> = { nb, en };

export function getGuestDictionary(locale: GuestLocale): GuestDictionary {
  return dictionaries[locale];
}

/** Emoji per meldingstype – brukes både i skjema og i admin for rask gjenkjenning. */
export const GUEST_TYPE_EMOJI: Record<GuestType, string> = {
  AVVIK: "⚠️",
  KLAGE: "📣",
  MATFORGIFTNING: "🤒",
  SPORSMAAL: "❓",
  TILBAKEMELDING: "💬",
};
