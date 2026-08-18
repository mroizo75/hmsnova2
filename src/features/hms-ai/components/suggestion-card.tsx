"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  acceptSuggestion,
  rejectSuggestion,
  markSuggestionImplemented,
} from "@/server/actions/improvement.actions"

interface SuggestionCardProps {
  suggestion: {
    id: string
    title: string
    description: string
    legalBasis: string | null
    priority: number
    status: string
    suggestionType: string
    pattern: {
      matchCount: number
      patternType: string
      severity: number
    }
  }
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [rejectNote, setRejectNote] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [loading, setLoading] = useState(false)
  const [implementNote, setImplementNote] = useState("")
  const [showImplement, setShowImplement] = useState(false)

  const priorityColor =
    suggestion.priority >= 4
      ? "destructive"
      : suggestion.priority >= 3
        ? "default"
        : "secondary"

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "Venter", variant: "default" },
    ACCEPTED: { label: "Akseptert", variant: "secondary" },
    REJECTED: { label: "Avvist", variant: "outline" },
    IMPLEMENTED: { label: "Implementert", variant: "secondary" },
  }

  const badge = statusBadge[suggestion.status] ?? statusBadge.PENDING

  async function handleAccept() {
    setLoading(true)
    await acceptSuggestion(suggestion.id)
    setLoading(false)
  }

  async function handleReject() {
    if (!rejectNote.trim()) return
    setLoading(true)
    await rejectSuggestion(suggestion.id, rejectNote)
    setLoading(false)
    setShowReject(false)
  }

  async function handleImplement() {
    if (!implementNote.trim()) return
    setLoading(true)
    await markSuggestionImplemented(suggestion.id, {
      description: implementNote,
    })
    setLoading(false)
    setShowImplement(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <CardTitle className="text-sm font-medium">
              {suggestion.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={priorityColor as "default"}>
              P{suggestion.priority}
            </Badge>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Skjul detaljer" : "Vis detaljer"}
        </button>

        {expanded && (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{suggestion.description}</p>
            {suggestion.legalBasis && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Scale className="h-3 w-3" />
                <span>{suggestion.legalBasis}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Basert på {suggestion.pattern.matchCount} registrerte hendelser
            </p>
          </div>
        )}

        {suggestion.status === "PENDING" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Aksepter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject(!showReject)}
              disabled={loading}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Avvis
            </Button>
          </div>
        )}

        {showReject && (
          <div className="space-y-2">
            <Textarea
              placeholder="Begrunn avvisningen..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
            />
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={loading}>
              Bekreft avvisning
            </Button>
          </div>
        )}

        {suggestion.status === "ACCEPTED" && (
          <div className="space-y-2">
            {!showImplement ? (
              <Button size="sm" onClick={() => setShowImplement(true)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Marker som implementert
              </Button>
            ) : (
              <>
                <Textarea
                  placeholder="Beskriv hva som ble endret..."
                  value={implementNote}
                  onChange={(e) => setImplementNote(e.target.value)}
                  rows={3}
                />
                <Button size="sm" onClick={handleImplement} disabled={loading}>
                  Lagre implementering
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
