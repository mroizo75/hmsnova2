"use client";

import * as React from "react";
import { Mic, Square, Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";
import { useToast } from "@/hooks/use-toast";

function appendTranscript(current: string, incoming: string): string {
  const trimmedCurrent = current.trim();
  const trimmedIncoming = incoming.trim();
  if (!trimmedIncoming) return current;
  if (!trimmedCurrent) return trimmedIncoming;
  const needsSpace = !trimmedCurrent.endsWith(".");
  return `${trimmedCurrent}${needsSpace ? " " : " "}${trimmedIncoming}`;
}

type VoiceTextareaProps = React.ComponentProps<"textarea">;

export const VoiceTextarea = React.forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({ className, onChange, value, defaultValue, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const { aiEnabled } = useTenantNavContext();
    const { toast } = useToast();
    const [recording, setRecording] = React.useState(false);
    const [transcribing, setTranscribing] = React.useState(false);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const applyText = React.useCallback(
      (incoming: string) => {
        const el = innerRef.current;
        const current =
          typeof value === "string"
            ? value
            : el?.value ?? (typeof defaultValue === "string" ? defaultValue : "");
        const next = appendTranscript(current, incoming);
        if (onChange) {
          const event = {
            target: { value: next, name: props.name ?? "" },
            currentTarget: { value: next, name: props.name ?? "" },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        }
        if (el && value === undefined) {
          el.value = next;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      [defaultValue, onChange, props.name, value]
    );

    const stopRecording = React.useCallback(() => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      setRecording(false);
    }, []);

    const startRecording = React.useCallback(async () => {
      if (!aiEnabled || disabled || transcribing) return;
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        toast({
          variant: "destructive",
          title: "Mikrofon støttes ikke",
          description: "Nettleseren støtter ikke tale-til-tekst.",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          chunksRef.current = [];
          if (blob.size === 0) return;
          setTranscribing(true);
          try {
            const form = new FormData();
            form.append("file", blob, "speech.webm");
            const response = await fetch("/api/ai/transcribe", {
              method: "POST",
              body: form,
            });
            const payload = (await response.json()) as { text?: string; message?: string };
            if (!response.ok) {
              throw new Error(payload.message || "Kunne ikke transkribere tale");
            }
            if (payload.text) {
              applyText(payload.text);
            }
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Tale-til-tekst feilet",
              description: error instanceof Error ? error.message : "Ukjent feil",
            });
          } finally {
            setTranscribing(false);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setRecording(true);
      } catch {
        toast({
          variant: "destructive",
          title: "Ingen mikrofontilgang",
          description: "Gi tillatelse til mikrofon for å diktere tekst.",
        });
      }
    }, [aiEnabled, applyText, disabled, toast, transcribing]);

    React.useEffect(() => {
      return () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      };
    }, []);

    return (
      <div className="relative">
        <Textarea
          ref={setRefs}
          className={cn(aiEnabled ? "pr-11" : undefined, className)}
          onChange={onChange}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          {...props}
        />
        {aiEnabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1.5 h-8 w-8 bg-transparent text-foreground"
            disabled={disabled || transcribing}
            aria-label={recording ? "Stopp opptak" : "Dikter tekst"}
            onClick={() => {
              if (recording) {
                stopRecording();
                return;
              }
              void startRecording();
            }}
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : recording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>
    );
  }
);

VoiceTextarea.displayName = "VoiceTextarea";
