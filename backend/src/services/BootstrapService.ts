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

    const defaultMinimapSource = !resourceHasFiles
      ? safeDefaultMinimapPath()
      : null;

    if (!resourceHasFiles && defaultMinimapSource && fs.existsSync(defaultMinimapSource)) {
      const pngFiles = fs
        .readdirSync(defaultMinimapSource)
        .filter((file) => file.toLowerCase().endsWith(".png"));

      for (const file of pngFiles) {
        const sourcePath = path.join(defaultMinimapSource, file);
        const resourcePath = path.join(resourceDir, file);
        if (!fs.existsSync(resourcePath)) {
          fs.copyFileSync(sourcePath, resourcePath);
        }
      }

      const importResult = MapImportService.importMaps(defaultMinimapSource);
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

function safeDefaultMinimapPath() {
  try {
    return MapImportService.getDefaultMinimapPath();
  } catch {
    return null;
  }
}
