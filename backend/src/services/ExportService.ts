import fs from "fs";
import path from "path";
import sharp from "sharp";
import { TileGeneratorService, TileMetadata } from "./TileGeneratorService";
import { getTilesDir } from "../utils/fileUtils";

type Point = { x: number; y: number };

export type ExportAnnotation =
  | { type: "brush"; floor: number; color: string; points: Point[] }
  | { type: "line"; floor: number; color: string; a: Point; b: Point }
  | { type: "arrow"; floor: number; color: string; a: Point; b: Point }
  | { type: "rect"; floor: number; color: string; a: Point; b: Point }
  | { type: "circle"; floor: number; color: string; a: Point; b: Point }
  | { type: "text"; floor: number; color: string; point: Point; text: string };

interface ExportOptions {
  floor?: number;
  annotations?: ExportAnnotation[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

const TILE_SIZE = 256;
const TRANSPARENT_BLACK_THRESHOLD = 2;

function getLayerOrder(floors: number[]) {
  // Tibia: z maior fica mais fundo. Renderiza fundo primeiro e andares superiores por cima.
  return [...floors].sort((a, b) => b - a);
}

function getTilePath(tile: TileMetadata) {
  return path.join(getTilesDir(), `floor_${tile.floor}`, `tile_${tile.baseX}_${tile.baseY}.png`);
}

async function makeBlackTransparent(input: string) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (
      red <= TRANSPARENT_BLACK_THRESHOLD &&
      green <= TRANSPARENT_BLACK_THRESHOLD &&
      blue <= TRANSPARENT_BLACK_THRESHOLD
    ) {
      data[index + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

function calculateBounds(tiles: TileMetadata[]): Bounds {
  const minX = Math.min(...tiles.map((tile) => tile.baseX));
  const maxX = Math.max(...tiles.map((tile) => tile.baseX)) + TILE_SIZE;
  const minY = Math.min(...tiles.map((tile) => tile.baseY));
  const maxY = Math.max(...tiles.map((tile) => tile.baseY)) + TILE_SIZE;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function annotationPointToPixel(point: Point, bounds: Bounds) {
  return {
    x: point.x - bounds.minX,
    y: point.y - bounds.minY,
  };
}

function buildArrowPolyline(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.min(Math.max(len * 0.18, 8), 24);
  const headWidth = headLen * 0.55;
  const bx = b.x - ux * headLen;
  const by = b.y - uy * headLen;
  const px = -uy;
  const py = ux;

  return [
    a,
    b,
    { x: bx + px * headWidth, y: by + py * headWidth },
    b,
    { x: bx - px * headWidth, y: by - py * headWidth },
  ];
}

function renderAnnotationSvg(
  annotations: ExportAnnotation[],
  tilesByFloor: Map<number, TileMetadata[]>,
  bounds: Bounds
) {
  const elements: string[] = [];

  for (const annotation of annotations) {
    const floorTiles = tilesByFloor.get(annotation.floor);
    if (!floorTiles?.length) continue;

    const color = escapeAttr(annotation.color || "#61dafb");
    const strokeWidth = annotation.type === "brush" ? 3 : 2;

    if (annotation.type === "brush") {
      const points = annotation.points
        .map((point) => annotationPointToPixel(point, bounds))
        .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ");
      elements.push(
        `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      continue;
    }

    if (annotation.type === "text") {
      const point = annotationPointToPixel(annotation.point, bounds);
      elements.push(
        `<text x="${point.x}" y="${point.y}" fill="${color}" font-size="18" font-family="Arial, sans-serif" font-weight="700" stroke="#0f172a" stroke-width="3" paint-order="stroke" dominant-baseline="middle">${escapeAttr(annotation.text)}</text>`
      );
      continue;
    }

    const a = annotationPointToPixel(annotation.a, bounds);
    const b = annotationPointToPixel(annotation.b, bounds);

    if (annotation.type === "line") {
      elements.push(
        `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
      );
    } else if (annotation.type === "arrow") {
      const points = buildArrowPolyline(a, b).map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
      elements.push(
        `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    } else if (annotation.type === "rect") {
      elements.push(
        `<rect x="${Math.min(a.x, b.x)}" y="${Math.min(a.y, b.y)}" width="${Math.abs(b.x - a.x)}" height="${Math.abs(b.y - a.y)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
      );
    } else if (annotation.type === "circle") {
      elements.push(
        `<ellipse cx="${(a.x + b.x) / 2}" cy="${(a.y + b.y) / 2}" rx="${Math.abs(b.x - a.x) / 2}" ry="${Math.abs(b.y - a.y) / 2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`
      );
    }
  }

  return Buffer.from(
    `<svg width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" xmlns="http://www.w3.org/2000/svg">${elements.join("")}</svg>`
  );
}

export class ExportService {
  static async exportFlattenedMap(options: ExportOptions = {}) {
    const floors = options.floor === undefined ? TileGeneratorService.getProcessedFloors() : [options.floor];
    const orderedFloors = getLayerOrder(floors);
    const tilesByFloor = new Map<number, TileMetadata[]>();
    const allTiles: TileMetadata[] = [];

    for (const floor of orderedFloors) {
      const metadata = TileGeneratorService.getFloorMetadata(floor);
      tilesByFloor.set(floor, metadata);
      allTiles.push(...metadata);
    }

    if (allTiles.length === 0) {
      throw new Error("Nenhum tile encontrado para exportar");
    }

    const bounds = calculateBounds(allTiles);
    const composites: sharp.OverlayOptions[] = [];
    const transparentTileCache = new Map<string, Buffer>();

    for (const floor of orderedFloors) {
      const tiles = tilesByFloor.get(floor) ?? [];
      for (const tile of tiles) {
        const input = getTilePath(tile);
        if (!fs.existsSync(input)) continue;

        let transparentTile = transparentTileCache.get(input);
        if (!transparentTile) {
          transparentTile = await makeBlackTransparent(input);
          transparentTileCache.set(input, transparentTile);
        }

        composites.push({
          input: transparentTile,
          left: tile.baseX - bounds.minX,
          top: tile.baseY - bounds.minY,
        });
      }
    }

    const annotationSvg = renderAnnotationSvg(options.annotations ?? [], tilesByFloor, bounds);
    composites.push({ input: annotationSvg, left: 0, top: 0 });

    return sharp({
      create: {
        width: bounds.width,
        height: bounds.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
  }
}
