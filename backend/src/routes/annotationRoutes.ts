import { Router } from "express";
import { AnnotationService } from "../services/AnnotationService";
import { Annotation } from "../types/Annotation";

export const annotationRoutes = Router();

annotationRoutes.get("/:floor", (req, res) => {
  try {
    const floor = req.params.floor === "global" 
      ? "global" 
      : parseInt(req.params.floor, 10);
    const annotations = AnnotationService.loadAnnotations(floor);
    res.json(annotations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

annotationRoutes.post("/:floor", (req, res) => {
  try {
    const floor = req.params.floor === "global" 
      ? "global" 
      : parseInt(req.params.floor, 10);
    const annotationData = req.body as Omit<
      Annotation,
      "id" | "createdAt" | "updatedAt"
    >;

    const newAnnotation = AnnotationService.addAnnotation(floor, annotationData);
    res.status(201).json(newAnnotation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

annotationRoutes.put("/:floor/:id", (req, res) => {
  try {
    const floor = req.params.floor === "global" 
      ? "global" 
      : parseInt(req.params.floor, 10);
    const id = req.params.id;
    const updates = req.body;

    const updated = AnnotationService.updateAnnotation(floor, id, updates);
    if (!updated) {
      return res.status(404).json({ message: "Anotação não encontrada" });
    }

    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

annotationRoutes.delete("/:floor/:id", (req, res) => {
  try {
    const floor = req.params.floor === "global" 
      ? "global" 
      : parseInt(req.params.floor, 10);
    const id = req.params.id;

    const deleted = AnnotationService.deleteAnnotation(floor, id);
    if (!deleted) {
      return res.status(404).json({ message: "Anotação não encontrada" });
    }

    res.json({ message: "Anotação deletada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

annotationRoutes.delete("/:floor", (req, res) => {
  try {
    const floor = req.params.floor === "global" 
      ? "global" 
      : parseInt(req.params.floor, 10);

    AnnotationService.clearFloor(floor);
    res.json({ message: "Anotações do andar limpas" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

annotationRoutes.get("/export/all", (_req, res) => {
  try {
    const all = AnnotationService.getAllAnnotations();
    res.json(all);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});
