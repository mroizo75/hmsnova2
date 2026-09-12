import type { AccountingProvider } from "../provider";
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
} from "../types";
import { buildOrderInvoicePath } from "../invoice";
import { mergedTimesheetHours, timesheetKeysMatch } from "../timesheet";
import { paginatedGet, TripletexClient } from "./client";

type TxId = { id?: number };
type TxCustomer = TxId & {
  name?: string;
  organizationNumber?: string;
  customerNumber?: number;
  email?: string;
  phoneNumber?: string;
  isInactive?: boolean;
};
type TxProduct = TxId & {
  name?: string;
  number?: string;
  productUnit?: { name?: string };
  productCategory?: { id?: number; name?: string };
  priceExcludingVatCurrency?: number;
  priceIncludingVatCurrency?: number;
  isStockItem?: boolean;
  isInactive?: boolean;
};
type TxContact = TxId & {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  isInactive?: boolean;
  customer?: TxId;
};
type TxSalaryType = TxId & {
  name?: string;
  number?: string;
  isInactive?: boolean;
};
type TxActivity = TxId & { name?: string; number?: string };
type TxEmployee = TxId & {
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeNumber?: number;
};
type TxProject = TxId & {
  name?: string;
  number?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isClosed?: boolean;
  isReadyForInvoicing?: boolean;
  isOffer?: boolean;
  reference?: string;
  mainProject?: TxId;
  customer?: TxId & { name?: string };
  contact?: TxId;
  deliveryAddress?: { addressLine1?: string };
};
type TxValue<T> = { value?: T };

function idStr(value?: number | string | null): string {
  if (value == null) return "";
  return String(value);
}

const PROJECT_FIELDS =
  "id,name,number,description,startDate,endDate,isClosed,isReadyForInvoicing,isOffer,reference,mainProject(id),customer(id,name),contact(id),deliveryAddress(addressLine1)";

function mapTxProject(p: TxProject): AccountingProjectDto | null {
  const externalId = idStr(p.id);
  const name = (p.name ?? "").trim();
  if (!externalId || !name) return null;
  return {
    externalId,
    name,
    number: p.number ?? null,
    description: p.description ?? null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    isClosed: Boolean(p.isClosed),
    isReadyForInvoicing: Boolean(p.isReadyForInvoicing),
    isOffer: Boolean(p.isOffer),
    parentExternalId: p.mainProject?.id != null ? idStr(p.mainProject.id) : null,
    customerExternalId: p.customer?.id != null ? idStr(p.customer.id) : null,
    customerName: p.customer?.name ?? null,
    contactExternalId: p.contact?.id != null ? idStr(p.contact.id) : null,
    location: p.deliveryAddress?.addressLine1 ?? null,
    reference: p.reference ?? null,
  };
}

export class TripletexAdapter implements AccountingProvider {
  constructor(private readonly client: TripletexClient) {}

  async testConnection(): Promise<WhoAmIResult> {
    const data = await this.client.request<TxValue<{
      employee?: { id?: number; company?: { id?: number; name?: string } };
      company?: { id?: number; name?: string };
    }>>("/token/session/>whoAmI?fields=employee(id,company(id,name)),company(id,name)");
    const companyId =
      idStr(data.value?.company?.id) || idStr(data.value?.employee?.company?.id);
    if (!companyId) {
      throw new Error("Fant ikke Tripletex-selskap på sesjonen");
    }
    return {
      companyId,
      employeeId: idStr(data.value?.employee?.id) || undefined,
      companyName: data.value?.company?.name ?? data.value?.employee?.company?.name,
    };
  }

  async listCustomers(): Promise<AccountingCustomerDto[]> {
    const rows = await paginatedGet<TxCustomer>(
      this.client,
      "/customer?isInactive=false",
      "id,name,organizationNumber,customerNumber,email,invoiceEmail,phoneNumber,isInactive"
    );
    return rows.map((c) => ({
      externalId: idStr(c.id),
      name: c.name ?? "",
      organizationNumber: c.organizationNumber ?? null,
      customerNumber: c.customerNumber != null ? String(c.customerNumber) : null,
      email: c.email ?? null,
      phone: c.phoneNumber ?? null,
      isInactive: Boolean(c.isInactive),
    }));
  }

