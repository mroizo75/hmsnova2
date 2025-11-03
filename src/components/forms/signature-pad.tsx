"use client";

import { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  initialValue?: string;
}

export function SignaturePad({ onSave, initialValue }: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (initialValue && signatureRef.current) {
      signatureRef.current.fromDataURL(initialValue);
    }
  }, [initialValue]);

  function handleClear() {
    signatureRef.current?.clear();
  }

  function handleSave() {
    if (signatureRef.current) {
      const dataUrl = signatureRef.current.toDataURL();
      onSave(dataUrl);
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg bg-white">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              className: "w-full h-40 cursor-crosshair",
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Tøm
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Bekreft signatur
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Signer med mus, touchpad eller finger
        </p>
      </div>
    </Card>
  );
}

