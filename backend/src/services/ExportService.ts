import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { TileGeneratorService, TileMetadata } from "./TileGeneratorService";
import { getDataDir, getTilesDir } from "../utils/fileUtils";

type Point = { x: number; y: number };

export type ExportAnnotation =
  | { type: "brush"; floor: number; color: string; points: Point[] }
  | { type: "line"; floor: number; color: string; a: Point; b: Point }
  | { type: "arrow"; floor: number; color: string; a: Point; b: Point }
  | { type: "rect"; floor: number; color: string; a: Point; b: Point }
  | { type: "circle"; floor: number; color: string; a: Point; b: Point }
  | { type: "text"; floor: number; color: string; point: Point; text: string }
  | { type: "marker"; floor: number; color: string; point: Point; icon: number; text: string };

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
const MAX_EXPORT_PIXELS = Number(process.env.EXPORT_MAX_PIXELS ?? 2_500_000);
const EXPORT_COMPOSITE_BATCH_SIZE = Number(process.env.EXPORT_COMPOSITE_BATCH_SIZE ?? 24);

sharp.cache({ memory: 32, files: 0, items: 64 });
sharp.concurrency(1);

function getLayerOrder(floors: number[]) {
  // Tibia: z maior fica mais fundo. Renderiza fundo primeiro e andares superiores por cima.
  return [...floors].sort((a, b) => b - a);
}

