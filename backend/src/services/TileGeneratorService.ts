import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { parseMinimapFilename } from "../utils/coordinateUtils";
import {
  ensureFloorDirectory,
  getMapsImportedDir,
  getMapsOriginalDir,
  getTilesDir,
  listPngFiles,
} from "../utils/fileUtils";

export interface TileMetadata {
  id: string;
  floor: number;
  baseX: number;
  baseY: number;
  filename: string;
  imported: boolean;
}

export class TileGeneratorService {
  static generateTiles(): {
    success: boolean;
    message: string;
    generatedTiles: number;
  } {
    try {
      const importedDir = getMapsImportedDir();
      const originalDir = getMapsOriginalDir();
      const tilesDir = getTilesDir();
      const importedFiles = listPngFiles(importedDir);
      const originalFiles = listPngFiles(originalDir);
      const files = importedFiles.length > 0 ? importedFiles : originalFiles;

      if (fs.existsSync(tilesDir)) {
        for (const entry of fs.readdirSync(tilesDir)) {
          if (entry.startsWith("floor_")) {
            fs.rmSync(path.join(tilesDir, entry), { recursive: true, force: true });
          }
        }
      }

      if (files.length === 0) {
        return {
          success: true,
          message: "Nenhum arquivo de minimapa encontrado. Tiles antigos foram removidos.",
          generatedTiles: 0,
        };
      }

      const metadata: Record<number, TileMetadata[]> = {};

      for (const file of files) {
        const coords = parseMinimapFilename(file);
        if (!coords) continue;

        const floor = coords.floor;
        if (!metadata[floor]) metadata[floor] = [];

        ensureFloorDirectory(floor);

        const tile: TileMetadata = {
          id: randomUUID(),
          floor,
          baseX: coords.baseX,
          baseY: coords.baseY,
          filename: file,
          imported: true,
        };

        metadata[floor].push(tile);

        const tileDestName = `tile_${coords.baseX}_${coords.baseY}.png`;
        const tilePath = path.join(getTilesDir(), `floor_${floor}`, tileDestName);
        const sourcePath = fs.existsSync(path.join(importedDir, file))
          ? path.join(importedDir, file)
          : path.join(originalDir, file);

        fs.copyFileSync(sourcePath, tilePath);
      }

      for (const floor in metadata) {
        const metadataFile = path.join(tilesDir, `floor_${floor}`, "metadata.json");
        fs.writeFileSync(metadataFile, JSON.stringify(metadata[floor], null, 2), "utf-8");
      }

      const totalTiles = Object.values(metadata).reduce((sum, tiles) => sum + tiles.length, 0);

      return {
        success: true,
        message: `${totalTiles} tiles processados e organizados`,
        generatedTiles: totalTiles,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erro ao gerar tiles: ${message}`,
        generatedTiles: 0,
      };
    }
  }

  static getTile(floor: number, baseX: number, baseY: number): Buffer | null {
    try {
      const tileName = `tile_${baseX}_${baseY}.png`;
      const tilePath = path.join(getTilesDir(), `floor_${floor}`, tileName);

      if (fs.existsSync(tilePath)) {
        return fs.readFileSync(tilePath);
      }
    } catch {
      // ignore
    }
    return null;
  }

  static getFloorMetadata(floor: number): TileMetadata[] {
    try {
      const metadataFile = path.join(getTilesDir(), `floor_${floor}`, "metadata.json");
      if (fs.existsSync(metadataFile)) {
        const content = fs.readFileSync(metadataFile, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      // ignore
    }
    return [];
  }

  static getProcessedFloors(): number[] {
    try {
      const tilesDir = getTilesDir();
      if (!fs.existsSync(tilesDir)) return [];

      const dirs = fs.readdirSync(tilesDir).filter((dir) => dir.startsWith("floor_"));
      const floors = dirs
        .map((dir) => parseInt(dir.replace("floor_", ""), 10))
        .filter((floor) => !isNaN(floor));

      return floors.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }
}
