import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "HMS Nova. Hele HMS-systemet er allerede skrevet.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/logo-nova.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#F6F5F1",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={logoSrc} width={220} height={110} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "1000px" }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              color: "#0F1C17",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Hele HMS-systemet er allerede skrevet.
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#0B6E4F", marginTop: 16 }}>
            Du fyller bare inn bedriften.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#46534D" }}>
          300 kr/mnd eks. mva · Ubegrenset brukere · www.hmsnova.no
        </div>
      </div>
    ),
    { ...size }
  );
}
