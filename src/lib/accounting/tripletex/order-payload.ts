import { tripletexNumericId } from "./project-payload";

export function tripletexIsoDate(value: string): string {
  return value.slice(0, 10);
}

/** EHF krever e-post og postadresse. Tripletex setter invoiceSendMethod=EHF på firma. */
export function buildTripletexCustomerBody(input: {
  name: string;
  organizationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  postalAddress?: { addressLine1?: string | null; postalCode?: string | null; city?: string | null } | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = { name: input.name, isCustomer: true };
  if (input.organizationNumber) body.organizationNumber = input.organizationNumber.replace(/\s/g, "");
  if (input.email) {
    body.email = input.email;
    body.invoiceEmail = input.email;
  }
  if (input.phone) body.phoneNumber = input.phone;
  if (input.postalAddress?.addressLine1 && input.postalAddress.postalCode && input.postalAddress.city) {
    body.postalAddress = {
      addressLine1: input.postalAddress.addressLine1,
      postalCode: input.postalAddress.postalCode,
      city: input.postalAddress.city,
    };
  }
  return body;
}

/** Privatbil: kjøregodtgjørelse til ansatt. Prosjektets varesats postes som prosjekt-ordrelinje. */
export function buildTripletexMileagePayload(input: {
  employeeExternalId: string;
  projectExternalId: string;
  rateTypeExternalId: string;
  date: string;
  km: number;
  fromAddress: string;
  toAddress: string;
}): Record<string, unknown> {
  const date = input.date.slice(0, 10);
  return {
    employee: { id: Number(input.employeeExternalId) },
    project: { id: Number(input.projectExternalId) },
    isChargeable: false,
    isDayTrip: true,
    travelDetails: {
      isForeignTravel: false,
      isDayTrip: true,
      departureDate: date,
      returnDate: date,
      departureFrom: input.fromAddress,
      destination: input.toAddress,
      purpose: "Kjøring",
    },
    mileageAllowances: [
      {
        rateType: { id: Number(input.rateTypeExternalId) },
        date,
        departureLocation: input.fromAddress,
        destination: input.toAddress,
        km: input.km,
      },
    ],
  };
}

/** Tripletex Order krever customer, orderDate og deliveryDate. */
export function buildTripletexOrderPayload(input: {
  customerExternalId: string;
  projectExternalId?: string | null;
  orderDate: string;
  deliveryDate?: string | null;
  orderLines?: Record<string, unknown>[];
}): Record<string, unknown> {
  const customerId = tripletexNumericId(input.customerExternalId);
  if (!customerId) {
    throw new Error("Prosjekt mangler Tripletex-kunde for ordre");
  }
  const orderDate = tripletexIsoDate(input.orderDate);
  const body: Record<string, unknown> = {
    customer: { id: customerId },
    orderDate,
    deliveryDate: tripletexIsoDate(input.deliveryDate || orderDate),
  };
  const projectId = tripletexNumericId(input.projectExternalId);
  if (projectId) body.project = { id: projectId };
  if (input.orderLines && input.orderLines.length > 0) {
    body.orderLines = input.orderLines;
  }
  return body;
}

export function buildTripletexOrderLinePayload(input: {
  orderId: string;
  productExternalId?: string | null;
  count: number;
  description?: string | null;
  unitPriceExclVat?: number | null;
}): Record<string, unknown> {
  const orderId = tripletexNumericId(input.orderId);
  if (!orderId) {
    throw new Error("Mangler ordre-ID i Tripletex");
  }
  const body: Record<string, unknown> = {
    order: { id: orderId },
    count: input.count,
  };
  const productId = tripletexNumericId(input.productExternalId);
  if (productId) body.product = { id: productId };
  if (input.description) body.description = input.description;
  if (input.unitPriceExclVat != null) {
    body.unitPriceExcludingVatCurrency = input.unitPriceExclVat;
  }
  return body;
}

/** Prosjektets egne varelinjer. En salgsordre på prosjektet blir underordre i Tripletex. */
export function buildTripletexProjectOrderLinePayload(input: {
  projectExternalId: string;
  productExternalId: string;
  date: string;
  count: number;
  description?: string | null;
  unitPriceExclVat?: number | null;
}): Record<string, unknown> {
  const projectId = tripletexNumericId(input.projectExternalId);
  const productId = tripletexNumericId(input.productExternalId);
  if (!projectId) throw new Error("Prosjektet mangler Tripletex-ID");
  if (!productId) throw new Error("Varelinjen mangler Tripletex-produkt");
  const body: Record<string, unknown> = {
    project: { id: projectId },
    product: { id: productId },
    date: tripletexIsoDate(input.date),
    count: input.count,
    isChargeable: true,
  };
  if (input.description) body.description = input.description;
  if (input.unitPriceExclVat != null) {
    body.unitPriceExcludingVatCurrency = input.unitPriceExclVat;
  }
  return body;
}
