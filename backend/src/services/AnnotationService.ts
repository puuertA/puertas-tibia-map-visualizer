import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  Annotation,
} from "../types/Annotation";
import { getAnnotationsDir, readJsonFile, writeJsonFile } from "../utils/fileUtils";

/**
 * Serviço para gerenciar anotações (marcações) do mapa.
 */
export class AnnotationService {
  /**
   * Carrega anotações de um andar específico.
   */
  static loadAnnotations(floor: number | "global"): Annotation[] {
    const filename =
      floor === "global" ? "global.json" : `floor_${floor}.json`;
    const filePath = path.join(getAnnotationsDir(), filename);

    return readJsonFile<Annotation[]>(filePath, []);
  }

  /**
   * Salva anotações de um andar.
   */
  static saveAnnotations(
    floor: number | "global",
    annotations: Annotation[]
  ): void {
    const filename =
      floor === "global" ? "global.json" : `floor_${floor}.json`;
    const filePath = path.join(getAnnotationsDir(), filename);

    writeJsonFile(filePath, annotations);
  }

  /**
   * Adiciona uma nova anotação.
   */
  static addAnnotation(
    floor: number | "global",
    annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">
  ): Annotation {
    const now = new Date().toISOString();
    const newAnnotation: Annotation = {
      ...annotation,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const annotations = this.loadAnnotations(floor);
    annotations.push(newAnnotation);
    this.saveAnnotations(floor, annotations);

    return newAnnotation;
  }

  /**
   * Atualiza anotação existente.
   */
  static updateAnnotation(
    floor: number | "global",
    id: string,
    updates: Partial<Annotation>
  ): Annotation | null {
    const annotations = this.loadAnnotations(floor);
    const index = annotations.findIndex((a) => a.id === id);

    if (index === -1) return null;

    const updated: Annotation = {
      ...annotations[index],
      ...updates,
      id: annotations[index].id,
      createdAt: annotations[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    annotations[index] = updated;
    this.saveAnnotations(floor, annotations);

    return updated;
  }

  /**
   * Deleta anotação.
   */
  static deleteAnnotation(floor: number | "global", id: string): boolean {
    const annotations = this.loadAnnotations(floor);
    const filtered = annotations.filter((a) => a.id !== id);

    if (filtered.length === annotations.length) return false;

    this.saveAnnotations(floor, filtered);
    return true;
  }

  /**
   * Limpa todas as anotações de um andar.
   */
  static clearFloor(floor: number | "global"): void {
    this.saveAnnotations(floor, []);
  }

  /**
   * Retorna todas as anotações (todos os andares + global).
   */
  static getAllAnnotations(): Record<string, Annotation[]> {
    const result: Record<string, Annotation[]> = {};

    const annotDir = getAnnotationsDir();
    if (!fs.existsSync(annotDir)) {
      return result;
    }

    const files = fs.readdirSync(annotDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const key = file.replace(".json", "");
      const filePath = path.join(annotDir, file);
      result[key] = readJsonFile<Annotation[]>(filePath, []);
    }

    return result;
  }
}
