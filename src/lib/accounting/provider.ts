import type {
  AccountingActivityDto,
  AccountingContactDto,
  AccountingCustomerDto,
  AccountingEmployeeDto,
  AccountingProductDto,
  AccountingSalaryTypeDto,
  AccountingProjectDto,
  CreateAccountingContactInput,
  CreateAccountingCustomerInput,
  CreateAccountingProjectInput,
  CreateUnsentInvoiceInput,
  UpdateAccountingProjectInput,
  UpsertOrderLineInput,
  UpsertTimeEntryInput,
  WhoAmIResult,
} from "./types";

export interface AccountingProvider {
  testConnection(): Promise<WhoAmIResult>;
  listCustomers(): Promise<AccountingCustomerDto[]>;
  getCustomer(externalId: string): Promise<AccountingCustomerDto | null>;
  createCustomer(input: CreateAccountingCustomerInput): Promise<AccountingCustomerDto>;
  listContacts(customerExternalId?: string): Promise<AccountingContactDto[]>;
  createContact(input: CreateAccountingContactInput): Promise<AccountingContactDto>;
  listProducts(): Promise<AccountingProductDto[]>;
  getProduct(externalId: string): Promise<AccountingProductDto | null>;
  listActivities(): Promise<AccountingActivityDto[]>;
  listSalaryTypes(): Promise<AccountingSalaryTypeDto[]>;
  listEmployees(): Promise<AccountingEmployeeDto[]>;
  listProjects(): Promise<AccountingProjectDto[]>;
  getProject(externalId: string): Promise<AccountingProjectDto | null>;
  createProject(input: CreateAccountingProjectInput): Promise<{ externalId: string; number?: string }>;
  updateProject(externalId: string, input: UpdateAccountingProjectInput): Promise<void>;
  upsertTimeEntry(input: UpsertTimeEntryInput): Promise<{ externalId: string }>;
  deleteTimeEntry(externalId: string): Promise<void>;
  upsertOrderLine(input: UpsertOrderLineInput): Promise<{ orderExternalId: string; lineExternalId: string }>;
  createUnsentInvoice(input: CreateUnsentInvoiceInput): Promise<{
    invoiceId: string;
    number: string | null;
    amountExclVat?: number;
  }>;
  subscribeWebhooks(targetUrl: string, authHeaderValue: string): Promise<void>;
}

export class AccountingProviderNotImplementedError extends Error {
  constructor(provider: string) {
    super(`${provider}-adapteren er ikke implementert ennå`);
    this.name = "AccountingProviderNotImplementedError";
  }
}
