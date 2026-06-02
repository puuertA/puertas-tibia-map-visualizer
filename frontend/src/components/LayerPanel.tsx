interface LayerPanelProps {
  showGlobalAnnotations: boolean;
  showFloorAnnotations: boolean;
  showPlaceLabels: boolean;
  onShowGlobalAnnotationsChange: (show: boolean) => void;
  onShowFloorAnnotationsChange: (show: boolean) => void;
  onShowPlaceLabelsChange: (show: boolean) => void;
}

export function LayerPanel({
  showGlobalAnnotations,
  showFloorAnnotations,
  showPlaceLabels,
  onShowGlobalAnnotationsChange,
  onShowFloorAnnotationsChange,
  onShowPlaceLabelsChange,
}: LayerPanelProps) {
  return (
    <section className="panel" data-tour="layers">
      <h3>Camadas</h3>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showGlobalAnnotations}
          onChange={(event) => onShowGlobalAnnotationsChange(event.target.checked)}
        />
        <span>Mostrar marcações de outros andares</span>
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showFloorAnnotations}
          onChange={(event) => onShowFloorAnnotationsChange(event.target.checked)}
        />
        <span>Mostrar marcações do andar</span>
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showPlaceLabels}
          onChange={(event) => onShowPlaceLabelsChange(event.target.checked)}
        />
        <span>Mostrar nomes dos lugares</span>
      </label>
    </section>
  );
}
