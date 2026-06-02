interface LayerPanelProps {
  showPlaceLabels: boolean;
  onShowPlaceLabelsChange: (show: boolean) => void;
}

export function LayerPanel({ showPlaceLabels, onShowPlaceLabelsChange }: LayerPanelProps) {
  return (
    <section className="panel" data-tour="layers">
      <h3>Camadas</h3>
      <label className="toggle-line">
        <input type="checkbox" defaultChecked />
        <span>Mostrar marcações globais</span>
      </label>
      <label className="toggle-line">
        <input type="checkbox" defaultChecked />
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
