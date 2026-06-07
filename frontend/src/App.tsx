import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ExportPanel } from "./components/ExportPanel";
import { FloorSelector } from "./components/FloorSelector";
import { LayerPanel } from "./components/LayerPanel";
import { MapViewer } from "./components/MapViewer";
import { Sidebar } from "./components/Sidebar";
import { api, importDefaultTibiaMaps, importDefaultTibiaMarkers } from "./services/api";
import { ExportAnnotation } from "./types/ExportAnnotation";
import { parseTibiaMinimapMarkers } from "./utils/tibiaMinimapMarkers";

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
  const [importingTibiaMaps, setImportingTibiaMaps] = useState(false);
  const [annotationsByFloor, setAnnotationsByFloor] = useState<Record<number, ExportAnnotation[]>>({});
  const [tibiaMarkersByFloor, setTibiaMarkersByFloor] = useState<Record<number, ExportAnnotation[]>>({});
  const [annotationsRevision, setAnnotationsRevision] = useState(0);
  const [tibiaMarkersRevision, setTibiaMarkersRevision] = useState(0);
  const [resourcesRevision, setResourcesRevision] = useState(0);
  const [showGlobalAnnotations, setShowGlobalAnnotations] = useState(true);
  const [showFloorAnnotations, setShowFloorAnnotations] = useState(true);
  const [showTibiaGlobalMarkers, setShowTibiaGlobalMarkers] = useState(false);
  const [showTibiaFloorMarkers, setShowTibiaFloorMarkers] = useState(true);
  const [showPlaceLabels, setShowPlaceLabels] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(() => {
    return window.localStorage.getItem("tibia-map-release-notes-v2") !== "seen";
  });
  const [importingTibiaMarkers, setImportingTibiaMarkers] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tibiaMarkersInputRef = useRef<HTMLInputElement | null>(null);

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
      setResourcesRevision((revision) => revision + 1);
      notify("success", "Recursos atualizados", "Mapas e tiles foram recarregados.");
    } catch (error) {
      console.error("Erro ao atualizar recursos:", error);
      notify("error", "Erro ao atualizar recursos", "Confira o backend e tente novamente.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleImportDefaultTibiaMaps() {
    try {
      setImportingTibiaMaps(true);
      const result = await importDefaultTibiaMaps();
      await loadStatus();

      if (result.floors.length > 0) {
        setSelectedFloor((currentFloor) => result.floors.includes(currentFloor) ? currentFloor : result.floors[0]);
      } else {
        setSelectedFloor(7);
      }
      setResourcesRevision((revision) => revision + 1);

      notify(
        "success",
        "Mapa do client importado",
        result.importedFiles > 0
          ? `${result.importedFiles} arquivos e ${result.importedFloorsCount} andares foram carregados.`
          : "Nenhum PNG encontrado. O mapa foi limpo."
      );
    } catch (error) {
      console.error("Erro ao importar mapa do client Tibia:", error);
      notify("error", "Nao foi possivel importar o mapa", "Confira se o client Tibia ja criou arquivos na pasta minimap.");
    } finally {
      setImportingTibiaMaps(false);
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

  async function handleImportTibiaMarkers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const importedByFloor = parseTibiaMinimapMarkers(await file.arrayBuffer());
      const importedCount = mergeImportedTibiaMarkers(importedByFloor);
      notify("success", "Marcacoes do Tibia importadas", `${importedCount} marcacoes adicionadas do client.`);
    } catch (error) {
      console.error("Erro ao importar marcacoes do Tibia:", error);
      notify("error", "Nao foi possivel importar", "Selecione o arquivo minimapmarkers.bin do client Tibia.");
    }
  }

  function mergeImportedTibiaMarkers(importedByFloor: Record<string, ExportAnnotation[]>) {
    const importedCount = Object.values(importedByFloor).reduce((total, annotations) => total + annotations.length, 0);

    if (importedCount === 0) {
      throw new Error("Arquivo sem marcacoes");
    }

    setTibiaMarkersByFloor((current) => {
      const next = { ...current };
      Object.entries(importedByFloor).forEach(([floor, annotations]) => {
        const numericFloor = Number(floor);
        next[numericFloor] = [...(next[numericFloor] ?? []), ...annotations];
      });
      return next;
    });
    setTibiaMarkersRevision((revision) => revision + 1);
    return importedCount;
  }

  async function handleImportDefaultTibiaMarkers() {
    try {
      setImportingTibiaMarkers(true);
      const result = await importDefaultTibiaMarkers();
      const importedCount = mergeImportedTibiaMarkers(result.annotationsByFloor);
      notify("success", "Marcacoes do Tibia importadas", `${importedCount} marcacoes adicionadas de minimapmarkers.bin.`);
    } catch (error) {
      console.error("Erro ao importar marcacoes padrao do Tibia:", error);
      notify("error", "Nao foi possivel importar automaticamente", "Use o fallback e selecione minimapmarkers.bin manualmente.");
    } finally {
      setImportingTibiaMarkers(false);
    }
  }

  function handleCloseReleaseNotes() {
    window.localStorage.setItem("tibia-map-release-notes-v2", "seen");
    setReleaseNotesOpen(false);
  }

  const siteAnnotationsCount = Object.values(annotationsByFloor).flat().length;
  const tibiaMarkersCount = Object.values(tibiaMarkersByFloor).flat().length;
  const availableFloors = status?.floors.length ?? 0;

  return (
    <div className="app-shell root-theme">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-copy">
            <span className="badge header-badge">Tibia Map Toolkit</span>
            <div className="header-title-row">
              <h1 className="header-title">Puerta&apos;s Tibia Map Visualizer</h1>
            </div>
            <p className="header-subtitle">
              Visualize o minimapa do Tibia, importe marcacoes do client e prepare exports limpos para rotas, hunts e analises.
            </p>
          </div>

          <div className="header-actions">
            <button type="button" className="ghost-button" onClick={() => setTutorialOpen(true)}>
              Tutorial
            </button>
            <button
              onClick={handleImportDefaultTibiaMaps}
              disabled={importingTibiaMaps}
              type="button"
              className="primary-button header-primary-button"
              title="Importa automaticamente os PNGs de C:\\Users\\Administrator\\AppData\\Local\\Tibia\\packages\\Tibia\\minimap"
            >
              {importingTibiaMaps ? "Importando mapa..." : "Importar Mapa"}
            </button>
          </div>
        </div>
        <div className="header-glow" />
      </header>

      <div className="app-layout">
        <Sidebar>
          <section className="sidebar-summary">
            <span className="stat-label">Andar atual</span>
            <strong>{selectedFloor}</strong>
            <span>Tibia {selectedFloor === 7 ? "nivel 0" : selectedFloor < 7 ? `+${7 - selectedFloor}` : `${7 - selectedFloor}`}</span>
          </section>

        <section className="panel">
          <div className="card-header compact-card-header">
            <div>
              <span className="stat-label">Recursos</span>
              <h3>Mapa local</h3>
            </div>
            <span className={status ? "badge badge-success" : "badge badge-warning"}>
              {status ? "Online" : "Carregando"}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            type="button"
            className="primary-button"
          >
            {refreshing ? "Atualizando..." : "Atualizar Recursos"}
          </button>
          <button
            onClick={handleImportDefaultTibiaMaps}
            disabled={importingTibiaMaps}
            type="button"
            className="tool-button full-width-button resource-action-button"
            title="Importa automaticamente os PNGs de C:\\Users\\Administrator\\AppData\\Local\\Tibia\\packages\\Tibia\\minimap"
          >
            {importingTibiaMaps ? "Importando mapa..." : "Importar Mapa do Client"}
          </button>
          <p className="hint-text">
            {status
              ? `${status.originalFiles} imagens carregadas | ${status.floors.length} andares detectados`
              : "Carregando recursos locais..."}
          </p>
        </section>

        <FloorSelector
          floor={selectedFloor}
          resourcesRevision={resourcesRevision}
          onFloorChange={setSelectedFloor}
        />
        <LayerPanel
          showGlobalAnnotations={showGlobalAnnotations}
          showFloorAnnotations={showFloorAnnotations}
          showTibiaGlobalMarkers={showTibiaGlobalMarkers}
          showTibiaFloorMarkers={showTibiaFloorMarkers}
          showPlaceLabels={showPlaceLabels}
          onShowGlobalAnnotationsChange={setShowGlobalAnnotations}
          onShowFloorAnnotationsChange={setShowFloorAnnotations}
          onShowTibiaGlobalMarkersChange={setShowTibiaGlobalMarkers}
          onShowTibiaFloorMarkersChange={setShowTibiaFloorMarkers}
          onShowPlaceLabelsChange={setShowPlaceLabels}
        />
      </Sidebar>

      <aside className="right-sidebar" data-tour="right-actions">
        <section className="panel" data-tour="annotations">
          <h3>Marcações</h3>
          <div className="toolbar-grid">
            <button type="button" className="tool-button" onClick={handleSaveAnnotations}>
              Salvar
            </button>
            <button type="button" className="tool-button" onClick={() => fileInputRef.current?.click()}>
              Carregar
            </button>
            <button
              type="button"
              className="tool-button full-grid-button"
              onClick={handleImportDefaultTibiaMarkers}
              disabled={importingTibiaMarkers}
              title="Importa automaticamente C:\\Users\\Administrator\\AppData\\Local\\Tibia\\packages\\Tibia\\minimap\\minimapmarkers.bin"
            >
              {importingTibiaMarkers ? "Importando..." : "Importar Client"}
            </button>
            <button
              type="button"
              className="tool-button full-grid-button secondary-tool-button"
              onClick={() => tibiaMarkersInputRef.current?.click()}
              title="Fallback: selecione manualmente o arquivo minimapmarkers.bin dentro da pasta minimap do client Tibia."
            >
              Escolher minimapmarkers.bin
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept="application/json,.json"
            onChange={handleLoadAnnotations}
          />
          <input
            ref={tibiaMarkersInputRef}
            className="hidden-file-input"
            type="file"
            accept=".bin,application/octet-stream"
            onChange={handleImportTibiaMarkers}
          />
          <p className="hint-text">Salva JSON ou importa o minimapmarkers.bin do client Tibia.</p>
        </section>
        <ExportPanel
          floor={selectedFloor}
          annotations={[...Object.values(annotationsByFloor).flat(), ...Object.values(tibiaMarkersByFloor).flat()]}
          onNotify={notify}
        />
        <section className="panel">
          <button type="button" className="tool-button full-width-button" onClick={() => setTutorialOpen(true)}>
            Abrir Tutorial
          </button>
        </section>
      </aside>

      <main className="main-content">
        <header className="page-header dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="badge header-badge">Mapa Interativo</span>
            <h2>Visualizador do Mapa</h2>
            <p>Navegue por andares, inspecione coordenadas e desenhe marcacoes direto sobre o minimapa.</p>
          </div>
          <div className="dashboard-kpi-grid">
            <article className="stat-card">
              <span className="stat-label">Andares</span>
              <strong className="stat-value stat-value--lg">{availableFloors || "-"}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Site</span>
              <strong className="stat-value stat-value--lg">{siteAnnotationsCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Client</span>
              <strong className="stat-value stat-value--lg">{tibiaMarkersCount}</strong>
            </article>
          </div>
        </header>
        <MapViewer
          selectedFloor={selectedFloor}
          showGlobalAnnotations={showGlobalAnnotations}
          showFloorAnnotations={showFloorAnnotations}
          showTibiaGlobalMarkers={showTibiaGlobalMarkers}
          showTibiaFloorMarkers={showTibiaFloorMarkers}
          showPlaceLabels={showPlaceLabels}
          annotationsRevision={annotationsRevision}
          tibiaMarkersRevision={tibiaMarkersRevision}
          resourcesRevision={resourcesRevision}
          annotationsByFloor={annotationsByFloor}
          tibiaMarkersByFloor={tibiaMarkersByFloor}
          onFloorAnnotationsChange={(floor, annotations) => {
            setAnnotationsByFloor((current) => ({
              ...current,
              [floor]: annotations,
            }));
          }}
        />
      </main>
      </div>
      {releaseNotesOpen && <ReleaseNotesOverlay onClose={handleCloseReleaseNotes} />}
      {tutorialOpen && <TutorialOverlay onClose={() => setTutorialOpen(false)} />}
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
    </div>
  );
}

function ReleaseNotesOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="release-notes-backdrop" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
      <div className="release-notes-card">
        <div className="tutorial-kicker">Notas de Atualizacao</div>
        <h2 id="release-notes-title">Novidades desta versao</h2>
        <div className="release-notes-list">
          <article>
            <h3>Mapa do seu client</h3>
            <p>Agora tambem da para importar os arquivos de minimapa salvos pelo seu client Tibia direto para o visualizador.</p>
          </article>
          <article>
            <h3>Importacao do client Tibia</h3>
            <p>O botao Importar Client traz para o app as marcacoes do minimapa salvas no seu client Tibia.</p>
          </article>
          <article>
            <h3>Camadas separadas</h3>
            <p>Marcacoes do site e marcacoes do client Tibia agora tem visibilidade independente por andar atual e outros andares.</p>
          </article>
          <article>
            <h3>Marcacoes familiares</h3>
            <p>As marcacoes importadas aparecem no mapa com os mesmos simbolos que voce ja usa no minimapa do Tibia.</p>
          </article>
        </div>
        <div className="tutorial-actions">
          <button type="button" className="primary-button tutorial-next" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
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
  const tutorialSteps = [
    {
      title: "Bem-vindo ao mapa",
      text: "Aqui voce navega pelo mapa do Tibia, troca andares, inspeciona pixels e desenha marcacoes diretamente sobre o mapa.",
      highlight: "map",
    },
    {
      title: "Andares",
      text: "Use o seletor de andar na barra esquerda para alternar entre superficie, andares superiores e subsolos. O andar arquivo 7 representa o nivel 0 do Tibia.",
      highlight: "floors",
    },
    {
      title: "Barra esquerda",
      text: "A barra esquerda concentra contexto e filtros: andar atual, recursos locais, seletor de andar e controles de camadas.",
      highlight: "layers",
    },
    {
      title: "Mira e pixels",
      text: "A mira mostra o pixel selecionado e as coordenadas X, Y e Z. Passe o mouse para ver a borda azul e clique para fixar a selecao.",
      highlight: "map",
    },
    {
      title: "Importar mapa",
      text: "Use Importar Mapa do Client na barra esquerda ou no topo para carregar os arquivos de minimapa criados pelo proprio Tibia.",
      highlight: "floors",
    },
    {
      title: "Desenho",
      text: "Na barra de ferramentas voce escolhe mover mapa, desenho livre, linha, seta, retangulo, circulo ou texto. Clique no quadradinho de cor para mudar a cor dos proximos desenhos.",
      highlight: "drawing",
    },
    {
      title: "Atalhos",
      text: "Use Ctrl+Z para desfazer, Ctrl+Y ou Ctrl+Shift+Z para refazer. Ferramentas: V mover, B pincel, L linha, A seta, R retangulo, C circulo e T texto.",
      highlight: "drawing",
    },
    {
      title: "Camadas",
      text: "As marcacoes do site e as marcacoes importadas do client Tibia tem controles separados. Por padrao, as marcacoes do client mostram apenas o andar atual.",
      highlight: "layers",
    },
    {
      title: "Importar Client",
      text: "A barra direita concentra as acoes de arquivo. Use Importar Client para trazer marcacoes do Tibia ou Escolher minimapmarkers.bin se o client estiver em outro caminho.",
      highlight: "right-actions",
    },
    {
      title: "Salvar e carregar",
      text: "Na barra direita, use Salvar para baixar suas marcacoes do site em JSON e Carregar para restaurar esse arquivo depois.",
      highlight: "annotations",
    },
    {
      title: "Icones do Tibia",
      text: "As marcacoes do client usam icones embutidos no app. Se algum asset falhar por qualquer motivo, o numero do icone aparece como fallback.",
      highlight: "annotations",
    },
    {
      title: "Exportacao",
      text: "A exportacao tambem fica na barra direita. Exporte o andar atual, o mapa limpo da superficie ou o mapa com 16 andares chapados.",
      highlight: "export",
    },
  ];
  const current = tutorialSteps[step];
  const isLast = step === tutorialSteps.length - 1;

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
        <div className="tutorial-kicker">Tutorial {step + 1} / {tutorialSteps.length}</div>
        <h2 id="tutorial-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="tutorial-progress" aria-hidden>
          {tutorialSteps.map((_, index) => (
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
