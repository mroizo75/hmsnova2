"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateServiceRequest } from "@/server/actions/admin-service-request.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type ServiceRequest = {
  id: string;
  type: string;
  status: string;
  description: string | null;
  price: number | null;
  notes: string | null;
  completedAt: Date | null;
  createdAt: Date;
  tenant: { id: string; name: string; contactEmail: string | null };
};

const TYPE_LABELS: Record<string, string> = {
  FULL_SETUP: "Komplett HMS-oppsett",
  RISK_ASSESSMENT: "Risikovurdering",
  ROUTINE_SETUP: "Rutiner tilpasset",
  HANDBOOK_SETUP: "HMS-håndbok",
  REGULATORY_PROFILE: "Virksomhetsprofil",
  CUSTOM: "Annet",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Venter",
  QUOTED: "Pristilbud sendt",
  ACCEPTED: "Akseptert",
  IN_PROGRESS: "Under arbeid",
  COMPLETED: "Fullført",
  CANCELLED: "Kansellert",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  QUOTED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

function EditDialog({ request }: { request: ServiceRequest }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(request.status);
  const [price, setPrice] = useState(request.price?.toString() ?? "");
  const [notes, setNotes] = useState(request.notes ?? "");

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateServiceRequest({
        id: request.id,
        status,
        price: price ? parseInt(price, 10) : null,
        notes: notes || null,
      });
      if (result.success) {
        toast({ title: "Oppdatert", className: "bg-green-50 border-green-200" });
        router.refresh();
      }
    } catch {
      toast({ variant: "destructive", title: "Feil ved oppdatering" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rediger forespørsel</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Bedrift</p>
          <p className="text-sm text-muted-foreground">{request.tenant.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Type</p>
          <p className="text-sm">{TYPE_LABELS[request.type] ?? request.type}</p>
        </div>
        {request.description && (
          <div>
            <p className="text-sm font-medium mb-1">Beskrivelse fra kunde</p>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Pris (øre)</label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="F.eks. 500000 (= 5000 kr)"
          />
          {price && (
            <p className="text-xs text-muted-foreground">
              = {(parseInt(price, 10) / 100).toLocaleString("nb-NO")} kr
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Interne notater</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Lagrer..." : "Lagre endringer"}
        </Button>
      </div>
    </DialogContent>
  );
}

export function ServiceRequestsTable({
  requests,
}: {
  requests: ServiceRequest[];
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bedrift</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pris</TableHead>
            <TableHead>Dato</TableHead>
            <TableHead className="text-right">Handling</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Ingen forespørsler ennå
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{request.tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.tenant.contactEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {TYPE_LABELS[request.type] ?? request.type}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[request.status] ?? ""}>
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {request.price
                    ? `${(request.price / 100).toLocaleString("nb-NO")} kr`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString("nb-NO")}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Rediger
                      </Button>
                    </DialogTrigger>
                    <EditDialog request={request} />
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
