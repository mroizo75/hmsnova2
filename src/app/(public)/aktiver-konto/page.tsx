import { validateResetToken } from "@/lib/password-reset";
import { ActivateAccountForm } from "./activate-account-form";

export default async function AktiverKontoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ActivateAccountForm
        token=""
        tokenError="Ingen gyldig aktiveringlenke. Sjekk e-posten eller be om en ny lenke."
      />
    );
  }

  const result = await validateResetToken(token);
  if ("error" in result) {
    return <ActivateAccountForm token={token} tokenError={result.error} />;
  }

  return <ActivateAccountForm token={token} tokenError={null} />;
}
