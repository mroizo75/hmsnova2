const ONLINE_MS = 5 * 60 * 1000;

export function formatLastSeen(
  value: string | Date | null | undefined,
  now = new Date(),
): { label: string; online: boolean } {
  if (!value) return { label: "Ikke registrert", online: false };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Ikke registrert", online: false };
  if (now.getTime() - date.getTime() < ONLINE_MS) return { label: "Inne nå", online: true };
  return {
    label: date.toLocaleString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    online: false,
  };
}