  async getCustomer(externalId: string): Promise<AccountingCustomerDto | null> {
    const data = await this.client.request<TxValue<TxCustomer>>(
      `/customer/${externalId}?fields=id,name,organizationNumber,customerNumber,email,phoneNumber,isInactive`
    );
    const c = data.value;
    if (!c?.id) return null;
    return {
      externalId: idStr(c.id),
      name: c.name ?? "",
      organizationNumber: c.organizationNumber ?? null,
      customerNumber: c.customerNumber != null ? String(c.customerNumber) : null,
      email: c.email ?? null,
      phone: c.phoneNumber ?? null,
      isInactive: Boolean(c.isInactive),
    };
  }

  async listProducts(): Promise<AccountingProductDto[]> {
    const rows = await paginatedGet<TxProduct>(
      this.client,
      "/product?isInactive=false",
      "id,name,number,priceExcludingVatCurrency,priceIncludingVatCurrency,productUnit(*),productCategory(id,name),isStockItem,isInactive"
    );
    return rows.map((p) => ({
      externalId: idStr(p.id),
      name: p.name ?? "",
      number: p.number ?? null,
      unit: p.productUnit?.name ?? null,
      categoryExternalId: p.productCategory?.id != null ? idStr(p.productCategory.id) : null,
      categoryName: p.productCategory?.name ?? null,
      priceExclVat: p.priceExcludingVatCurrency ?? null,
      priceInclVat: p.priceIncludingVatCurrency ?? null,
      isStockItem: Boolean(p.isStockItem),
      isInactive: Boolean(p.isInactive),
    }));
  }

  async getProduct(externalId: string): Promise<AccountingProductDto | null> {
    const data = await this.client.request<TxValue<TxProduct>>(
      `/product/${externalId}?fields=id,name,number,priceExcludingVatCurrency,priceIncludingVatCurrency,productUnit(*),productCategory(id,name),isStockItem,isInactive`
    );
    const p = data.value;
    if (!p?.id) return null;
    return {
      externalId: idStr(p.id),
      name: p.name ?? "",
      number: p.number ?? null,
      unit: p.productUnit?.name ?? null,
      categoryExternalId: p.productCategory?.id != null ? idStr(p.productCategory.id) : null,
      categoryName: p.productCategory?.name ?? null,
      priceExclVat: p.priceExcludingVatCurrency ?? null,
      priceInclVat: p.priceIncludingVatCurrency ?? null,
      isStockItem: Boolean(p.isStockItem),
      isInactive: Boolean(p.isInactive),
    };
  }

