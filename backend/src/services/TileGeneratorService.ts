import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { parseMinimapFilename } from "../utils/coordinateUtils";
import {
  ensureFloorDirectory,
  getTilesDir,
  listPngFiles,
  getMapsImportedDir,
  getMapsOriginalDir,
} from "../utils/fileUtils";

const TILE_SIZE = 256;

export interface TileMetadata {
  id: string;
  floor: number;
  baseX: number;
  baseY: number;
  filename: string;
  imported: boolean;
}

/**
 * Serviço para gerar e gerenciar tiles do mapa.
 */
export class TileGeneratorService {
  /**
   * Processa todos os arquivos importados e organiza em tiles por andar.
   * Para MVP, cada minimapa é um "tile".
   */
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

      if (files.length === 0) {
        return {
          success: false,
          message: "Nenhum arquivo de minimapa encontrado para gerar tiles",
          generatedTiles: 0,
        };
      }

      // Recria os tiles do zero para evitar resíduos de gerações anteriores.
      if (fs.existsSync(tilesDir)) {
        for (const entry of fs.readdirSync(tilesDir)) {
          if (entry.startsWith("floor_")) {
            fs.rmSync(path.join(tilesDir, entry), { recursive: true, force: true });
          }
        }
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

        // Cria link/cópia do arquivo na pasta de tiles
        const tileDestName = `tile_${coords.baseX}_${coords.baseY}.png`;
        const tilePath = path.join(getTilesDir(), `floor_${floor}`, tileDestName);
        const sourcePath = fs.existsSync(path.join(importedDir, file))
          ? path.join(importedDir, file)
          : path.join(originalDir, file);

        if (!fs.existsSync(tilePath)) {
          fs.copyFileSync(sourcePath, tilePath);
        }
      }

      // Salva metadados
      for (const floor in metadata) {
        const metadataFile = path.join(
          tilesDir,
          `floor_${floor}`,
          "metadata.json"
        );
        fs.writeFileSync(
          metadataFile,
          JSON.stringify(metadata[floor], null, 2),
          "utf-8"
        );
      }

      const totalTiles = Object.values(metadata).reduce(
        (sum, tiles) => sum + tiles.length,
        0
      );

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

  /**
   * Retorna tile específico por andar e coordenadas.
   */
  static getTile(
    floor: number,
    baseX: number,
    baseY: number
  ): Buffer | null {
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

  /**
   * Retorna metadados de todos os tiles de um andar.
   */
  static getFloorMetadata(floor: number): TileMetadata[] {
    try {
      const metadataFile = path.join(
        getTilesDir(),
        `floor_${floor}`,
        "metadata.json"
      );
      if (fs.existsSync(metadataFile)) {
        const content = fs.readFileSync(metadataFile, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Retorna lista de andares processados.
   */
  static getProcessedFloors(): number[] {
    try {
      const tilesDir = getTilesDir();
      if (!fs.existsSync(tilesDir)) return [];

      const dirs = fs
        .readdirSync(tilesDir)
        .filter((d) => d.startsWith("floor_"));
      const floors = dirs
        .map((d) => parseInt(d.replace("floor_", ""), 10))
        .filter((f) => !isNaN(f));

      return floors.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }
}
