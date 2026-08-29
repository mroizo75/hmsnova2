/**
 * Tilpasser tenant-logo og HMS Nova-logo til faste rapport-slots.
 * Adobe beholder plassholderens bredde/høyde, derfor pakkes bildet i SVG
 * med preserveAspectRatio slik at formatet treffer uten stretching.
 */

export const TENANT_LOGO_SLOT = { width: 210, height: 52 };
export const HMS_LOGO_SLOT = { width: 72, height: 20 };

function emptySvg(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function fitLogoToSlot(
  dataUri: string | null | undefined,
  slot: { width: number; height: number }
): string {
  if (!dataUri) {
    return emptySvg(slot.width, slot.height);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${slot.width}" height="${slot.height}" viewBox="0 0 ${slot.width} ${slot.height}">
  <image href="${escapeXml(dataUri)}" width="${slot.width}" height="${slot.height}" preserveAspectRatio="xMinYMid meet"/>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
