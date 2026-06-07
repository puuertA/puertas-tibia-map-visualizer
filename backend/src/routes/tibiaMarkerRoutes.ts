import { Router } from "express";
import { TibiaMinimapMarkerService } from "../services/TibiaMinimapMarkerService";

export const tibiaMarkerRoutes = Router();

tibiaMarkerRoutes.get("/default-path", (_req, res) => {
  try {
    res.json({ path: TibiaMinimapMarkerService.getDefaultMarkersPath() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

tibiaMarkerRoutes.get("/default", (_req, res) => {
  try {
    res.json(TibiaMinimapMarkerService.importDefaultMarkers());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(404).json({ message });
  }
});