function getTilePath(tile: TileMetadata) {
  return path.join(getTilesDir(), `floor_${tile.floor}`, `tile_${tile.baseX}_${tile.baseY}.png`);
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

function getMarkerIconPath(icon: number) {
  const extensions = ["png", "svg"];
  const candidates = extensions.flatMap((extension) => [
    path.resolve(process.cwd(), "..", "frontend", "public", "tibia-marker-icons", `${icon}.${extension}`),
    path.resolve(__dirname, "..", "..", "..", "frontend", "public", "tibia-marker-icons", `${icon}.${extension}`),
  ]);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function annotationPointToPixel(point: Point, bounds: Bounds) {
  return {
    x: point.x - bounds.minX,
    y: point.y - bounds.minY,
  };
}

function scalePoint(point: { x: number; y: number }, scale: number) {
  return {
    x: point.x * scale,
    y: point.y * scale,
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
  bounds: Bounds,
  scale: number
) {
  const elements: string[] = [];
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));

  for (const annotation of annotations) {
    const floorTiles = tilesByFloor.get(annotation.floor);
    if (!floorTiles?.length) continue;

    const color = escapeAttr(annotation.color || "#61dafb");
    const strokeWidth = annotation.type === "brush" ? 3 : 2;

    if (annotation.type === "brush") {
      const points = annotation.points
        .map((point) => annotationPointToPixel(point, bounds))
        .map((point) => scalePoint(point, scale))
        .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ");
      elements.push(
        `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${Math.max(1, strokeWidth * scale)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      continue;
    }

    if (annotation.type === "text") {
      const point = scalePoint(annotationPointToPixel(annotation.point, bounds), scale);
      elements.push(
        `<text x="${point.x}" y="${point.y}" fill="${color}" font-size="${Math.max(10, 18 * scale)}" font-family="Arial, sans-serif" font-weight="700" stroke="#0f172a" stroke-width="${Math.max(1, 3 * scale)}" paint-order="stroke" dominant-baseline="middle">${escapeAttr(annotation.text)}</text>`
      );
      continue;
    }

    if (annotation.type === "marker") {
      const point = scalePoint(annotationPointToPixel(annotation.point, bounds), scale);
      const radius = Math.max(4, 8 * scale);
      const fontSize = Math.max(7, 8 * scale);
      const iconPath = getMarkerIconPath(annotation.icon);

      if (iconPath) {
        const iconData = fs.readFileSync(iconPath).toString("base64");
        const mimeType = iconPath.endsWith(".svg") ? "image/svg+xml" : "image/png";
        const size = Math.max(10, 20 * scale);
        elements.push(
          `<image href="data:${mimeType};base64,${iconData}" x="${point.x - size / 2}" y="${point.y - size / 2}" width="${size}" height="${size}"/>`
        );
      } else {
        elements.push(
          `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${color}" stroke="#0f172a" stroke-width="${Math.max(1, 2 * scale)}"/>`
        );
        elements.push(
          `<text x="${point.x}" y="${point.y + fontSize * 0.08}" fill="#ffffff" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="800" text-anchor="middle" dominant-baseline="middle">${annotation.icon + 1}</text>`
        );
      }
      continue;
    }

    const a = scalePoint(annotationPointToPixel(annotation.a, bounds), scale);
    const b = scalePoint(annotationPointToPixel(annotation.b, bounds), scale);

    if (annotation.type === "line") {
      elements.push(
        `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${Math.max(1, strokeWidth * scale)}" stroke-linecap="round"/>`
      );
    } else if (annotation.type === "arrow") {
      const points = buildArrowPolyline(a, b).map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
      elements.push(
        `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${Math.max(1, strokeWidth * scale)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    } else if (annotation.type === "rect") {
      elements.push(
        `<rect x="${Math.min(a.x, b.x)}" y="${Math.min(a.y, b.y)}" width="${Math.abs(b.x - a.x)}" height="${Math.abs(b.y - a.y)}" fill="none" stroke="${color}" stroke-width="${Math.max(1, strokeWidth * scale)}"/>`
      );
    } else if (annotation.type === "circle") {
      elements.push(
        `<ellipse cx="${(a.x + b.x) / 2}" cy="${(a.y + b.y) / 2}" rx="${Math.abs(b.x - a.x) / 2}" ry="${Math.abs(b.y - a.y) / 2}" fill="none" stroke="${color}" stroke-width="${Math.max(1, strokeWidth * scale)}"/>`
      );
    }
  }

  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${elements.join("")}</svg>`
  );
}

function getExportScale(bounds: Bounds) {
  const totalPixels = bounds.width * bounds.height;
  if (totalPixels <= MAX_EXPORT_PIXELS) return 1;
  return Math.sqrt(MAX_EXPORT_PIXELS / totalPixels);
}

async function prepareTileInput(input: string, options: { transparentBlack: boolean; scale: number; tempDir: string }) {
  if (!options.transparentBlack && options.scale === 1) {
    return input;
  }

  const stats = await fs.promises.stat(input);
  const exportCacheDir = path.join(getDataDir(), "export-cache");
  await fs.promises.mkdir(exportCacheDir, { recursive: true });

  const cacheKey = [
    path.basename(input, ".png"),
    options.transparentBlack ? "transparent" : "opaque",
    `scale_${options.scale.toFixed(4).replace(".", "_")}`,
    `mtime_${Math.round(stats.mtimeMs)}`,
    `size_${stats.size}`,
  ].join("__");
  const output = path.join(exportCacheDir, `${cacheKey}.png`);

  if (fs.existsSync(output)) {
    return output;
  }

  let pipeline: sharp.Sharp;

  if (options.transparentBlack) {
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

    pipeline = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    });
  } else {
    pipeline = sharp(input);
  }

  if (options.scale !== 1) {
    pipeline = pipeline.resize({
      width: Math.max(1, Math.round(TILE_SIZE * options.scale)),
      height: Math.max(1, Math.round(TILE_SIZE * options.scale)),
      fit: "fill",
    });
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(output);
  return output;
}

async function compositeBatch(
  currentFile: string,
  overlays: sharp.OverlayOptions[],
  tempDir: string,
  step: number
) {
  if (overlays.length === 0) return currentFile;

  const output = path.join(tempDir, `canvas_${step}.png`);
  await sharp(currentFile)
    .composite(overlays)
    .png({ compressionLevel: 6 })
    .toFile(output);

  if (currentFile.startsWith(tempDir)) {
    await fs.promises.rm(currentFile, { force: true });
  }

  return output;
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
    const scale = getExportScale(bounds);
    const outputWidth = Math.max(1, Math.round(bounds.width * scale));
    const outputHeight = Math.max(1, Math.round(bounds.height * scale));
    const shouldMakeBlackTransparent = options.floor === undefined;
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tibia-map-export-"));

    try {
      let step = 0;
      let currentFile = path.join(tempDir, `canvas_${step}.png`);
      await sharp({
        create: {
          width: outputWidth,
          height: outputHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png({ compressionLevel: 6 })
        .toFile(currentFile);

      let batch: sharp.OverlayOptions[] = [];

      async function flushBatch() {
        if (batch.length === 0) return;
        step += 1;
        currentFile = await compositeBatch(currentFile, batch, tempDir, step);
        batch = [];
      }

      for (const floor of orderedFloors) {
        const tiles = tilesByFloor.get(floor) ?? [];
        for (const tile of tiles) {
          const input = getTilePath(tile);
          if (!fs.existsSync(input)) continue;

          const preparedInput = await prepareTileInput(input, {
            transparentBlack: shouldMakeBlackTransparent,
            scale,
            tempDir,
          });

          batch.push({
            input: preparedInput,
            left: Math.round((tile.baseX - bounds.minX) * scale),
            top: Math.round((tile.baseY - bounds.minY) * scale),
          });

          if (batch.length >= EXPORT_COMPOSITE_BATCH_SIZE) {
            await flushBatch();
          }
        }
      }

      await flushBatch();

      const annotationSvg = renderAnnotationSvg(options.annotations ?? [], tilesByFloor, bounds, scale);
      currentFile = await compositeBatch(currentFile, [{ input: annotationSvg, left: 0, top: 0 }], tempDir, step + 1);

      return await fs.promises.readFile(currentFile);
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
}
