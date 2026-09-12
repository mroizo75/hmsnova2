import {
  AccountingProviderNotImplementedError,
  type AccountingProvider,
} from "../provider";

/**
 * Fiken-adapter — stub for senere leveranse.
 *
 * Ruter (https://api.fiken.no/api/v2/docs/):
 * - Kunder: GET/POST /companies/{slug}/contacts
 * - Produkter: GET /companies/{slug}/products
 * - Prosjekt: POST/PATCH /companies/{slug}/projects
 * - Aktiviteter: GET /companies/{slug}/activities
 * - Ansatte: GET /companies/{slug}/timeUsers
 * - Timer: POST/PATCH/DELETE /companies/{slug}/timeEntries
 * - Usendt faktura: POST /companies/{slug}/invoices/drafts
 *   (ikke POST /invoices — den bokfører med en gang)
 * - Synk inn: ingen webhooks, poll lastModified
 *
 * Auth: OAuth2 (ikke personlig token). Én samtidig request, beløp i øre.
 * Eksisterende src/lib/fiken.ts (SaaS-faktura) skal ikke gjenbrukes.
 */
export class FikenAccountingAdapter implements AccountingProvider {
  testConnection(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listCustomers(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  getCustomer(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  createCustomer(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listContacts(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  createContact(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listProducts(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  getProduct(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listActivities(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listSalaryTypes(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listEmployees(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  listProjects(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  getProject(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  createProject(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  updateProject(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  upsertTimeEntry(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  deleteTimeEntry(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  upsertOrderLine(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  createUnsentInvoice(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
  subscribeWebhooks(): never {
    throw new AccountingProviderNotImplementedError("Fiken");
  }
}
