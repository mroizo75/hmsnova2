import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAccountingProvider } from "@/lib/accounting/factory";
import { upsertCustomers, upsertProducts } from "@/lib/accounting/cache";
import { upsertPulledProjects } from "@/lib/accounting/project-pull";
import { findTenantIdByWebhookAuth } from "@/lib/accounting/webhook-auth";

type TripletexWebhook = {
  event?: string;
  id?: number;
  value?: Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  const tenantId = await findTenantIdByWebhookAuth(request.headers.get("authorization"));
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: TripletexWebhook;
  try {
    payload = (await request.json()) as TripletexWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event ?? "";
  const externalId = payload.id != null ? String(payload.id) : "";

  try {
    const provider = await getAccountingProvider(tenantId);
    if (!provider) {
      return NextResponse.json({ ok: true });
    }

    if (event.startsWith("customer.")) {
      if (event.endsWith(".delete") && externalId) {
        await prisma.accountingCustomer.deleteMany({
          where: { tenantId, externalId },
        });
      } else if (externalId) {
        const customer = await provider.getCustomer(externalId);
        if (customer) await upsertCustomers(tenantId, [customer]);
      }
    }

    if (event.startsWith("product.")) {
      if (event.endsWith(".delete") && externalId) {
        await prisma.accountingProduct.deleteMany({
          where: { tenantId, externalId },
        });
      } else if (externalId) {
        const product = await provider.getProduct(externalId);
        if (product) await upsertProducts(tenantId, [product]);
      }
    }

    if (event.startsWith("project.")) {
      if (event.endsWith(".delete") && externalId) {
        // Internkontrollforskriften § 5: avvik/SJA på prosjektet skal ikke slettes.
        await prisma.project.updateMany({
          where: { tenantId, externalProjectId: externalId },
          data: { status: "COMPLETED" },
        });
      } else if (externalId) {
        const project = await provider.getProject(externalId);
        if (project) await upsertPulledProjects(tenantId, [project]);
      }
    }

    if (event === "invoice.charged" && externalId) {
      await prisma.projectInvoice.updateMany({
        where: { tenantId, externalInvoiceId: externalId },
        data: {},
      });
      await prisma.project.updateMany({
        where: { tenantId, invoices: { some: { externalInvoiceId: externalId } } },
        data: { billingStatus: "INVOICED" },
      });
    }
  } catch {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
