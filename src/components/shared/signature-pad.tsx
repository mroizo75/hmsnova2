"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  initialValue?: string;
}

export function SignaturePad({ onSave, initialValue }: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const { toast } = useToast();

  const resizeCanvas = useCallback(() => {
    if (!containerRef.current || !signatureRef.current) return;
    const canvas = signatureRef.current.getCanvas();
    const container = containerRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.offsetWidth;
    const height = 200;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext("2d")?.scale(ratio, ratio);

    if (initialValue) {
      signatureRef.current.fromDataURL(initialValue, { width, height });
      setIsEmpty(false);
    }
  }, [initialValue]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  function handleClear() {
    signatureRef.current?.clear();
    setIsEmpty(true);
  }

  function handleSave() {
    if (signatureRef.current) {
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "Tom signatur",
          description: "Du må signere før du kan bekrefte",
          variant: "destructive",
        });
        return;
      }
      const dataUrl = signatureRef.current.toDataURL();
      onSave(dataUrl);
      setIsEmpty(false);
    }
  }

  function handleBegin() {
    setIsEmpty(false);
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="border-2 border-dashed rounded-lg bg-white overflow-hidden"
      >
        <SignatureCanvas
          ref={signatureRef}
          onBegin={handleBegin}
          canvasProps={{
            className: "cursor-crosshair touch-none",
            style: { touchAction: "none", width: "100%", height: "200px" },
          }}
          backgroundColor="rgb(255, 255, 255)"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="flex-1"
          disabled={isEmpty}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Tøm
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          Bekreft signatur
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Signer med mus, touchpad eller finger. Trykk &quot;Bekreft signatur&quot; når du er ferdig.
      </p>
    </div>
  );
}
