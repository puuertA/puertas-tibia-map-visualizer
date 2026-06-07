import fs from "fs";
import path from "path";
import { parseMinimapFilename } from "../utils/coordinateUtils";
import {
  ensureDirectories,
  getMapsImportedDir,
  getMapsOriginalDir,
  getResourcesMinimapDir,
  listPngFiles,
} from "../utils/fileUtils";

export interface ImportResult {
  success: boolean;
  message: string;
  importedFiles: number;
  importedFloorsCount: number;
  floors: number[];
}

export interface UploadedMapFile {
  filename: string;
  data: string;
}

export class MapImportService {
  static getDefaultMinimapPath(): string {
    const localAppData = process.env.LOCALAPPDATA;

    if (!localAppData) {
      throw new Error("LOCALAPPDATA nao esta definido neste sistema");
    }

    return path.join(localAppData, "Tibia", "packages", "Tibia", "minimap");
  }

  static importDefaultMaps(): ImportResult & { sourcePath: string } {
    const sourcePath = this.getDefaultMinimapPath();
    return {
      ...this.importMaps(sourcePath),
      sourcePath,
    };
  }

  static importMaps(sourcePath: string): ImportResult {
    try {
      ensureDirectories();

      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          message: `Caminho nao encontrado: ${sourcePath}`,
          importedFiles: 0,
          importedFloorsCount: 0,
          floors: [],
        };
      }

      const files = fs
        .readdirSync(sourcePath)
        .filter((file) => file.toLowerCase().endsWith(".png"));

      const originalDir = getMapsOriginalDir();
      const importedDir = getMapsImportedDir();
      const resourcesMinimapDir = getResourcesMinimapDir();
      const floorsSet = new Set<number>();
      let copiedCount = 0;

      for (const dir of [originalDir, importedDir, resourcesMinimapDir]) {
        if (!fs.existsSync(dir)) continue;

        for (const existing of fs.readdirSync(dir)) {
          if (existing.toLowerCase().endsWith(".png")) {
            fs.rmSync(path.join(dir, existing), { force: true });
          }
        }
      }

      if (files.length === 0) {
        return {
          success: true,
          message: "Nenhum arquivo PNG encontrado. O mapa interno foi limpo.",
          importedFiles: 0,
          importedFloorsCount: 0,
          floors: [],
        };
      }

      for (const file of files) {
        const sourceFull = path.join(sourcePath, file);
        fs.copyFileSync(sourceFull, path.join(originalDir, file));
        fs.copyFileSync(sourceFull, path.join(importedDir, file));
        fs.copyFileSync(sourceFull, path.join(resourcesMinimapDir, file));

        copiedCount++;

        const coords = parseMinimapFilename(file);
        if (coords) {
          floorsSet.add(coords.floor);
        }
      }

      const floors = Array.from(floorsSet).sort((a, b) => a - b);

      return {
        success: true,
        message: `Mapas importados com sucesso (${copiedCount} arquivos PNG copiados)`,
        importedFiles: copiedCount,
        importedFloorsCount: floors.length,
        floors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erro na importacao: ${message}`,
        importedFiles: 0,
        importedFloorsCount: 0,
        floors: [],
      };
    }
  }

  static importUploadedMapFiles(files: UploadedMapFile[], clearExisting: boolean): ImportResult {
    try {
      ensureDirectories();

      const originalDir = getMapsOriginalDir();
      const importedDir = getMapsImportedDir();
      const resourcesMinimapDir = getResourcesMinimapDir();
      const floorsSet = new Set<number>();
      let copiedCount = 0;

      if (clearExisting) {
        for (const dir of [originalDir, importedDir, resourcesMinimapDir]) {
          if (!fs.existsSync(dir)) continue;

          for (const existing of fs.readdirSync(dir)) {
            if (existing.toLowerCase().endsWith(".png")) {
              fs.rmSync(path.join(dir, existing), { force: true });
            }
          }
        }
      }

      for (const uploadedFile of files) {
        if (!uploadedFile || typeof uploadedFile.filename !== "string" || typeof uploadedFile.data !== "string") {
          continue;
        }

        const file = path.basename(uploadedFile.filename);
        if (!file.toLowerCase().endsWith(".png")) continue;

        const coords = parseMinimapFilename(file);
        if (!coords) continue;

        const base64 = uploadedFile.data.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0) continue;

        fs.writeFileSync(path.join(originalDir, file), buffer);
        fs.writeFileSync(path.join(importedDir, file), buffer);
        fs.writeFileSync(path.join(resourcesMinimapDir, file), buffer);

        copiedCount++;
        floorsSet.add(coords.floor);
      }

      const floors = Array.from(floorsSet).sort((a, b) => a - b);

      return {
        success: true,
        message: `${copiedCount} arquivos PNG recebidos do navegador`,
        importedFiles: copiedCount,
        importedFloorsCount: floors.length,
        floors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erro no upload: ${message}`,
        importedFiles: 0,
        importedFloorsCount: 0,
        floors: [],
      };
    }
  }

  static getImportedFloors(): number[] {
    const importedFiles = listPngFiles(getMapsImportedDir());
    const originalFiles = listPngFiles(getMapsOriginalDir());
    const files = importedFiles.length > 0 ? importedFiles : originalFiles;
    const floorsSet = new Set<number>();

    for (const file of files) {
      const coords = parseMinimapFilename(file);
      if (coords) floorsSet.add(coords.floor);
    }

    return Array.from(floorsSet).sort((a, b) => a - b);
  }
}
