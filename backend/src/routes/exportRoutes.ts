import { Router } from "express";
import { ExportAnnotation, ExportService } from "../services/ExportService";

export const exportRoutes = Router();

const TIBIA_SURFACE_FLOOR = 7;

exportRoutes.post("/floor", async (req, res) => {
  try {
    const floor = Number(req.body?.floor);
    const annotations = (req.body?.annotations ?? []) as ExportAnnotation[];

    if (!Number.isFinite(floor)) {
      return res.status(400).json({ message: "floor e obrigatorio" });
    }

    const png = await ExportService.exportFlattenedMap({
      floor,
      annotations: annotations.filter((annotation) => annotation.floor === floor),
    });

    res.contentType("image/png");
    res.send(png);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

exportRoutes.post("/super-map", async (req, res) => {
  try {
    const annotations = (req.body?.annotations ?? []) as ExportAnnotation[];
    const png = await ExportService.exportFlattenedMap({ annotations });

    res.contentType("image/png");
    res.send(png);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

exportRoutes.post("/global-clean", async (req, res) => {
  try {
    const annotations = (req.body?.annotations ?? []) as ExportAnnotation[];
    const png = await ExportService.exportFlattenedMap({
      floor: TIBIA_SURFACE_FLOOR,
      annotations: annotations.filter((annotation) => annotation.floor === TIBIA_SURFACE_FLOOR),
    });

    res.contentType("image/png");
    res.send(png);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});
