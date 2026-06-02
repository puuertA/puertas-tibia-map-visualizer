import { Router } from "express";
import { MapImportService } from "../services/MapImportService";
import { TileGeneratorService } from "../services/TileGeneratorService";
import { BootstrapService } from "../services/BootstrapService";
import { getMapsImportedDir, getMapsOriginalDir, listPngFiles } from "../utils/fileUtils";

export const mapRoutes = Router();

mapRoutes.post("/import", (req, res) => {
  try {
    const { sourcePath } = req.body;

    if (!sourcePath || typeof sourcePath !== "string") {
      return res.status(400).json({ message: "sourcePath é obrigatório" });
    }

    const result = MapImportService.importMaps(sourcePath);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.get("/floors", (_req, res) => {
  try {
    const floors = MapImportService.getImportedFloors();
    res.json({ floors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

mapRoutes.post("/tiles/generate", (_req, res) => {
  try {
    const result = TileGeneratorService.generateTiles();
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.post("/refresh", (_req, res) => {
  try {
    const result = BootstrapService.initialize();
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.get("/status", (_req, res) => {
  try {
    const originalFiles = listPngFiles(getMapsOriginalDir()).length;
    const importedFiles = listPngFiles(getMapsImportedDir()).length;
    const floors = TileGeneratorService.getProcessedFloors();

    res.json({
      success: true,
      originalFiles,
      importedFiles,
      floors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});
