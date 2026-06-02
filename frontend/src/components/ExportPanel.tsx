import { useState } from "react";
import { API_BASE } from "../services/api";
import { ExportAnnotation } from "../types/ExportAnnotation";

interface ExportPanelProps {
  floor?: number;
  annotations?: ExportAnnotation[];
  onNotify?: (type: "success" | "error" | "info", title: string, description?: string) => void;
}

export function ExportPanel({ floor = 7, annotations = [], onNotify }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);

  async function downloadPng(endpoint: string, body: unknown, filename: string, errorLabel: string) {
    try {
      setExporting(true);
      const response = await fetch(`${API_BASE}/export/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        onNotify?.("success", "Exportação concluída", `${filename} foi baixado.`);
      } else {
        onNotify?.("error", "Não foi possível exportar", `Falha ao exportar ${errorLabel}.`);
      }
    } catch (error) {
      console.error(`Erro ao exportar ${errorLabel}:`, error);
      onNotify?.("error", "Erro na exportação", "Confira a conexão com o backend.");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportFloor() {
    await downloadPng("floor", { floor, annotations }, `mapa_andar_${floor}.png`, "o andar");
  }

  async function handleExportCombinedMap() {
    await downloadPng("super-map", { annotations }, "mapa_16_andares.png", "o mapa 16 andares");
  }

  async function handleExportCleanGlobalMap() {
    await downloadPng("global-clean", { annotations }, "mapa_global_limpo.png", "o mapa global limpo");
  }

  return (
    <section className="panel" data-tour="export">
      <h3>Exportação</h3>
      <div className="toolbar-grid">
        <button
          onClick={handleExportFloor}
          disabled={exporting}
          type="button"
          className="tool-button"
        >
          {exporting ? "Exportando..." : "Andar (PNG)"}
        </button>
        <button
          onClick={handleExportCombinedMap}
          disabled={exporting}
          type="button"
          className="tool-button"
        >
          {exporting ? "Processando..." : "Mapa 16 Andares"}
        </button>
        <button
          onClick={handleExportCleanGlobalMap}
          disabled={exporting}
          type="button"
          className="tool-button"
        >
          {exporting ? "Processando..." : "Mapa Global Limpo"}
        </button>
      </div>
    </section>
  );
}
