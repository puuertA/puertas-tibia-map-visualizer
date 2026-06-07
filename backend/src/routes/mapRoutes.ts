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

    const importResult = MapImportService.importMaps(sourcePath);

    if (!importResult.success) {
      return res.status(404).json(importResult);
    }

    const tileResult = TileGeneratorService.generateTiles();
    res.json({
      ...importResult,
      tilesGenerated: tileResult.success,
      generatedTiles: tileResult.generatedTiles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.post("/import/default", (_req, res) => {
  try {
    const importResult = MapImportService.importDefaultMaps();

    if (!importResult.success) {
      return res.status(404).json(importResult);
    }

    const tileResult = TileGeneratorService.generateTiles();
    res.json({
      ...importResult,
      tilesGenerated: tileResult.success,
      generatedTiles: tileResult.generatedTiles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.post("/import/files", (req, res) => {
  try {
    const { files, clearExisting, generateTiles } = req.body;

    if (!Array.isArray(files)) {
      return res.status(400).json({ message: "files deve ser uma lista", success: false });
    }

    const importResult = MapImportService.importUploadedMapFiles(files, Boolean(clearExisting));

    if (!importResult.success) {
      return res.status(400).json(importResult);
    }

    if (!generateTiles) {
      return res.json({
        ...importResult,
        tilesGenerated: false,
        generatedTiles: 0,
      });
    }

    const tileResult = TileGeneratorService.generateTiles();
    res.json({
      ...importResult,
      tilesGenerated: tileResult.success,
      generatedTiles: tileResult.generatedTiles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message, success: false });
  }
});

mapRoutes.get("/default-minimap-path", (_req, res) => {
  try {
    res.json({ path: MapImportService.getDefaultMinimapPath() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
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
