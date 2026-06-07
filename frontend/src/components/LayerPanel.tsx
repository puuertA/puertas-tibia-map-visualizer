interface LayerPanelProps {
  showGlobalAnnotations: boolean;
  showFloorAnnotations: boolean;
  showTibiaGlobalMarkers: boolean;
  showTibiaFloorMarkers: boolean;
  showPlaceLabels: boolean;
  onShowGlobalAnnotationsChange: (show: boolean) => void;
  onShowFloorAnnotationsChange: (show: boolean) => void;
  onShowTibiaGlobalMarkersChange: (show: boolean) => void;
  onShowTibiaFloorMarkersChange: (show: boolean) => void;
  onShowPlaceLabelsChange: (show: boolean) => void;
}

export function LayerPanel({
  showGlobalAnnotations,
  showFloorAnnotations,
  showTibiaGlobalMarkers,
  showTibiaFloorMarkers,
  showPlaceLabels,
  onShowGlobalAnnotationsChange,
  onShowFloorAnnotationsChange,
  onShowTibiaGlobalMarkersChange,
  onShowTibiaFloorMarkersChange,
  onShowPlaceLabelsChange,
}: LayerPanelProps) {
  return (
    <section className="panel" data-tour="layers">
      <h3>Camadas</h3>

      <div className="layer-group-title">Marcacoes do site</div>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showGlobalAnnotations}
          onChange={(event) => onShowGlobalAnnotationsChange(event.target.checked)}
        />
        <span>Mostrar outros andares</span>
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showFloorAnnotations}
          onChange={(event) => onShowFloorAnnotationsChange(event.target.checked)}
        />
        <span>Mostrar andar atual</span>
      </label>

      <div className="layer-group-title">Marcacoes do client Tibia</div>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showTibiaGlobalMarkers}
          onChange={(event) => onShowTibiaGlobalMarkersChange(event.target.checked)}
        />
        <span>Mostrar outros andares</span>
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={showTibiaFloorMarkers}
          onChange={(event) => onShowTibiaFloorMarkersChange(event.target.checked)}
        />
        <span>Mostrar andar atual</span>
      </label>

      <div className="layer-group-title">Mapa</div>
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
