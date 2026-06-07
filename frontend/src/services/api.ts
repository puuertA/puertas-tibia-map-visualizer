import axios from "axios";
import { Annotation } from "../types/Annotation";
import { ExportAnnotation } from "../types/ExportAnnotation";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Importa mapas de um caminho local.
 */
export async function importMaps(sourcePath: string) {
  const response = await api.post("/maps/import", { sourcePath });
  return response.data;
}

export async function importDefaultTibiaMaps() {
  const response = await api.post<{
    success: boolean;
    message: string;
    sourcePath: string;
    importedFiles: number;
    importedFloorsCount: number;
    floors: number[];
    tilesGenerated: boolean;
    generatedTiles: number;
  }>("/maps/import/default");
  return response.data;
}

export async function importDefaultTibiaMarkers() {
  const response = await api.get<{
    sourcePath: string;
    importedCount: number;
    annotationsByFloor: Record<string, ExportAnnotation[]>;
  }>("/tibia-markers/default");
  return response.data;
}

/**
 * Retorna lista de andares importados.
 */
export async function getFloors() {
  const response = await api.get("/maps/floors");
  return response.data.floors;
}

/**
 * Gera tiles a partir dos arquivos importados.
 */
export async function generateTiles() {
  const response = await api.post("/maps/tiles/generate");
  return response.data;
}

/**
 * Retorna metadados dos tiles de um andar.
 */
export async function getTileMetadata(floor: number) {
  const response = await api.get(`/tiles/${floor}/metadata`);
  return response.data;
}

/**
 * Retorna URL da imagem de tile.
 */
export function getTileImageUrl(floor: number, baseX: number, baseY: number, revision = 0) {
  return `${API_BASE}/tiles/${floor}/${baseX}/${baseY}?v=${revision}`;
}

/**
 * Retorna lista de andares com tiles processados.
 */
export async function getProcessedFloors() {
  const response = await api.get("/tiles/floors/processed");
  return response.data.floors;
}

/**
 * Carrega anotações de um andar.
 */
export async function getAnnotations(floor: number | "global") {
  const response = await api.get(`/annotations/${floor}`);
  return response.data;
}

/**
 * Adiciona nova anotação.
 */
export async function addAnnotation(
  floor: number | "global",
  annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">
) {
  const response = await api.post(`/annotations/${floor}`, annotation);
  return response.data;
}

/**
 * Atualiza anotação.
 */
export async function updateAnnotation(
  floor: number | "global",
  id: string,
  updates: Partial<Annotation>
) {
  const response = await api.put(`/annotations/${floor}/${id}`, updates);
  return response.data;
}

/**
 * Deleta anotação.
 */
export async function deleteAnnotation(floor: number | "global", id: string) {
  await api.delete(`/annotations/${floor}/${id}`);
}

/**
 * Limpa todos as anotações de um andar.
 */
export async function clearFloor(floor: number | "global") {
  await api.delete(`/annotations/${floor}`);
}

/**
 * Obtém todas as anotações.
 */
export async function getAllAnnotations() {
  const response = await api.get("/annotations/export/all");
  return response.data;
}

/**
 * Obtém ou cria configuração de projeto.
 */
export async function getProjectConfig() {
  const response = await api.get("/project");
  return response.data;
}

/**
 * Salva configuração de projeto.
 */
export async function saveProjectConfig(config: any) {
  const response = await api.post("/project/save", config);
  return response.data;
}
