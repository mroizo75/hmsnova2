export type AccountingCustomerDto = {
  externalId: string;
  name: string;
  organizationNumber?: string | null;
  customerNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  isInactive: boolean;
};

export type AccountingProductDto = {
  externalId: string;
  name: string;
  number?: string | null;
  unit?: string | null;
  categoryExternalId?: string | null;
  categoryName?: string | null;
  priceExclVat?: number | null;
  priceInclVat?: number | null;
  isStockItem: boolean;
  isInactive: boolean;
};

export type AccountingContactDto = {
  externalId: string;
  customerExternalId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  isInactive: boolean;
};

export type AccountingSalaryTypeDto = {
  externalId: string;
  name: string;
  number?: string | null;
  isInactive: boolean;
};

export type AccountingProjectDto = {
  externalId: string;
  name: string;
  number?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isClosed: boolean;
  isReadyForInvoicing: boolean;
  isOffer: boolean;
  parentExternalId?: string | null;
  customerExternalId?: string | null;
  customerName?: string | null;
  contactExternalId?: string | null;
  location?: string | null;
  reference?: string | null;
};

export type CreateAccountingCustomerInput = {
  name: string;
  organizationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CreateAccountingContactInput = {
  customerExternalId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type AccountingActivityDto = {
  externalId: string;
  name: string;
  number?: string | null;
};

export type AccountingEmployeeDto = {
  externalId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  employeeNumber?: string | null;
};

export type CreateAccountingProjectInput = {
  name: string;
  startDate: string;
  customerExternalId?: string | null;
  parentExternalId?: string | null;
  contactExternalId?: string | null;
  description?: string | null;
  location?: string | null;
  reference?: string | null;
};

export type UpdateAccountingProjectInput = {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  isReadyForInvoicing?: boolean;
  isClosed?: boolean;
  description?: string | null;
  reference?: string | null;
};

export type UpsertTimeEntryInput = {
  projectExternalId: string;
  employeeExternalId: string;
  activityExternalId: string;
  salaryTypeExternalId?: string | null;
  date: string;
  hours: number;
  comment?: string | null;
  existingExternalId?: string | null;
};

export type UpsertOrderLineInput = {
  orderExternalId?: string | null;
  projectExternalId: string;
  customerExternalId: string;
  productExternalId: string;
  count: number;
  description?: string | null;
  unitPriceExclVat?: number | null;
  existingExternalId?: string | null;
  orderDate: string;
};

export type InvoiceLineInput = {
  description: string;
  count: number;
  productExternalId?: string | null;
  unitPriceExclVat?: number | null;
};

export type CreateUnsentInvoiceInput = {
  orderExternalId?: string | null;
  projectExternalId: string;
  customerExternalId: string;
  invoiceDate: string;
  lines: InvoiceLineInput[];
};

export type WhoAmIResult = {
  companyId: string;
  employeeId?: string;
  companyName?: string;
};
