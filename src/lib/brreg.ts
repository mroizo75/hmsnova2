/**
 * Brønnøysundregistrene API Client
 * https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html
 */

export interface BrregEnhet {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: {
    kode: string;
    beskrivelse: string;
  };
  postadresse?: {
    land: string;
    landkode: string;
    postnummer: string;
    poststed: string;
    adresse: string[];
    kommune: string;
    kommunenummer: string;
  };
  forretningsadresse?: {
    land: string;
    landkode: string;
    postnummer: string;
    poststed: string;
    adresse: string[];
    kommune: string;
    kommunenummer: string;
  };
  hjemmeside?: string;
  telefon?: string;
  epost?: string;
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  overordnetEnhet?: string;
  registreringsdatoEnhetsregisteret?: string;
  slettedato?: string;
}

export class BrregClient {
  private baseUrl = "https://data.brreg.no/enhetsregisteret/api";

  /**
   * Hent enhet fra Brønnøysundregistrene
   * @param orgNummer - Organisasjonsnummer (9 siffer)
   * @returns Enhetsinformasjon eller null hvis ikke funnet
   */
  async getEnhet(orgNummer: string): Promise<BrregEnhet | null> {
    try {
      // Fjern mellomrom og formater org.nr
      const cleanOrgNr = orgNummer.replace(/\s/g, "");

      if (!/^\d{9}$/.test(cleanOrgNr)) {
        return null;
      }

      const response = await fetch(`${this.baseUrl}/enheter/${cleanOrgNr}`, {
        headers: {
          Accept: "application/json",
        },
        // Cache i 1 time
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Brreg API error: ${response.status}`);
      }

      const data: BrregEnhet = await response.json();

      // Sjekk om bedriften er konkurs eller under avvikling
      if (data.konkurs || data.underAvvikling || data.underTvangsavviklingEllerTvangsopplosning) {
        return null;
      }

      // Sjekk om bedriften er slettet
      if (data.slettedato) {
        return null;
      }

      return data;
    } catch (error) {
      console.error("Brreg API error:", error);
      return null;
    }
  }

  /**
   * Valider om et organisasjonsnummer er gyldig og aktivt
   * @param orgNummer - Organisasjonsnummer
   * @returns true hvis gyldig og aktivt, false ellers
   */
  async validateOrgNumber(orgNummer: string): Promise<boolean> {
    const enhet = await this.getEnhet(orgNummer);
    return enhet !== null;
  }

  /**
   * Søk etter enheter
   * @param query - Søketekst (navn, org.nr, etc)
   * @param size - Antall resultater (max 10000)
   */
  async searchEnheter(query: string, size: number = 10): Promise<BrregEnhet[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/enheter?navn=${encodeURIComponent(query)}&size=${size}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Brreg API error: ${response.status}`);
      }

      const data = await response.json();
      return data._embedded?.enheter || [];
    } catch (error) {
      console.error("Brreg search error:", error);
      return [];
    }
  }
}

export const brregClient = new BrregClient();

