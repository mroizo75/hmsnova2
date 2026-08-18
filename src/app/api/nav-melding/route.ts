/**
 * NAV Yrkesskademelding PDF-generator
 *
 * Hjemmel: Ftrl. § 13-14 – Plikt til å melde arbeidsulykker og yrkessykdom til NAV.
 * AML § 5-2 – Rapporteringsplikt til Arbeidstilsynet ved alvorlig ulykke.
 *
 * Genererer et utfylt PDF-dokument basert på eksisterende Incident-data.
 * PDF-en tilsvarer NAV-skjema 13-07 (Skademelding ved arbeidsulykke/yrkessykdom).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf, type PdfSection, type PdfContent } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  ULYKKE: "Arbeidsulykke",
  YRKESSYKDOM: "Yrkessykdom / arbeidsrelatert sykdom",
  NESTEN: "Nestenulykke",
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canReadIncidents) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get("incidentId");
  const exporterNavn = searchParams.get("exporterNavn") ?? "";
  const eksporterTittel = searchParams.get("eksporterTittel") ?? "";
  const tilleggsInfo = searchParams.get("tilleggsInfo") ?? "";

  if (!incidentId) {
    return NextResponse.json({ error: "incidentId mangler" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, tenantId },
    include: {
      tenant: {
        select: {
          name: true,
          orgNumber: true,
          address: true,
          contactPhone: true,
          city: true,
          postalCode: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Hendelse ikke funnet" }, { status: 404 });
  }

  if (incident.type !== "ULYKKE" && incident.type !== "YRKESSYKDOM") {
    return NextResponse.json(
      { error: "Kun ULYKKE og YRKESSYKDOM kan meldes til NAV" },
      { status: 400 }
    );
  }

  const fmtDate = (d: Date | string | null | undefined) =>
    d ? format(new Date(d), "d. MMMM yyyy", { locale: nb }) : "–";

  const now = new Date();
  const tenant = incident.tenant;

  const advarselContent: PdfContent[] = [];
  if (incident.isFatal) {
    advarselContent.push({
      type: "alert",
      text: "ALVORLIG ULYKKE – Meld straks til Arbeidstilsynet (815 48 222) og politiet (AML § 5-2 (1)).",
      severity: "danger",
    });
  }
  advarselContent.push({
    type: "alert",
    text: `Send dette skjemaet til NAV via nav.no/arbeidsgiver/skademelding eller Altinn skjema 13-07. Frist: snarest, senest innen 12 måneder fra ulykken skjedde (Ftrl. § 13-14).`,
    severity: "info",
  });

  const sections: PdfSection[] = [
    {
      content: advarselContent,
    },
    {
      title: "Del A – Arbeidsgiver",
      legalRef: "Ftrl. § 13-14 (1)",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Bedriftens navn", tenant.name],
            ["Organisasjonsnummer", tenant.orgNumber ?? "–"],
            ["Adresse", [tenant.address, tenant.postalCode, tenant.city].filter(Boolean).join(", ") || "–"],
            ["Telefon", tenant.contactPhone ?? "–"],
            ["Innmelder – navn", exporterNavn || "(ikke fylt ut)"],
            ["Innmelder – tittel", eksporterTittel || "(ikke fylt ut)"],
            ["Dato for melding", fmtDate(now)],
          ],
        },
      ],
    },
    {
      title: "Del B – Hendelsen",
      legalRef: "Ftrl. § 13-14 (2)",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Hendelsestype", TYPE_LABELS[incident.type] ?? incident.type],
            ["Referansenummer (internt)", incident.avviksnummer ?? "–"],
            ["Dato og tidspunkt", fmtDate(incident.occurredAt)],
            ["Sted/lokasjon", incident.location ?? "–"],
            ["Tittel", incident.title],
            ["Vitne", incident.witnessName ?? "–"],
          ],
        },
        {
          type: "paragraph",
          text: `Beskrivelse av hendelsen:\n${incident.description}`,
        },
        ...(incident.immediateAction
          ? [{ type: "paragraph" as const, text: `Umiddelbare tiltak:\n${incident.immediateAction}` }]
          : []),
      ],
    },
    {
      title: "Del C – Skadeomfang",
      legalRef: "Ftrl. § 13-14 (2)",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Skadetype", incident.injuryType ?? "–"],
            ["Skadebeskrivelse", incident.injuryDescription ?? "–"],
            ["Medisinsk behandling nødvendig", incident.medicalAttentionRequired ? "Ja" : "Nei"],
            ["Tapt arbeidstid (fraværsulykke)", incident.isLostTimeIncident ? "Ja" : "Nei"],
            ["Tapte arbeidsdager", incident.lostWorkdays?.toString() ?? "–"],
            ["Dødelig utfall", incident.isFatal ? "Ja – meld straks til Arbeidstilsynet" : "Nei"],
          ],
        },
        ...(incident.injuryDescription
          ? [{ type: "paragraph" as const, text: `Skadedetaljer:\n${incident.injuryDescription}` }]
          : []),
      ],
    },
    {
      title: "Del D – Den skadelidte",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Navn", "(Hentes fra personopplysningene i bedriftens HR-system)"],
            ["Fødselsnummer", "(Fylles inn manuelt for personvernhensyn – ikke lagret i HMS Nova)"],
            ["Stilling", "(Fylles inn manuelt)"],
            ["Ansettelsesforhold", "(Fylles inn manuelt)"],
          ],
        },
        {
          type: "alert",
          text: "Fødselsnummer og personlige opplysninger om den skadelidte fylles inn manuelt på NAV sine nettsider av personvernhensyn (GDPR art. 9 – særlige kategorier).",
          severity: "info",
        },
      ],
    },
  ];

  if (tilleggsInfo.trim()) {
    sections.push({
      title: "Tilleggsinformasjon",
      content: [{ type: "paragraph", text: tilleggsInfo.trim() }],
    });
  }

  sections.push({
    title: "Neste steg",
    content: [
      {
        type: "table",
        headers: ["Steg", "Handling", "Frist"],
        rows: [
          ["1", "Send dette skjemaet til NAV (nav.no/arbeidsgiver eller Altinn 13-07)", "Snarest"],
          ...(incident.isFatal
            ? [["0 – HASTER", "Ring Arbeidstilsynet: 815 48 222 + politiet", "Straks"]]
            : []),
          ["2", "Informer verneombud og AMU (AML § 6-2)", "Innen 1 uke"],
          ["3", "Gjennomfør årsaksanalyse og tiltak i HMS Nova", "Innen 30 dager"],
        ],
      },
    ],
  });

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "NAV Yrkesskademelding",
    title: "Yrkesskademelding til NAV",
    subtitle: `${TYPE_LABELS[incident.type]} · ${fmtDate(incident.occurredAt)} · Ref: ${incident.avviksnummer ?? incident.id}`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: [tenant.address, tenant.postalCode, tenant.city].filter(Boolean).join(", ") || null,
      logoUrl: tenant.logoUrl,
    },
    generatedBy: session.user.name ?? session.user.email ?? "Ukjent",
    generatedAt: now,
    legalReference: "Ftrl. § 13-14, AML § 5-2",
    sections,
  });

  const filename = `NAV-yrkesskademelding-${incident.avviksnummer ?? incidentId}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
