import { Router } from "express";
import { TileGeneratorService } from "../services/TileGeneratorService";

export const tileRoutes = Router();

tileRoutes.get("/:floor/metadata", (req, res) => {
  try {
    const floor = parseInt(req.params.floor, 10);
    const metadata = TileGeneratorService.getFloorMetadata(floor);
    res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

tileRoutes.get("/:floor/:baseX/:baseY", (req, res) => {
  try {
    const floor = parseInt(req.params.floor, 10);
    const baseX = parseInt(req.params.baseX, 10);
    const baseY = parseInt(req.params.baseY, 10);

    const resolvedPath = `data/tiles/floor_${floor}/tile_${baseX}_${baseY}.png`;
    const tileBuffer = TileGeneratorService.getTile(floor, baseX, baseY);

    console.log("[tiles] Tile solicitado:", {
      floor,
      x: baseX,
      y: baseY,
      pathResolvido: resolvedPath,
      arquivoExiste: Boolean(tileBuffer),
    });

    if (!tileBuffer) {
      return res.status(404).json({
        message: "Tile nao encontrado",
        floor,
        x: baseX,
        y: baseY,
        path: resolvedPath,
      });
    }

    res.contentType("image/png");
    res.send(tileBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

tileRoutes.get("/floors/processed", (_req, res) => {
  try {
    const floors = TileGeneratorService.getProcessedFloors();
    res.json({ floors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});