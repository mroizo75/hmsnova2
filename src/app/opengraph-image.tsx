import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HMS Nova - HMS Nova bygger trygghet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#0ea5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
              color: "white",
            }}
          >
            HN
          </div>
          <span style={{ fontSize: "48px", fontWeight: 700, color: "white" }}>
            HMS Nova
          </span>
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Norges mest moderne HMS-system. Bygger trygghet gjennom digitalisering,
          automatisering og ISO 9001 compliance.
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px",
            fontSize: "20px",
            color: "#38bdf8",
          }}
        >
          <span>300 kr/mnd + mva</span>
          <span>·</span>
          <span>Ubegrenset brukere</span>
          <span>·</span>
          <span>Digital signatur</span>
          <span>·</span>
          <span>ISO 9001</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            fontSize: "18px",
            color: "#64748b",
          }}
        >
          hmsnova.no
        </div>
      </div>
    ),
    { ...size }
  );
}
