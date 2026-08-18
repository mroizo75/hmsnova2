"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/shared/signature-pad";
import { signDocument, removeDocumentSignature } from "@/server/actions/document-signature.actions";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Trash2, ShieldCheck, UserCheck, FileCheck } from "lucide-react";
import type { DocumentSignerRole } from "@prisma/client";

interface SignatureData {
  id: string;
  role: DocumentSignerRole;
  signatureImg: string;
  comment: string | null;
  signedAt: string | Date;
  signedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface DocumentSignatureSectionProps {
  documentId: string;
  signatures: SignatureData[];
  canSign: boolean;
  canApprove: boolean;
  currentUserId: string;
}

const ROLE_CONFIG: Record<DocumentSignerRole, { label: string; icon: typeof PenLine; color: string }> = {
  UTARBEIDET_AV: { label: "Utarbeidet av", icon: PenLine, color: "bg-blue-100 text-blue-800" },
  KONTROLLERT_AV: { label: "Kontrollert av", icon: UserCheck, color: "bg-yellow-100 text-yellow-800" },
  GODKJENT_AV: { label: "Godkjent av", icon: ShieldCheck, color: "bg-green-100 text-green-800" },
};

export function DocumentSignatureSection({
  documentId,
  signatures,
  canSign,
  canApprove,
  currentUserId,
}: DocumentSignatureSectionProps) {
  const [showSignForm, setShowSignForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DocumentSignerRole>("UTARBEIDET_AV");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const availableRoles = Object.entries(ROLE_CONFIG).filter(([role]) => {
    if (role === "GODKJENT_AV" && !canApprove) return false;
    return true;
  });

  function handleSign(dataUrl: string) {
    startTransition(async () => {
      const result = await signDocument({
        documentId,
        role: selectedRole,
        signatureImg: dataUrl,
        comment: comment || undefined,
      });

      if (result.success) {
        toast({ title: "Signatur registrert", description: `Dokumentet er signert som ${ROLE_CONFIG[selectedRole].label.toLowerCase()}` });
        setShowSignForm(false);
        setComment("");
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleRemove(signatureId: string) {
    startTransition(async () => {
      const result = await removeDocumentSignature(signatureId);
      if (result.success) {
        toast({ title: "Signatur fjernet" });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  const requiredRoles: DocumentSignerRole[] = ["UTARBEIDET_AV", "KONTROLLERT_AV", "GODKJENT_AV"];
  const signedRoles = new Set(signatures.map((s) => s.role));
  const allSigned = requiredRoles.every((r) => signedRoles.has(r));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Signaturside
            </CardTitle>
            <CardDescription>
              IK-HMS § 5: Dokumenter skal signeres av utarbeider, kontrollør og godkjenner
            </CardDescription>
          </div>
          {allSigned && (
            <Badge className="bg-green-100 text-green-800">Fullstendig signert</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signaturoversikt */}
        <div className="grid gap-4 md:grid-cols-3">
          {requiredRoles.map((role) => {
            const config = ROLE_CONFIG[role];
            const sig = signatures.find((s) => s.role === role);
            const Icon = config.icon;

            return (
              <div
                key={role}
                className={`border rounded-lg p-4 space-y-3 ${sig ? "border-green-200 bg-green-50/50" : "border-dashed border-gray-300"}`}
              >
                <div className="flex items-center justify-between">
                  <Badge className={config.color}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  {sig && canApprove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(sig.id)}
                      disabled={isPending}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {sig ? (
                  <>
                    <div className="bg-white border rounded p-2">
                      <Image
                        src={sig.signatureImg}
                        alt={`Signatur: ${sig.signedBy.name || sig.signedBy.email}`}
                        width={240}
                        height={80}
                        className="w-full h-auto object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{sig.signedBy.name || sig.signedBy.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sig.signedAt).toLocaleDateString("nb-NO", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {sig.comment && (
                        <p className="text-xs text-muted-foreground italic">{sig.comment}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Mangler signatur
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signer-skjema */}
        {canSign && !showSignForm && (
          <Button onClick={() => setShowSignForm(true)} variant="outline" className="w-full">
            <PenLine className="h-4 w-4 mr-2" />
            Signer dokument
          </Button>
        )}

        {showSignForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Signaturrolle</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as DocumentSignerRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kommentar (valgfritt)</Label>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="F.eks. 'Gjennomgått og godkjent'"
                />
              </div>
            </div>

            <SignaturePad onSave={handleSign} />

            <Button
              variant="ghost"
              onClick={() => setShowSignForm(false)}
              className="w-full"
            >
              Avbryt
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
