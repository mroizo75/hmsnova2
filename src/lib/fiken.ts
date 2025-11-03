import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

const FIKEN_API_URL = "https://api.fiken.no/api/v2";

interface FikenConfig {
  apiToken: string;
  companySlug: string;
}

export class FikenClient {
  private token: string;
  private companySlug: string;

  constructor(config: FikenConfig) {
    this.token = config.apiToken;
    this.companySlug = config.companySlug;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${FIKEN_API_URL}/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Fiken API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getInvoice(invoiceId: string) {
    return this.request(`companies/${this.companySlug}/invoices/${invoiceId}`);
  }

  async getSale(saleId: string) {
    return this.request(`companies/${this.companySlug}/sales/${saleId}`);
  }

  async listInvoices(params?: { lastModified?: string; lastModifiedInclusive?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.lastModified) {
      searchParams.set("lastModified", params.lastModified);
    }
    if (params?.lastModifiedInclusive !== undefined) {
      searchParams.set("lastModifiedInclusive", String(params.lastModifiedInclusive));
    }
    
    const query = searchParams.toString();
    return this.request(`companies/${this.companySlug}/invoices${query ? `?${query}` : ""}`);
  }

  async createInvoice(invoice: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    lines: Array<{
      description: string;
      netAmount: number;
      vatType: string;
      account: string;
    }>;
  }) {
    return this.request(`companies/${this.companySlug}/invoices`, {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  async createRecurringSale(sale: {
    date: string;
    kind: string;
    customerId: string;
    lines: Array<{
      description: string;
      netAmount: number;
      vatType: string;
      account: string;
    }>;
    dueDate: string;
    recurring: {
      frequency: string;
      interval: number;
    };
  }) {
    return this.request(`companies/${this.companySlug}/sales`, {
      method: "POST",
      body: JSON.stringify(sale),
    });
  }

  async getCustomer(customerId: string) {
    return this.request(`companies/${this.companySlug}/contacts/${customerId}`);
  }

  async createCustomer(customer: {
    name: string;
    organizationNumber?: string;
    email?: string;
    phone?: string;
    address?: {
      streetAddress?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  }) {
    return this.request(`companies/${this.companySlug}/contacts`, {
      method: "POST",
      body: JSON.stringify({
        ...customer,
        contactPerson: [],
      }),
    });
  }
}

export async function syncInvoiceStatus(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      invoices: {
        where: {
          status: {
            in: ["PENDING", "SENT", "OVERDUE"],
          },
        },
      },
    },
  });

  if (!tenant?.fikenCompanyId) {
    throw new Error("Tenant has no Fiken company ID");
  }

  const fikenClient = new FikenClient({
    apiToken: process.env.FIKEN_API_TOKEN!,
    companySlug: process.env.FIKEN_COMPANY_SLUG!,
  });

  for (const invoice of tenant.invoices) {
    if (!invoice.fikenInvoiceId) continue;

    try {
      const fikenInvoice = await fikenClient.getInvoice(invoice.fikenInvoiceId) as any;
      
      let status: InvoiceStatus = invoice.status;
      
      if (fikenInvoice?.paid) {
        status = "PAID";
      } else if (fikenInvoice?.cancelled) {
        status = "CANCELLED";
      } else if (new Date(invoice.dueDate) < new Date()) {
        status = "OVERDUE";
      } else if (fikenInvoice?.sent) {
        status = "SENT";
      }

      if (status !== invoice.status) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { 
            status,
            paidDate: fikenInvoice?.paid ? new Date() : null,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to sync invoice ${invoice.id}:`, error);
    }
  }
}

export async function checkTenantPaymentStatus(tenantId: string): Promise<{
  isActive: boolean;
  hasOverdueInvoices: boolean;
  overdueAmount: number;
}> {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: {
        in: ["OVERDUE", "PENDING"],
      },
    },
  });

  const overdueInvoices = invoices.filter(inv => inv.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return {
    isActive: overdueInvoices.length === 0,
    hasOverdueInvoices: overdueInvoices.length > 0,
    overdueAmount,
  };
}

