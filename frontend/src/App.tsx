import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ExportPanel } from "./components/ExportPanel";
import { FloorSelector } from "./components/FloorSelector";
import { LayerPanel } from "./components/LayerPanel";
import { MapViewer } from "./components/MapViewer";
import { Sidebar } from "./components/Sidebar";
import { api } from "./services/api";
import { ExportAnnotation } from "./types/ExportAnnotation";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

function App() {
  const [selectedFloor, setSelectedFloor] = useState(7);
  const [status, setStatus] = useState<{ originalFiles: number; importedFiles: number; floors: number[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [annotationsByFloor, setAnnotationsByFloor] = useState<Record<number, ExportAnnotation[]>>({});
  const [annotationsRevision, setAnnotationsRevision] = useState(0);
  const [showGlobalAnnotations, setShowGlobalAnnotations] = useState(true);
  const [showFloorAnnotations, setShowFloorAnnotations] = useState(true);
  const [showPlaceLabels, setShowPlaceLabels] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  function notify(type: ToastType, title: string, description?: string) {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }

  async function loadStatus() {
    try {
      const response = await api.get("/maps/status");
      setStatus(response.data);
    } catch (error) {
      console.error("Erro ao carregar status:", error);
      notify("error", "Não foi possível carregar o status", "Verifique se o backend está online.");
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await api.post("/maps/refresh");
      await loadStatus();
      notify("success", "Recursos atualizados", "Mapas e tiles foram recarregados.");
    } catch (error) {
      console.error("Erro ao atualizar recursos:", error);
      notify("error", "Erro ao atualizar recursos", "Confira o backend e tente novamente.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleSaveAnnotations() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      annotationsByFloor,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "marcacoes_tibia_map.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("success", "Marcações salvas", "O arquivo JSON foi baixado.");
  }

  async function handleLoadAnnotations(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        annotationsByFloor?: Record<string, ExportAnnotation[]>;
      };

      if (!parsed.annotationsByFloor || typeof parsed.annotationsByFloor !== "object") {
        throw new Error("Arquivo sem marcações válidas");
      }

      const nextAnnotations = Object.fromEntries(
        Object.entries(parsed.annotationsByFloor).map(([floor, annotations]) => [
          Number(floor),
          Array.isArray(annotations) ? annotations : [],
        ])
      ) as Record<number, ExportAnnotation[]>;

      setAnnotationsByFloor(nextAnnotations);
      setAnnotationsRevision((revision) => revision + 1);
      notify("success", "Marcações carregadas", "Seu arquivo JSON foi aplicado ao mapa.");
    } catch (error) {
      console.error("Erro ao carregar marcações:", error);
      notify("error", "Não foi possível carregar", "Esse arquivo não parece ter marcações válidas.");
    }
  }

  return (
    <div className="app-layout">
      <Sidebar>
        <h1 className="title">Puerta&apos;s Tibia Map Visualizer</h1>

        <section className="panel">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            type="button"
            className="primary-button"
          >
            {refreshing ? "Atualizando..." : "Atualizar Recursos"}
          </button>
          <p className="hint-text">
            {status
              ? `${status.originalFiles} imagens carregadas | ${status.floors.length} andares detectados`
              : "Carregando recursos locais..."}
          </p>
        </section>

        <FloorSelector floor={selectedFloor} onFloorChange={setSelectedFloor} />
        <LayerPanel
          showGlobalAnnotations={showGlobalAnnotations}
          showFloorAnnotations={showFloorAnnotations}
          showPlaceLabels={showPlaceLabels}
          onShowGlobalAnnotationsChange={setShowGlobalAnnotations}
          onShowFloorAnnotationsChange={setShowFloorAnnotations}
          onShowPlaceLabelsChange={setShowPlaceLabels}
        />
        <section className="panel" data-tour="annotations">
          <h3>Marcações</h3>
          <div className="toolbar-grid">
            <button type="button" className="tool-button" onClick={handleSaveAnnotations}>
              Salvar
            </button>
            <button type="button" className="tool-button" onClick={() => fileInputRef.current?.click()}>
              Carregar
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept="application/json,.json"
            onChange={handleLoadAnnotations}
          />
          <p className="hint-text">Salva e carrega seus desenhos e marcações em JSON.</p>
        </section>
        <ExportPanel
          floor={selectedFloor}
          annotations={Object.values(annotationsByFloor).flat()}
          onNotify={notify}
        />
        <section className="panel">
          <button type="button" className="tool-button full-width-button" onClick={() => setTutorialOpen(true)}>
            Abrir Tutorial
          </button>
        </section>
      </Sidebar>

      <main className="main-content">
        <header className="page-header">
          <h2>Visualizador do Mapa - Andar {selectedFloor}</h2>
        </header>
        <MapViewer
          selectedFloor={selectedFloor}
          showGlobalAnnotations={showGlobalAnnotations}
          showFloorAnnotations={showFloorAnnotations}
          showPlaceLabels={showPlaceLabels}
          annotationsRevision={annotationsRevision}
          annotationsByFloor={annotationsByFloor}
          onFloorAnnotationsChange={(floor, annotations) => {
            setAnnotationsByFloor((current) => ({
              ...current,
              [floor]: annotations,
            }));
          }}
        />
      </main>
      {tutorialOpen && <TutorialOverlay onClose={() => setTutorialOpen(false)} />}
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
    </div>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon" aria-hidden>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
          </div>
          <div className="toast-content">
            <strong>{toast.title}</strong>
            {toast.description && <span>{toast.description}</span>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const steps = [
    {
      title: "Bem-vindo ao mapa",
      text: "Aqui você navega pelo mapa do Tibia, troca andares, inspeciona pixels e desenha marcações diretamente sobre o mapa.",
      highlight: "map",
    },
    {
      title: "Andares",
      text: "Use o seletor de andar na lateral para alternar entre superfície, andares superiores e subsolos. O andar arquivo 7 representa o nível 0 do Tibia.",
      highlight: "floors",
    },
    {
      title: "Mira e pixels",
      text: "A mira mostra o pixel selecionado e as coordenadas X, Y e Z. Passe o mouse para ver a borda azul e clique para fixar a seleção.",
      highlight: "map",
    },
    {
      title: "Desenho",
      text: "Na barra de ferramentas você escolhe mover mapa, desenho livre, linha, seta, retângulo, círculo ou texto. A rodinha do mouse continua dando zoom mesmo com ferramenta ativa.",
      highlight: "drawing",
    },
    {
      title: "Atalhos",
      text: "Use Ctrl+Z para desfazer, Ctrl+Y ou Ctrl+Shift+Z para refazer. Ferramentas: V mover, B pincel, L linha, A seta, R retângulo, C círculo e T texto.",
      highlight: "drawing",
    },
    {
      title: "Camadas",
      text: "A camada de nomes dos lugares fica desligada por padrão. Ligue quando quiser contexto e desligue quando quiser o mapa limpo.",
      highlight: "layers",
    },
    {
      title: "Salvar e carregar",
      text: "Use Salvar para baixar suas marcações em JSON. Use Carregar para restaurar esse arquivo depois, inclusive em outra sessão.",
      highlight: "annotations",
    },
    {
      title: "Exportação",
      text: "Exporte o andar atual, o mapa limpo da superfície ou o mapa com 16 andares chapados. Os desenhos entram junto na imagem exportada.",
      highlight: "export",
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    function updateHighlight() {
      const element = document.querySelector(`[data-tour="${current.highlight}"]`);
      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 8;
      setHighlightRect({
        left: Math.max(8, rect.left - padding),
        top: Math.max(8, rect.top - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    }

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [current.highlight]);

  return (
    <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      {highlightRect && (
        <div
          className="tutorial-highlight"
          style={{
            left: `${highlightRect.left}px`,
            top: `${highlightRect.top}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
          }}
          aria-hidden
        />
      )}
      <div className="tutorial-card">
        <div className="tutorial-kicker">Tutorial {step + 1} / {steps.length}</div>
        <h2 id="tutorial-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="tutorial-progress" aria-hidden>
          {steps.map((_, index) => (
            <span key={index} className={index === step ? "tutorial-dot active" : "tutorial-dot"} />
          ))}
        </div>
        <div className="tutorial-actions">
          <button type="button" className="tool-button" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="tool-button"
            disabled={step === 0}
            onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          >
            Voltar
          </button>
          <button
            type="button"
            className="primary-button tutorial-next"
            onClick={() => (isLast ? onClose() : setStep((currentStep) => currentStep + 1))}
          >
            {isLast ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
