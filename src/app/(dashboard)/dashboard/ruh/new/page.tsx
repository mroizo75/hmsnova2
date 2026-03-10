import { redirect } from "next/navigation";

export default function NewRuhPage() {
  redirect("/dashboard/incidents/new?type=ULYKKE");
}
