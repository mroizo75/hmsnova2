"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import {
  CONTRACT_BINDING_LABEL,
  CONTRACT_TERMS_LABEL,
  CONTRACT_WITHDRAWAL_LABEL,
} from "@/lib/contract-terms";

type Props = {
  acceptedWithdrawal: boolean;
  acceptedBinding: boolean;
  acceptedTerms: boolean;
  onAcceptedWithdrawal: (value: boolean) => void;
  onAcceptedBinding: (value: boolean) => void;
  onAcceptedTerms: (value: boolean) => void;
  compact?: boolean;
};

export function ContractAcceptanceFields({
  acceptedWithdrawal,
  acceptedBinding,
  acceptedTerms,
  onAcceptedWithdrawal,
  onAcceptedBinding,
  onAcceptedTerms,
  compact = false,
}: Props) {
  const uid = useId();
  const textClass = compact ? "text-xs" : "text-sm";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
        <p className={`font-semibold ${textClass}`}>
          Viktige vilkår — les før du oppretter konto
        </p>
        <ul className={`${textClass} mt-2 list-disc space-y-1 pl-4 text-foreground`}>
          <li>Ingen gratis prøveperiode. Du får 14 dagers avtalt angrefrist fra i dag.</li>
          <li>
            Si opp kostnadsfritt innen 14 dager ved skriftlig e-post til{" "}
            <strong>post@hmsnova.no</strong>.
          </li>
          <li>
            Sier du ikke opp innen 14 dager, binder bedriften seg i <strong>12 måneder</strong>.
          </li>
          <li>
            Etter bindingstiden er oppsigelsestiden <strong>3 måneder</strong> skriftlig.
          </li>
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className={`font-medium ${textClass}`}>Angrerettserklæring</p>
          <a
            href="/api/documents/angrerett"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
          >
            Åpne PDF
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox
            id={`acceptWithdrawal-${uid}`}
            checked={acceptedWithdrawal}
            onCheckedChange={(checked) => onAcceptedWithdrawal(checked === true)}
          />
          <Label htmlFor={`acceptWithdrawal-${uid}`} className={`${textClass} cursor-pointer leading-snug`}>
            {CONTRACT_WITHDRAWAL_LABEL}
          </Label>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className={`font-medium ${textClass}`}>Abonnementsavtale</p>
          <a
            href="/api/documents/abonnementsavtale"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
          >
            Åpne PDF
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox
            id={`acceptTerms-${uid}`}
            checked={acceptedTerms}
            onCheckedChange={(checked) => onAcceptedTerms(checked === true)}
          />
          <Label htmlFor={`acceptTerms-${uid}`} className={`${textClass} cursor-pointer leading-snug`}>
            {CONTRACT_TERMS_LABEL}
          </Label>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox
            id={`acceptBinding-${uid}`}
            checked={acceptedBinding}
            onCheckedChange={(checked) => onAcceptedBinding(checked === true)}
          />
          <Label htmlFor={`acceptBinding-${uid}`} className={`${textClass} cursor-pointer leading-snug`}>
            {CONTRACT_BINDING_LABEL}
          </Label>
        </div>
      </div>
    </div>
  );
}
