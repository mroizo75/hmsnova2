"use client";

import { useEffect, useRef, useState } from "react";

const TILE = 256;

type Point = { lat: number; lon: number };

function worldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom * TILE;
}

function worldY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  const merc = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return ((1 - merc / Math.PI) / 2) * 2 ** zoom * TILE;
}

function fitZoom(points: Point[], width: number, height: number): number {
  for (let zoom = 16; zoom >= 5; zoom -= 1) {
    const xs = points.map((point) => worldX(point.lon, zoom));
    const ys = points.map((point) => worldY(point.lat, zoom));
    const dx = Math.max(...xs) - Math.min(...xs);
    const dy = Math.max(...ys) - Math.min(...ys);
    if (dx < width - 56 && dy < height - 56) return zoom;
  }
  return 5;
}

/** Norgeskart fra Kartverket. Flisene lastes som bilder, uten innbygget nettside. */
export function RouteMap({
  from,
  to,
  path = [],
  label,
}: {
  from: Point;
  to: Point;
  path?: Point[];
  label: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const height = 160;

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const line = path.length >= 2 ? path : [from, to];
  const zoom = fitZoom(line, width, height);
  const xs = line.map((point) => worldX(point.lon, zoom));
  const ys = line.map((point) => worldY(point.lat, zoom));
  const originX = (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2;
  const originY = (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2;
  const maxIndex = 2 ** zoom - 1;
  const xStart = Math.max(0, Math.floor(originX / TILE));
  const yStart = Math.max(0, Math.floor(originY / TILE));
  const xEnd = Math.min(maxIndex, Math.floor((originX + width) / TILE));
  const yEnd = Math.min(maxIndex, Math.floor((originY + height) / TILE));
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  for (let x = xStart; x <= xEnd; x += 1) {
    for (let y = yStart; y <= yEnd; y += 1) {
      tiles.push({ x, y, left: x * TILE - originX, top: y * TILE - originY });
    }
  }
  const start = { left: worldX(from.lon, zoom) - originX, top: worldY(from.lat, zoom) - originY };
  const end = { left: worldX(to.lon, zoom) - originX, top: worldY(to.lat, zoom) - originY };
  const polyline = line
    .map((point) => `${worldX(point.lon, zoom) - originX},${worldY(point.lat, zoom) - originY}`)
    .join(" ");

  return (
    <div ref={frameRef} className="relative h-40 w-full overflow-hidden rounded-md border bg-muted" aria-label={label}>
      {tiles.map((tile) => (
        <img
          key={`${tile.x}-${tile.y}`}
          alt=""
          className="absolute max-w-none"
          style={{ left: tile.left, top: tile.top, width: TILE, height: TILE }}
          src={`https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/${zoom}/${tile.y}/${tile.x}.png`}
        />
      ))}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polyline points={polyline} fill="none" stroke="#1d4ed8" strokeWidth="3" />
      </svg>
      <span
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-700"
        style={{ left: start.left, top: start.top }}
      />
      <span
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600"
        style={{ left: end.left, top: end.top }}
      />
      <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1 text-[10px] text-muted-foreground">
        © Kartverket
      </span>
    </div>
  );
}
