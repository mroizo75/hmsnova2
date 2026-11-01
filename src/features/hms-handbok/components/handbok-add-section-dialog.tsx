"use client";

import { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createCustomHandbookSection } from "@/server/actions/hms-handbok.actions";
import type { HandbookSectionData } from "@/server/actions/hms-handbok.actions";
import { HANDBOOK_PART_LABELS, type HandbookPart } from "@/lib/handbook-parts";
import {
  HANDBOOK_CHAPTERS,
  groupHandbookChapters,
  nextCustomSectionNumber,
  type HandbookChapterNumber,
  type HandbookNumberStyle,
} from "@/lib/handbook-outline";

const END_PLACEMENT = "__end";

interface HandbokAddSectionDialogProps {
  versionId: string;
  isDraft: boolean;
  sections: HandbookSectionData[];
  activePart: "ALL" | HandbookPart;
}

function defaultChapter(part: "ALL" | HandbookPart): HandbookChapterNumber {
  if (part === "HR") return "8";
  if (part === "KS") return "2";
  return "1";
}

export function HandbokAddSectionDialog({
  versionId,
  isDraft,
  sections,
  activePart,
}: HandbokAddSectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chapter, setChapter] = useState<HandbookChapterNumber>(defaultChapter(activePart));
  const [style, setStyle] = useState<HandbookNumberStyle>("decimal");
  const [part, setPart] = useState<HandbookPart>(activePart === "KS" ? "KS" : "HMS");
  const [insertAfterId, setInsertAfterId] = useState(END_PLACEMENT);
  const [title, setTitle] = useState("");
  const [legalRef, setLegalRef] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const chapterSections = useMemo(() => {
    return groupHandbookChapters(sections).find((item) => item.number === chapter)?.sections ?? [];
  }, [sections, chapter]);

  const previewNumber = nextCustomSectionNumber(
    chapterSections.map((section) => section.sectionNumber),
    chapter,
    style,
  );

  function openDialog() {
    if (!isDraft) {
      toast({
        title: "Opprett et utkast først",
        description: "Egne punkter legges inn i utkastet, slik at nummereringen godkjennes sammen med resten av håndboken.",
      });
      return;
    }
    const nextChapter = defaultChapter(activePart);
    setChapter(nextChapter);
    setStyle("decimal");
    setPart(nextChapter === "8" ? "HR" : activePart === "KS" ? "KS" : "HMS");
    setInsertAfterId(END_PLACEMENT);
    setTitle("");
    setLegalRef("");
    setContent("");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await createCustomHandbookSection({
      versionId,
      chapter,
      style,
      part: chapter === "8" ? "HR" : part,
      title,
      legalRef: legalRef.trim() || undefined,
      content: content.trim() || undefined,
      insertAfterSectionId: style === "letter" && insertAfterId !== END_PLACEMENT ? insertAfterId : null,
    });
    setSaving(false);
    if (!result.success) {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Punkt lagt til",
      description: previewNumber ? `Punktet får nummer ${previewNumber}. Standardpunktene beholder nummeret sitt.` : "Punktet er lagt inn.",
    });
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["hms-handbok"] });
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={openDialog}>
        <Plus className="h-4 w-4" />
        Legg til eget punkt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Legg til eget punkt</DialogTitle>
            <DialogDescription>
              Kapitlene følger ISO 9001 og ISO 45001, med internkontrollforskriften § 5.
              Et desimalt punkt blir {previewNumber ?? "neste ledige nummer"}. En bokstav, som 2.a, kan settes inn uten å flytte standardpunktene.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handbok-custom-chapter">Kapittel</Label>
              <Select
                value={chapter}
                onValueChange={(value) => {
                  const next = value as HandbookChapterNumber;
                  setChapter(next);
                  setInsertAfterId(END_PLACEMENT);
                  if (next === "8") setPart("HR");
                  else if (part === "HR") setPart("HMS");
                }}
              >
                <SelectTrigger id="handbok-custom-chapter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HANDBOOK_CHAPTERS.map((item) => (
                    <SelectItem key={item.number} value={item.number}>
                      {item.number}. {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="handbok-custom-style">Nummerering</Label>
              <Select value={style} onValueChange={(value) => setStyle(value as HandbookNumberStyle)}>
                <SelectTrigger id="handbok-custom-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decimal">Desimal, for eksempel {chapter}.1</SelectItem>
                  <SelectItem value="letter">Bokstav, for eksempel {chapter}.a</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {style === "decimal"
                  ? "Legges etter siste nummererte punkt i kapitlet. 2.1, 2.2 og de andre standardpunktene endres ikke."
                  : "Bokstaven settes der du velger, for eksempel mellom 2.2 og 2.3, uten å endre de andre numrene."}
              </p>
            </div>
            {style === "letter" && (
              <div className="space-y-2">
                <Label htmlFor="handbok-custom-placement">Plassering</Label>
                <Select value={insertAfterId} onValueChange={setInsertAfterId}>
                  <SelectTrigger id="handbok-custom-placement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={END_PLACEMENT}>Til slutt i kapitlet</SelectItem>
                    {chapterSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Etter {section.sectionNumber} {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {chapter !== "8" && (
              <div className="space-y-2">
                <Label htmlFor="handbok-custom-part">Del</Label>
                <Select value={part} onValueChange={(value) => setPart(value as HandbookPart)}>
                  <SelectTrigger id="handbok-custom-part">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HMS">{HANDBOOK_PART_LABELS.HMS}</SelectItem>
                    <SelectItem value="KS">{HANDBOOK_PART_LABELS.KS}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="handbok-custom-title">Tittel</Label>
              <Input
                id="handbok-custom-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="F.eks. Arbeid i høyden"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handbok-custom-legal">Lovhenvisning (valgfritt)</Label>
              <Input
                id="handbok-custom-legal"
                value={legalRef}
                onChange={(event) => setLegalRef(event.target.value)}
                placeholder="F.eks. AML § 3-2"
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handbok-custom-content">Innhold (valgfritt)</Label>
              <Textarea
                id="handbok-custom-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Kort beskrivelse. Du kan formatere teksten etterpå."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || title.trim().length < 2 || !previewNumber}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Legg til {previewNumber ?? ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
