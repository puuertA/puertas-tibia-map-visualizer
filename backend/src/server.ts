import cors from "cors";
import express from "express";
import { annotationRoutes } from "./routes/annotationRoutes";
import { exportRoutes } from "./routes/exportRoutes";
import { mapRoutes } from "./routes/mapRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { tibiaMarkerRoutes } from "./routes/tibiaMarkerRoutes";
import { tileRoutes } from "./routes/tileRoutes";
import { ensureDirectories } from "./utils/fileUtils";
import { BootstrapService } from "./services/BootstrapService";

const app = express();
const port = Number(process.env.PORT ?? 3333);
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

// Inicializa diretórios
ensureDirectories();
BootstrapService.initialize();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "tibia-map-editor-backend" });
});

app.use("/api/maps", mapRoutes);
app.use("/api/tiles", tileRoutes);
app.use("/api/annotations", annotationRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/tibia-markers", tibiaMarkerRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`[backend] running on http://localhost:${port}`);
});
