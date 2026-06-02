export type DrawingTool = "pan" | "brush" | "line" | "arrow" | "rect" | "circle" | "text";

interface DrawingToolbarProps {
  className?: string;
  brushColor: string;
  selectedTool: DrawingTool;
  canUndo: boolean;
  canRedo: boolean;
  onColorChange: (color: string) => void;
  onToolChange: (tool: DrawingTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const tools: Array<{ id: DrawingTool; label: string; shortcut: string }> = [
  { id: "pan", label: "Mover mapa", shortcut: "V" },
  { id: "brush", label: "Desenho livre", shortcut: "B" },
  { id: "line", label: "Linha", shortcut: "L" },
  { id: "arrow", label: "Seta", shortcut: "A" },
  { id: "rect", label: "Retangulo", shortcut: "R" },
  { id: "circle", label: "Circulo", shortcut: "C" },
  { id: "text", label: "Texto", shortcut: "T" },
];

function ToolIcon({ tool }: { tool: DrawingTool }) {
  if (tool === "pan") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 11V7a2 2 0 0 1 4 0v3" />
        <path d="M11 10V5a2 2 0 0 1 4 0v5" />
        <path d="M15 10V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-1a7 7 0 0 1-5.6-2.8L3.7 14.6a2 2 0 0 1 3.2-2.4L9 15" />
      </svg>
    );
  }

  if (tool === "brush") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 4.5l4 4L9 19l-5 1 1-5 10.5-10.5z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    );
  }

  if (tool === "line") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19L19 5" />
        <circle cx="5" cy="19" r="1.5" />
        <circle cx="19" cy="5" r="1.5" />
      </svg>
    );
  }

  if (tool === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19L19 5" />
        <path d="M12 5h7v7" />
      </svg>
    );
  }

  if (tool === "rect") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="6" width="14" height="12" rx="1" />
      </svg>
    );
  }

  if (tool === "circle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6h14" />
      <path d="M12 6v14" />
      <path d="M9 20h6" />
    </svg>
  );
}

function ActionIcon({ action }: { action: "undo" | "redo" | "clear" }) {
  if (action === "undo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7H4v5" />
        <path d="M4 7l6 6a6 6 0 1 0 4-10" />
      </svg>
    );
  }

  if (action === "redo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 7h5v5" />
        <path d="M20 7l-6 6a6 6 0 1 1-4-10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12" />
      <path d="M10 7V5h4v2" />
      <path d="M8 7l1 14h6l1-14" />
      <path d="M11 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function DrawingToolbar({
  className,
  brushColor,
  selectedTool,
  canUndo,
  canRedo,
  onColorChange,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
}: DrawingToolbarProps) {
  return (
    <div className={className}>
      <div className="drawing-toolbar-card drawing-toolbar-column">
        <div className="drawing-tool-strip" role="toolbar" aria-label="Ferramentas de desenho">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`icon-tool-button ${selectedTool === tool.id ? "tool-button-active" : ""}`}
              onClick={() => onToolChange(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={tool.label}
            >
              <ToolIcon tool={tool.id} />
            </button>
          ))}
        </div>

        <label className="icon-color-field" title="Cor">
          <span className="color-dot" style={{ background: brushColor }} />
          <input
            type="color"
            value={brushColor}
            onChange={(e) => onColorChange(e.target.value)}
            aria-label="Cor"
          />
        </label>

        <div className="drawing-tool-strip" role="toolbar" aria-label="Historico">
          <button
            type="button"
            className="icon-tool-button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Desfazer"
            aria-label="Desfazer"
          >
            <ActionIcon action="undo" />
          </button>
          <button
            type="button"
            className="icon-tool-button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Refazer"
            aria-label="Refazer"
          >
            <ActionIcon action="redo" />
          </button>
          <button
            type="button"
            className="icon-tool-button"
            onClick={onClear}
            title="Limpar"
            aria-label="Limpar"
          >
            <ActionIcon action="clear" />
          </button>
        </div>
      </div>
    </div>
  );
}
