export type SyncErrorCopy = {
  title: string;
  hint: string;
};

const FIELD_LABELS: Array<[RegExp, string]> = [
  [/projectManager(?:\.id)?/gi, "prosjektleder"],
  [/customer(?:\.id)?/gi, "kunde"],
  [/activity(?:\.id)?/gi, "aktivitet"],
  [/employee(?:\.id)?/gi, "ansatt"],
  [/salaryType(?:\.id)?/gi, "timeart"],
  [/mainProject(?:\.id)?/gi, "hovedprosjekt"],
  [/deliveryDate/gi, "leveringsdato"],
];

export function formatSyncSubject(input: {
  employee?: string | null;
  project?: string | null;
  date?: string | null;
  hours?: number | null;
  product?: string | null;
  quantity?: number | null;
}): string | null {
  const parts: string[] = [];
  if (input.employee?.trim()) parts.push(input.employee.trim());
  if (input.project?.trim()) parts.push(input.project.trim());
  if (input.date) parts.push(input.date.slice(0, 10));
  if (typeof input.hours === "number") parts.push(`${trimNumber(input.hours)} t`);
  if (input.product?.trim()) {
    const qty = typeof input.quantity === "number" ? `${trimNumber(input.quantity)} × ` : "";
    parts.push(`${qty}${input.product.trim()}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function syncLogStatusRank(status: string): number {
  if (status === "ERROR") return 0;
  if (status === "PENDING") return 1;
  return 2;
}

export function canRetrySyncJob(status: string, lastError: string | null): boolean {
  return status === "ERROR" || (status === "PENDING" && Boolean(lastError));
}

export function humanizeAccountingSyncError(raw: string | null): SyncErrorCopy | null {
  if (!raw?.trim()) return null;
  const original = raw.trim();
  const text = tidyTechnicalDetail(original);
  const lower = `${original} ${text}`.toLowerCase();

  if (lower.includes("projectmanager") || lower.includes("prosjektleder")) {
    return {
      title: "Tripletex krever en prosjektleder",
      hint: "Koble integrasjonen på nytt under Innstillinger, slik at innlogget ansatt kan være prosjektleder.",
    };
  }
  if (lower.includes("ikke koblet til tripletex")) {
    return {
      title: "Den ansatte er ikke koblet til Tripletex",
      hint: "Koble e-post eller ansattnummer under Innstillinger → Regnskap, så timene kommer på riktig timeliste.",
    };
  }
  if (lower.includes("timeaktivitet") || (lower.includes("aktivitet") && lower.includes("mappet"))) {
    return {
      title: "Aktivitet for timer er ikke valgt",
      hint: "Velg ordinær tid og overtid under Innstillinger → Regnskap.",
    };
  }
  if (lower.includes("ikke synket til tripletex") || lower.includes("fraværsprosjekt")) {
    return {
      title: "Prosjektet er ikke kommet inn i Tripletex ennå",
      hint: "Timene sendes automatisk når prosjektet er opprettet. Du kan også prøve igjen.",
    };
  }
  if (lower.includes("mangler tripletex-kunde") || lower.includes("varelinje")) {
    return {
      title: "Jobben mangler kunde i Tripletex",
      hint: "Timer går likevel på timelisten. Vare, maskin og reise krever en kunde før de kan faktureres.",
    };
  }
  if (lower.includes("godkjennes før")) {
    return {
      title: "Timene er ikke godkjent ennå",
      hint: "Godkjenn dagen først. Deretter sendes den til Tripletex av seg selv.",
    };
  }
  if (lower.includes("econnrefused") || lower.includes("redis")) {
    return {
      title: "Sendingen venter i køen",
      hint: "Vi prøver igjen automatisk. Du trenger ikke gjøre noe.",
    };
  }
  if (lower.includes("401") || lower.includes("sesjon")) {
    return {
      title: "Tripletex-innloggingen er utløpt",
      hint: "Gå til Innstillinger → Regnskap og koble til på nytt.",
    };
  }
  if (lower.includes("403")) {
    return {
      title: "Tripletex avviste tilgangen",
      hint: "Sjekk at tokenet har rettigheter til prosjekt, timeliste og ordre.",
    };
  }
  if (lower.includes("startdato") || lower.includes("før denne datoen") || lower.includes("before this date")) {
    return {
      title: "Timene er før prosjektets startdato i Tripletex",
      hint: "Startdatoen flyttes automatisk bakover. Trykk Prøv igjen.",
    };
  }
  if (lower.includes("deliverydate") || lower.includes("leveringsdato")) {
    return {
      title: "Leveringsdato manglet i Tripletex",
      hint: "Vare, maskin og reise sendes nå med datoen de ble registrert. Prøv igjen.",
    };
  }
  if (/\b422\b/.test(original) || lower.includes("validering")) {
    return {
      title: "Tripletex avviste opplysningene",
      hint: text.length > 8 ? text : "Sjekk at prosjekt, kunde og aktivitet er satt, og prøv igjen.",
    };
  }
  return {
    title: "Kunne ikke sende til Tripletex",
    hint: text.length > 180 ? `${text.slice(0, 177)}…` : text,
  };
}

function tidyTechnicalDetail(raw: string): string {
  let text = raw.replace(/^Tripletex API-feil \d+:\s*/i, "").trim();
  for (const [pattern, label] of FIELD_LABELS) {
    text = text.replace(pattern, label);
  }
  return text.replace(/\s+/g, " ").trim();
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