  async createCustomer(input: CreateAccountingCustomerInput): Promise<AccountingCustomerDto> {
    const body: Record<string, unknown> = {
      name: input.name,
      isCustomer: true,
    };
    if (input.organizationNumber) body.organizationNumber = input.organizationNumber.replace(/\s/g, "");
    if (input.email) {
      body.email = input.email;
      body.invoiceEmail = input.email;
    }
    if (input.phone) body.phoneNumber = input.phone;

    const created = await this.client.request<TxValue<TxCustomer>>("/customer", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const c = created.value;
    if (!c?.id) throw new Error("Tripletex returnerte ikke kunde-ID");
    return {
      externalId: idStr(c.id),
      name: c.name ?? input.name,
      organizationNumber: c.organizationNumber ?? input.organizationNumber ?? null,
      customerNumber: c.customerNumber != null ? String(c.customerNumber) : null,
      email: c.email ?? input.email ?? null,
      phone: c.phoneNumber ?? input.phone ?? null,
      isInactive: Boolean(c.isInactive),
    };
  }

  async listContacts(customerExternalId?: string): Promise<AccountingContactDto[]> {
    const path = customerExternalId
      ? `/contact?customerId=${encodeURIComponent(customerExternalId)}`
      : "/contact";
    const rows = await paginatedGet<TxContact>(
      this.client,
      path,
      "id,firstName,lastName,email,phoneNumber,isInactive,customer(id)"
    );
    return rows
      .filter((c) => c.customer?.id)
      .map((c) => ({
        externalId: idStr(c.id),
        customerExternalId: idStr(c.customer?.id),
        firstName: c.firstName ?? null,
        lastName: c.lastName ?? null,
        email: c.email ?? null,
        phone: c.phoneNumber ?? null,
        isInactive: Boolean(c.isInactive),
      }));
  }

  async createContact(input: CreateAccountingContactInput): Promise<AccountingContactDto> {
    const created = await this.client.request<TxValue<TxContact>>("/contact", {
      method: "POST",
      body: JSON.stringify({
        customer: { id: Number(input.customerExternalId) },
        firstName: input.firstName,
        lastName: input.lastName ?? undefined,
        email: input.email ?? undefined,
        phoneNumber: input.phone ?? undefined,
      }),
    });
    const c = created.value;
    if (!c?.id) throw new Error("Tripletex returnerte ikke kontakt-ID");
    return {
      externalId: idStr(c.id),
      customerExternalId: input.customerExternalId,
      firstName: c.firstName ?? input.firstName,
      lastName: c.lastName ?? input.lastName ?? null,
      email: c.email ?? input.email ?? null,
      phone: c.phoneNumber ?? input.phone ?? null,
      isInactive: Boolean(c.isInactive),
    };
  }

  async listSalaryTypes(): Promise<AccountingSalaryTypeDto[]> {
    const rows = await paginatedGet<TxSalaryType>(
      this.client,
      "/salaryType",
      "id,name,number,isInactive"
    );
    return rows.map((s) => ({
      externalId: idStr(s.id),
      name: s.name ?? "",
      number: s.number ?? null,
      isInactive: Boolean(s.isInactive),
    }));
  }

  async listActivities(): Promise<AccountingActivityDto[]> {
    const rows = await paginatedGet<TxActivity>(
      this.client,
      "/activity?isProjectActivity=true",
      "id,name,number"
    );
    return rows.map((a) => ({
      externalId: idStr(a.id),
      name: a.name ?? "",
      number: a.number ?? null,
    }));
  }

  async listEmployees(): Promise<AccountingEmployeeDto[]> {
    const rows = await paginatedGet<TxEmployee>(
      this.client,
      "/employee",
      "id,firstName,lastName,email,employeeNumber"
    );
    return rows.map((e) => ({
      externalId: idStr(e.id),
      firstName: e.firstName ?? null,
      lastName: e.lastName ?? null,
      email: e.email ?? null,
      employeeNumber: e.employeeNumber != null ? String(e.employeeNumber) : null,
    }));
  }

  async listProjects(): Promise<AccountingProjectDto[]> {
    const rows = await paginatedGet<TxProject>(
      this.client,
      "/project?isOffer=false",
      PROJECT_FIELDS
    );
    return rows.map(mapTxProject).filter((p): p is AccountingProjectDto => p != null && !p.isOffer);
  }

  async getProject(externalId: string): Promise<AccountingProjectDto | null> {
    const data = await this.client.request<TxValue<TxProject>>(
      `/project/${externalId}?fields=${encodeURIComponent(PROJECT_FIELDS)}`
    );
    const mapped = data.value ? mapTxProject(data.value) : null;
    if (!mapped || mapped.isOffer) return null;
    return mapped;
  }

  async createProject(input: CreateAccountingProjectInput): Promise<{ externalId: string; number?: string }> {
    const hasCustomer = Boolean(input.customerExternalId);
    const body: Record<string, unknown> = {
      name: input.name,
      startDate: input.startDate,
      isInternal: !hasCustomer,
      isClosed: false,
      isReadyForInvoicing: false,
    };
    if (hasCustomer) {
      body.customer = { id: Number(input.customerExternalId) };
    }
    if (input.parentExternalId) {
      body.parent = { id: Number(input.parentExternalId) };
    }
    if (input.description) body.description = input.description;
    if (input.reference) body.reference = input.reference;
    if (input.location) {
      body.deliveryAddress = { addressLine1: input.location };
    }

    const created = await this.client.request<TxValue<TxId & { number?: string }>>("/project", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const id = created.value?.id;
    if (!id) throw new Error("Tripletex returnerte ikke prosjekt-ID");
    return { externalId: idStr(id), number: created.value?.number };
  }

  async updateProject(externalId: string, input: UpdateAccountingProjectInput): Promise<void> {
    const body: Record<string, unknown> = {};
    if (input.name) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.isReadyForInvoicing !== undefined) body.isReadyForInvoicing = input.isReadyForInvoicing;
    if (input.isClosed !== undefined) body.isClosed = input.isClosed;
    await this.client.request(`/project/${externalId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async upsertTimeEntry(input: UpsertTimeEntryInput): Promise<{ externalId: string }> {
    const salaryType = input.salaryTypeExternalId
      ? { id: Number(input.salaryTypeExternalId) }
      : undefined;

    if (input.existingExternalId) {
      await this.client.request(`/timesheet/entry/${input.existingExternalId}`, {
        method: "PUT",
        body: JSON.stringify({
          hours: input.hours,
          chargeable: true,
          chargeableHours: input.hours,
          comment: input.comment ?? undefined,
          ...(salaryType ? { salaryType } : {}),
        }),
      });
      return { externalId: input.existingExternalId };
    }

    const dateTo = nextDay(input.date);
    const existing = await this.client.request<{ values?: Array<TxId & {
      hours?: number;
      employee?: TxId;
      activity?: TxId;
      project?: TxId;
      date?: string;
    }> }>(
      `/timesheet/entry?dateFrom=${input.date}&dateTo=${dateTo}&employeeId=${input.employeeExternalId}&projectId=${input.projectExternalId}&activityId=${input.activityExternalId}&fields=id,hours,date,employee(id),activity(id),project(id)`
    );

    const match = (existing.values ?? []).find((row) =>
      timesheetKeysMatch(
        {
          employeeId: idStr(row.employee?.id),
          date: row.date ?? input.date,
          activityId: idStr(row.activity?.id),
          projectId: idStr(row.project?.id),
        },
        {
          employeeId: input.employeeExternalId,
          date: input.date,
          activityId: input.activityExternalId,
          projectId: input.projectExternalId,
        }
      )
    );

    if (match?.id) {
      const hours = mergedTimesheetHours(match.hours ?? 0, input.hours);
      await this.client.request(`/timesheet/entry/${match.id}`, {
        method: "PUT",
        body: JSON.stringify({
          hours,
          chargeable: true,
          chargeableHours: hours,
          comment: input.comment ?? undefined,
          ...(salaryType ? { salaryType } : {}),
        }),
      });
      return { externalId: idStr(match.id) };
    }

    const created = await this.client.request<TxValue<TxId>>("/timesheet/entry", {
      method: "POST",
      body: JSON.stringify({
        project: { id: Number(input.projectExternalId) },
        activity: { id: Number(input.activityExternalId) },
        employee: { id: Number(input.employeeExternalId) },
        date: input.date,
        hours: input.hours,
        chargeable: true,
        chargeableHours: input.hours,
        comment: input.comment ?? undefined,
        ...(salaryType ? { salaryType } : {}),
      }),
    });
    const id = created.value?.id;
    if (!id) throw new Error("Tripletex returnerte ikke timeførings-ID");
    return { externalId: idStr(id) };
  }

  async deleteTimeEntry(externalId: string): Promise<void> {
    await this.client.request(`/timesheet/entry/${externalId}`, { method: "DELETE" });
  }

  async upsertOrderLine(input: UpsertOrderLineInput): Promise<{ orderExternalId: string; lineExternalId: string }> {
    let orderId = input.orderExternalId;
    if (!orderId) {
      const created = await this.client.request<TxValue<TxId>>("/order", {
        method: "POST",
        body: JSON.stringify({
          customer: { id: Number(input.customerExternalId) },
          project: { id: Number(input.projectExternalId) },
          orderDate: input.orderDate,
          orderLines: [],
        }),
      });
      orderId = idStr(created.value?.id);
      if (!orderId) throw new Error("Tripletex returnerte ikke ordre-ID");
    }

    if (input.existingExternalId) {
      await this.client.request(`/order/orderline/${input.existingExternalId}`, {
        method: "PUT",
        body: JSON.stringify({
          count: input.count,
          description: input.description ?? undefined,
          unitPriceExcludingVatCurrency: input.unitPriceExclVat ?? undefined,
        }),
      });
      return { orderExternalId: orderId, lineExternalId: input.existingExternalId };
    }

    const line = await this.client.request<TxValue<TxId>>("/order/orderline", {
      method: "POST",
      body: JSON.stringify({
        order: { id: Number(orderId) },
        product: { id: Number(input.productExternalId) },
        count: input.count,
        description: input.description ?? undefined,
        unitPriceExcludingVatCurrency: input.unitPriceExclVat ?? undefined,
      }),
    });
    const lineId = idStr(line.value?.id);
    if (!lineId) throw new Error("Tripletex returnerte ikke ordrelinje-ID");
    return { orderExternalId: orderId, lineExternalId: lineId };
  }

  async createUnsentInvoice(input: CreateUnsentInvoiceInput): Promise<{
    invoiceId: string;
    number: string | null;
    amountExclVat?: number;
  }> {
    let orderId = input.orderExternalId;
    if (!orderId) {
      const created = await this.client.request<TxValue<TxId>>("/order", {
        method: "POST",
        body: JSON.stringify({
          customer: { id: Number(input.customerExternalId) },
          project: { id: Number(input.projectExternalId) },
          orderDate: input.invoiceDate,
          orderLines: input.lines.map((line) => ({
            product: line.productExternalId ? { id: Number(line.productExternalId) } : undefined,
            count: line.count,
            description: line.description,
            unitPriceExcludingVatCurrency: line.unitPriceExclVat ?? undefined,
          })),
        }),
      });
      orderId = idStr(created.value?.id);
      if (!orderId) throw new Error("Tripletex returnerte ikke ordre-ID");
    } else {
      for (const line of input.lines) {
        if (line.productExternalId) continue;
        await this.client.request("/order/orderline", {
          method: "POST",
          body: JSON.stringify({
            order: { id: Number(orderId) },
            count: line.count,
            description: line.description,
            unitPriceExcludingVatCurrency: line.unitPriceExclVat ?? undefined,
          }),
        });
      }
    }

    const path = buildOrderInvoicePath(orderId, input.invoiceDate);
    const invoiced = await this.client.request<TxValue<TxId & {
      invoiceNumber?: string;
      number?: string;
      amountExcludingVat?: number;
    }>>(path, { method: "PUT" });

    const invoiceId = idStr(invoiced.value?.id);
    if (!invoiceId) throw new Error("Tripletex returnerte ikke faktura-ID");
    return {
      invoiceId,
      number: invoiced.value?.invoiceNumber ?? invoiced.value?.number ?? null,
      amountExclVat: invoiced.value?.amountExcludingVat,
    };
  }

  async subscribeWebhooks(targetUrl: string, authHeaderValue: string): Promise<void> {
    const events = [
      "customer.create",
      "customer.update",
      "customer.delete",
      "product.create",
      "product.update",
      "product.delete",
      "project.create",
      "project.update",
      "project.delete",
      "employee.create",
      "employee.update",
      "employee.delete",
      "invoice.charged",
    ];

    for (const event of events) {
      await this.client.request("/event/subscription", {
        method: "POST",
        body: JSON.stringify({
          event,
          targetUrl,
          authHeaderName: "Authorization",
          authHeaderValue,
        }),
      });
    }
  }
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
