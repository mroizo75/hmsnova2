import { redirect } from "next/navigation";

// RUH er nå integrert i avvik/hendelser-modulen
export default function RuhPage() {
  redirect("/dashboard/incidents");
}
