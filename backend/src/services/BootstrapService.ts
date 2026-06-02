import fs from "fs";
import path from "path";
import { MapImportService } from "./MapImportService";
import { TileGeneratorService } from "./TileGeneratorService";
import {
  ensureDirectories,
  getResourcesDir,
  getResourcesMinimapDir,
  getMapsImportedDir,
  getMapsOriginalDir,
} from "../utils/fileUtils";

const DEFAULT_MINIMAP_SOURCE =
  "C:\\Users\\Administrator\\AppData\\Local\\Tibia\\packages\\Tibia\\minimap";

export class BootstrapService {
  static initialize(): { imported: boolean; generated: boolean } {
    ensureDirectories();

    const resourcesDir = getResourcesDir();
    const resourceDir = getResourcesMinimapDir();
    const importedDir = getMapsImportedDir();
    const originalDir = getMapsOriginalDir();

    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }

    if (!fs.existsSync(resourceDir)) {
      fs.mkdirSync(resourceDir, { recursive: true });
    }

    const resourceHasFiles =
      fs.existsSync(resourceDir) &&
      fs.readdirSync(resourceDir).some((file) => file.toLowerCase().endsWith(".png"));

    if (!resourceHasFiles && fs.existsSync(DEFAULT_MINIMAP_SOURCE)) {
      const pngFiles = fs
        .readdirSync(DEFAULT_MINIMAP_SOURCE)
        .filter((file) => file.toLowerCase().endsWith(".png"));

      for (const file of pngFiles) {
        const sourcePath = path.join(DEFAULT_MINIMAP_SOURCE, file);
        const resourcePath = path.join(resourceDir, file);
        if (!fs.existsSync(resourcePath)) {
          fs.copyFileSync(sourcePath, resourcePath);
        }
      }

      const importResult = MapImportService.importMaps(DEFAULT_MINIMAP_SOURCE);
      TileGeneratorService.generateTiles();
      return { imported: importResult.success, generated: true };
    }

    if (resourceHasFiles) {
      const pngFiles = fs
        .readdirSync(resourceDir)
        .filter((file) => file.toLowerCase().endsWith(".png"));

      // Sincroniza diretórios internos com os recursos atuais.
      for (const dir of [originalDir, importedDir]) {
        for (const existing of fs.readdirSync(dir)) {
          if (existing.toLowerCase().endsWith(".png")) {
            fs.rmSync(path.join(dir, existing), { force: true });
          }
        }
      }

      for (const file of pngFiles) {
        const sourcePath = path.join(resourceDir, file);
        const originalPath = path.join(originalDir, file);
        const importedPath = path.join(importedDir, file);
        fs.copyFileSync(sourcePath, originalPath);
        fs.copyFileSync(sourcePath, importedPath);
      }

      TileGeneratorService.generateTiles();
      return { imported: true, generated: true };
    }

    return { imported: false, generated: false };
  }
}
