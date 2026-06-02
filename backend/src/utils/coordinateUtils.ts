/**
 * Utilitários para parsing de coordenadas de minimapa do Tibia.
 * Formato: Minimap_Color_X_Y_Z.png
 * X, Y = coordenadas base do quadrante (256x256 pixels)
 * Z = andar (z-coordinate do jogo)
 */

export interface TibiaCoordinates {
  baseX: number;
  baseY: number;
  floor: number;
}

/**
 * Extrai coordenadas do nome do arquivo de minimapa.
 * Exemplo: "Minimap_Color_31744_30976_10.png" → { baseX: 31744, baseY: 30976, floor: 10 }
 */
export function parseMinimapFilename(filename: string): TibiaCoordinates | null {
  const match = filename.match(/Minimap_Color_(\d+)_(\d+)_(\d+)\.png$/i);
  if (!match) return null;

  return {
    baseX: parseInt(match[1], 10),
    baseY: parseInt(match[2], 10),
    floor: parseInt(match[3], 10),
  };
}

/**
 * Gera chave única para cada quadrante (X_Y).
 */
export function getQuadrantKey(baseX: number, baseY: number): string {
  return `${baseX}_${baseY}`;
}

/**
 * Extrai lista de andares únicos encontrados.
 */
export function extractFloorsFromFiles(
  filenames: string[]
): number[] {
  const floors = new Set<number>();
  for (const filename of filenames) {
    const coords = parseMinimapFilename(filename);
    if (coords) floors.add(coords.floor);
  }
  return Array.from(floors).sort((a, b) => a - b);
}

/**
 * Agrupa arquivos por andar.
 */
export function groupFilesByFloor(
  filenames: string[]
): Record<number, string[]> {
  const grouped: Record<number, string[]> = {};

  for (const filename of filenames) {
    const coords = parseMinimapFilename(filename);
    if (!coords) continue;

    if (!grouped[coords.floor]) {
      grouped[coords.floor] = [];
    }
    grouped[coords.floor].push(filename);
  }

  return grouped;
}

/**
 * Calcula bounds globais (min/max X, Y) para um conjunto de quadrantes.
 */
export function calculateMapBounds(
  coordinates: TibiaCoordinates[]
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (coordinates.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const coord of coordinates) {
    minX = Math.min(minX, coord.baseX);
    maxX = Math.max(maxX, coord.baseX + 256);
    minY = Math.min(minY, coord.baseY);
    maxY = Math.max(maxY, coord.baseY + 256);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
