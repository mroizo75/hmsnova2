"use client";

import { useRef, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  initialValue?: string;
}

export function SignaturePad({ onSave, initialValue }: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (initialValue && signatureRef.current) {
      signatureRef.current.fromDataURL(initialValue);
      setIsEmpty(false);
    }
  }, [initialValue]);

  function handleClear() {
    signatureRef.current?.clear();
    setIsEmpty(true);
  }

  function handleSave() {
    if (signatureRef.current) {
      // Sjekk om canvas er tom
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "❌ Tom signatur",
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
      <div className="border-2 border-dashed rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={signatureRef}
          onBegin={handleBegin}
          canvasProps={{
            width: 600,
            height: 200,
            className: "w-full cursor-crosshair touch-none",
            style: { touchAction: 'none', maxWidth: '100%', height: 'auto' },
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
        ✍️ Signer med mus, touchpad eller finger. Trykk "Bekreft signatur" når du er ferdig.
      </p>
    </div>
  );
}

