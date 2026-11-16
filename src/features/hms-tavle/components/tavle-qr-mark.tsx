"use client";

import { useEffect, useState } from "react";
import { boardUrl } from "@/features/hms-tavle/lib/public-board-url";

/** Adressen telefonen skal åpne: verten tavlen vises på, ikke intern port. */
export function useBoardPath(path: string, appUrl: string) {
  const [url, setUrl] = useState(() => boardUrl(appUrl, path));
  useEffect(() => {
    setUrl(boardUrl(window.location.origin, path));
  }, [path]);
  return url;
}

interface Props {
  url: string;
  size: number;
}

/** QR i faktisk visningsstørrelse. Skaleres ikke ned i CSS, for da leser kameraet feil. */
export function TavleQrMark({ url, size }: Props) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    const pixels = Math.max(size, Math.round(size * (window.devicePixelRatio || 1)));
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(url, {
        width: pixels,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then((data: string) => {
        if (!cancelled) setSrc(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!src) {
    return <div className="bg-white/20" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={src}
      alt="QR-kode"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="block"
    />
  );
}
