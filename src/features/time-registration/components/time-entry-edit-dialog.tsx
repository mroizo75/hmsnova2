"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTimeEntry } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TIME_TYPE_OPTIONS = [
  { value: "NORMAL", label: "Ordinær" },
  { value: "OVERTIME_50", label: "Overtid 50 %" },
  { value: "OVERTIME_40", label: "Overtid 40 %" },
  { value: "OVERTIME_100", label: "Overtid 100 %" },
  { value: "WEEKEND", label: "Helg/helligdag" },
  { value: "TRAVEL", label: "Reise/kjøring" },
  { value: "SICK_LEAVE", label: "Sykefravær" },
] as const;

interface TimeEntryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    date: Date;
    hours: number;
    timeType: string;
    comment: string | null;
    project: { name: string; code: string | null };
  };
  onSuccess: () => void;
}

export function TimeEntryEditDialog({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: TimeEntryEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [timeType, setTimeType] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (entry && open) {
      setDate(format(new Date(entry.date), "yyyy-MM-dd"));
      setHours(String(entry.hours));
      setTimeType(entry.timeType);
      setComment(entry.comment || "");
    }
  }, [entry, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(hours.replace(",", "."));
    if (isNaN(h) || h <= 0 || h > 24) {
      toast({ variant: "destructive", title: "Timer må være 0–24" });
      return;
    }
    setLoading(true);
    try {
      const res = await updateTimeEntry(entry.id, {
        date: new Date(date),
        hours: h,
        timeType,
        comment: comment.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: "Timer rettet" });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retting av timeregistrering</DialogTitle>
          <DialogDescription>
            Admin kan rette timer for ansatte. Endringer logges.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Dato</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Timer</Label>
            <Input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="7.5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select value={timeType} onValueChange={setTimeType} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Kommentar</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Valgfritt"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "..." : "Lagre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
