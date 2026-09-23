import { tripletexNumericId } from "./project-payload";

export function tripletexIsoDate(value: string): string {
  return value.slice(0, 10);
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
