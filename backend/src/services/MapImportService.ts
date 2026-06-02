import fs from "fs";
import path from "path";
import { parseMinimapFilename } from "../utils/coordinateUtils";
import {
  ensureDirectories,
  getMapsOriginalDir,
  getMapsImportedDir,
  listPngFiles,
} from "../utils/fileUtils";

export interface ImportResult {
  success: boolean;
  message: string;
  importedFiles: number;
  importedFloorsCount: number;
  floors: number[];
}

/**
 * Serviço para importar arquivos de minimapa do Tibia.
 */
export class MapImportService {
  /**
   * Importa arquivos PNG de minimapa de um caminho local.
   * Copia arquivos para pasta interna e registra estrutura de andares.
   */
  static importMaps(sourcePath: string): ImportResult {
    try {
      ensureDirectories();

      // Verifica se fonte existe
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          message: `Caminho não encontrado: ${sourcePath}`,
          importedFiles: 0,
          importedFloorsCount: 0,
          floors: [],
        };
      }

      // Lista arquivos PNG do minimapa
      const files = fs
        .readdirSync(sourcePath)
        .filter((f) => f.toLowerCase().endsWith(".png"));

      if (files.length === 0) {
        return {
          success: false,
          message: "Nenhum arquivo PNG encontrado",
          importedFiles: 0,
          importedFloorsCount: 0,
          floors: [],
        };
      }

      const originalDir = getMapsOriginalDir();
      const importedDir = getMapsImportedDir();
      const floorsSet = new Set<number>();
      let copiedCount = 0;

      // Sincroniza com a fonte atual: evita mistura de mapas antigos.
      for (const dir of [originalDir, importedDir]) {
        if (fs.existsSync(dir)) {
          for (const existing of fs.readdirSync(dir)) {
            if (existing.toLowerCase().endsWith(".png")) {
              fs.rmSync(path.join(dir, existing), { force: true });
            }
          }
        }
      }

      // Copia arquivos para a pasta interna como recursos do projeto
      for (const file of files) {
        const sourceFull = path.join(sourcePath, file);
        const originalFull = path.join(originalDir, file);
        const importedFull = path.join(importedDir, file);

        // Sempre sobrescreve para refletir exatamente o minimapa atual.
        fs.copyFileSync(sourceFull, originalFull);
        fs.copyFileSync(sourceFull, importedFull);

        copiedCount++;

        // Extrai andar
        const coords = parseMinimapFilename(file);
        if (coords) {
          floorsSet.add(coords.floor);
        }
      }

      const floors = Array.from(floorsSet).sort((a, b) => a - b);

      return {
        success: true,
        message: `Mapas importados com sucesso (${copiedCount} arquivos PNG copiados como recurso)`,
        importedFiles: copiedCount,
        importedFloorsCount: floors.length,
        floors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erro na importação: ${message}`,
        importedFiles: 0,
        importedFloorsCount: 0,
        floors: [],
      };
    }
  }

  /**
   * Retorna lista de andares já importados.
   */
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
