"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, FileEdit, BookOpen, Shield, GraduationCap, ClipboardCheck, Search } from "lucide-react"

interface ImprovementLogEntry {
  id: string
  changeType: string
  description: string
  legalReference: string | null
  changedAt: Date | string
  effectReviewed: boolean
  effectNote: string | null
  followUpDate: Date | string | null
}

interface ImprovementTimelineProps {
  entries: ImprovementLogEntry[]
}

const CHANGE_TYPE_META: Record<string, { label: string; icon: typeof FileEdit }> = {
  ROUTINE_UPDATED: { label: "Rutine oppdatert", icon: FileEdit },
  ROUTINE_CREATED: { label: "Ny rutine opprettet", icon: BookOpen },
  TRAINING_ADDED: { label: "Opplæring lagt til", icon: GraduationCap },
  RISK_REASSESSED: { label: "Risiko revurdert", icon: Shield },
  SJA_UPDATED: { label: "SJA oppdatert", icon: ClipboardCheck },
  INSPECTION_SCHEDULED: { label: "Inspeksjon planlagt", icon: Search },
  HANDBOOK_REVIEWED: { label: "Håndbok gjennomgått", icon: BookOpen },
  MEASURE_ADDED: { label: "Tiltak lagt til", icon: CheckCircle2 },
}

export function ImprovementTimeline({ entries }: ImprovementTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Ingen forbedringshistorikk ennå. Implementer et forslag for å starte.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const meta = CHANGE_TYPE_META[entry.changeType] ?? {
          label: entry.changeType,
          icon: CheckCircle2,
        }
        const Icon = meta.icon
        const date = new Date(entry.changedAt)
        const needsFollowUp =
          entry.followUpDate &&
          !entry.effectReviewed &&
          new Date(entry.followUpDate) <= new Date()

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 w-px bg-border mt-1" />
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">{meta.label}</span>
                {entry.effectReviewed && (
                  <Badge variant="secondary" className="text-xs">
                    Effekt vurdert
                  </Badge>
                )}
                {needsFollowUp && (
                  <Badge variant="destructive" className="text-xs">
                    Venter oppfølging
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
              {entry.legalReference && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hjemmel: {entry.legalReference}
                </p>
              )}
              {entry.effectNote && (
                <p className="text-xs text-green-600 mt-0.5">
                  Effekt: {entry.effectNote}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {date.toLocaleDateString("nb-NO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
