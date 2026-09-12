/**
 * Tripletex: PUT /order/{id}/:invoice
 * sendToCustomer skal alltid være false — faktura opprettes usendt.
 */
export function buildOrderInvoicePath(orderId: string, invoiceDate: string): string {
  const params = new URLSearchParams({
    invoiceDate,
    sendToCustomer: "false",
  });
  return `/order/${orderId}/:invoice?${params.toString()}`;
}

export const UNSENT_INVOICE = false as const;
