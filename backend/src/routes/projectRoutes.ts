import { Router } from "express";
import { ProjectConfig } from "../types/ProjectConfig";
import { getProjectsDir, readJsonFile, writeJsonFile } from "../utils/fileUtils";
import path from "path";

export const projectRoutes = Router();

const PROJECT_CONFIG_FILE = "config.json";

projectRoutes.get("/", (_req, res) => {
  try {
    const configPath = path.join(getProjectsDir(), PROJECT_CONFIG_FILE);
    const config = readJsonFile<ProjectConfig | null>(configPath, null);

    if (!config) {
      return res.status(404).json({ message: "Nenhum projeto aberto" });
    }

    res.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});

projectRoutes.post("/save", (req, res) => {
  try {
    const config: ProjectConfig = req.body;

    if (!config.projectName || !config.sourcePath) {
      return res
        .status(400)
        .json({ message: "projectName e sourcePath são obrigatórios" });
    }

    const now = new Date().toISOString();
    const fullConfig: ProjectConfig = {
      ...config,
      updatedAt: now,
      createdAt: config.createdAt || now,
    };

    const configPath = path.join(getProjectsDir(), PROJECT_CONFIG_FILE);
    writeJsonFile(configPath, fullConfig);

    res.json({
      message: "Projeto salvo com sucesso",
      config: fullConfig,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    res.status(500).json({ message });
  }
});
