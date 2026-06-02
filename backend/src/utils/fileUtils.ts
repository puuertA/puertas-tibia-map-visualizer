import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "..", "data");
const MAPS_ORIGINAL_DIR = path.join(DATA_DIR, "maps", "original");
const MAPS_IMPORTED_DIR = path.join(DATA_DIR, "maps", "imported");
const TILES_DIR = path.join(DATA_DIR, "tiles");
const ANNOTATIONS_DIR = path.join(DATA_DIR, "annotations");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const RESOURCES_DIR = path.resolve(process.cwd(), "..", "resources");
const RESOURCES_MINIMAP_DIR = path.join(RESOURCES_DIR, "minimap");

/**
 * Garante que todos os diretórios necessários existem.
 */
export function ensureDirectories(): void {
  const dirs = [
    DATA_DIR,
    MAPS_ORIGINAL_DIR,
    MAPS_IMPORTED_DIR,
    TILES_DIR,
    ANNOTATIONS_DIR,
    PROJECTS_DIR,
    RESOURCES_DIR,
    RESOURCES_MINIMAP_DIR,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getDataDir(): string {
  return DATA_DIR;
}

export function getMapsOriginalDir(): string {
  return MAPS_ORIGINAL_DIR;
}

export function getMapsImportedDir(): string {
  return MAPS_IMPORTED_DIR;
}

export function getTilesDir(): string {
  return TILES_DIR;
}

export function getAnnotationsDir(): string {
  return ANNOTATIONS_DIR;
}

export function getProjectsDir(): string {
  return PROJECTS_DIR;
}

export function getResourcesDir(): string {
  return RESOURCES_DIR;
}

export function getResourcesMinimapDir(): string {
  return RESOURCES_MINIMAP_DIR;
}

/**
 * Lista todos os arquivos PNG em um diretório.
 */
export function listPngFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".png"));
}

/**
 * Cria diretório para andar específico.
 */
export function ensureFloorDirectory(floor: number): string {
  const floorDir = path.join(TILES_DIR, `floor_${floor}`);
  if (!fs.existsSync(floorDir)) {
    fs.mkdirSync(floorDir, { recursive: true });
  }
  return floorDir;
}

/**
 * Lê arquivo JSON ou retorna array vazio se não existir.
 */
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // fallback ao padrão
  }
  return defaultValue;
}

/**
 * Escreve arquivo JSON.
 */
export function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
