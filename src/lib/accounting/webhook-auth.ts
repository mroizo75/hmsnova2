import { prisma } from "@/lib/db";
import {
  WEBHOOK_SECRET_PREFIX,
  hashWebhookSecret,
  parseBearerToken,
  webhookSecretsEqual,
} from "./security";

export async function findTenantIdByWebhookAuth(
  authorization: string | null
): Promise<string | null> {
  const incoming = parseBearerToken(authorization);
  if (!incoming) return null;

  const hashed = hashWebhookSecret(incoming);
  const hashedMatch = await prisma.tenant.findFirst({
    where: {
      accountingProvider: "TRIPLETEX",
      accountingWebhookSecret: hashed,
    },
    select: { id: true },
  });
  if (hashedMatch) return hashedMatch.id;

  const legacy = await prisma.tenant.findMany({
    where: {
      accountingProvider: "TRIPLETEX",
      accountingWebhookSecret: { not: null },
      NOT: { accountingWebhookSecret: { startsWith: WEBHOOK_SECRET_PREFIX } },
    },
    select: { id: true, accountingWebhookSecret: true },
  });

  const match = legacy.find(
    (t) => t.accountingWebhookSecret && webhookSecretsEqual(t.accountingWebhookSecret, incoming)
  );
  if (!match) return null;

  await prisma.tenant.update({
    where: { id: match.id },
    data: { accountingWebhookSecret: hashed },
  });
  return match.id;
}

export async function assertTripletexCompanyAvailable(
  companyId: string,
  tenantId: string
): Promise<void> {
  const other = await prisma.tenant.findFirst({
    where: {
      tripletexCompanyId: companyId,
      NOT: { id: tenantId },
    },
    select: { id: true },
  });
  if (other) {
    throw new Error(
      "Dette Tripletex-selskapet er allerede koblet til en annen virksomhet i HMS Nova"
    );
  }

  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tripletexCompanyId: true },
  });
  if (current?.tripletexCompanyId && current.tripletexCompanyId !== companyId) {
    throw new Error("Koble fra Tripletex før du knytter et annet selskap til denne virksomheten");
  }
}

export { hashWebhookSecret };
