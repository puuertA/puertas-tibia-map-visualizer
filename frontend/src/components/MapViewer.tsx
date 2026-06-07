import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { AnnotationCanvas } from "./AnnotationCanvas";
import { DrawingToolbar, DrawingTool } from "./DrawingToolbar";
import { PlaceLabels } from "./PlaceLabels";
import { getTileMetadata, getTileImageUrl } from "../services/api";
import { ExportAnnotation } from "../types/ExportAnnotation";

interface MapViewerProps {
  selectedFloor: number;
  showGlobalAnnotations: boolean;
  showFloorAnnotations: boolean;
  showTibiaGlobalMarkers: boolean;
  showTibiaFloorMarkers: boolean;
  showPlaceLabels: boolean;
  annotationsRevision: number;
  tibiaMarkersRevision: number;
  resourcesRevision: number;
  annotationsByFloor: Record<number, ExportAnnotation[]>;
  tibiaMarkersByFloor: Record<number, ExportAnnotation[]>;
  onFloorAnnotationsChange: (floor: number, annotations: ExportAnnotation[]) => void;
}

interface TileMeta {
  baseX: number;
  baseY: number;
}

interface FloorTransform {
  minX: number;
  maxY: number;
}

interface PixelCell {
  mapX: number;
  mapY: number;
  tibiaX: number;
  tibiaY: number;
  z: number;
}

interface PixelOverlayGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const TILE_SIZE = 256;
const TIBIA_MAP_ORIGIN_X = 31744;
const TIBIA_MAP_ORIGIN_Y = 30976;
const TIBIA_SURFACE_HEIGHT = 2048;
const TIBIA_MAP_MAX_BASE_Y = TIBIA_MAP_ORIGIN_Y + TIBIA_SURFACE_HEIGHT - TILE_SIZE;

function toTibiaLevelLabel(floor: number) {
  const delta = 7 - floor;
  if (delta === 0) return "nível 0";
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function getPixelGeometry(map: L.Map | null, mapX: number, mapY: number): PixelOverlayGeometry | null {
  if (!map) return null;
  const topLeft = map.latLngToContainerPoint(L.latLng(mapY, mapX));
  const bottomRight = map.latLngToContainerPoint(L.latLng(mapY + 1, mapX + 1));

  const left = Math.min(topLeft.x, bottomRight.x);
  const top = Math.min(topLeft.y, bottomRight.y);
  const width = Math.max(1, Math.abs(bottomRight.x - topLeft.x));
  const height = Math.max(1, Math.abs(bottomRight.y - topLeft.y));

  return {
    left,
    top,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v5" />
      <path d="M12 17v5" />
      <path d="M2 12h5" />
      <path d="M17 12h5" />
    </svg>
  );
}

export function MapViewer({
  selectedFloor,
  showGlobalAnnotations,
  showFloorAnnotations,
  showTibiaGlobalMarkers,
  showTibiaFloorMarkers,
  showPlaceLabels,
  annotationsRevision,
  tibiaMarkersRevision,
  resourcesRevision,
  annotationsByFloor,
  tibiaMarkersByFloor,
  onFloorAnnotationsChange,
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const loadRequestIdRef = useRef(0);
  const floorTransformRef = useRef<FloorTransform | null>(null);
  const selectedFloorRef = useRef(selectedFloor);
  const pixelInspectorEnabledRef = useRef(true);
  const drawingEnabledRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tileCount, setTileCount] = useState(0);
  const [floorTransform, setFloorTransform] = useState<FloorTransform | null>(null);

  const [brushColor, setBrushColor] = useState("#61dafb");
  const [selectedTool, setSelectedTool] = useState<DrawingTool>("pan");
  const [undoNonce, setUndoNonce] = useState(0);
  const [redoNonce, setRedoNonce] = useState(0);
  const [clearNonce, setClearNonce] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [pixelInspectorEnabled, setPixelInspectorEnabled] = useState(true);
  const [hoverPixel, setHoverPixel] = useState<PixelCell | null>(null);
  const [selectedPixel, setSelectedPixel] = useState<PixelCell | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const debugTiles = useMemo(() => false, []);
  const drawingEnabled = selectedTool !== "pan";

  useEffect(() => {
    selectedFloorRef.current = selectedFloor;
  }, [selectedFloor]);

  useEffect(() => {
    pixelInspectorEnabledRef.current = pixelInspectorEnabled;
  }, [pixelInspectorEnabled]);

  useEffect(() => {
    drawingEnabledRef.current = drawingEnabled;
  }, [drawingEnabled]);

  useEffect(() => {
    setHoverPixel(null);
    setSelectedPixel(null);
  }, [selectedFloor]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    tileLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const toPixelCell = (event: L.LeafletMouseEvent): PixelCell | null => {
      const transform = floorTransformRef.current;
      if (!transform) return null;

      const mapX = Math.floor(event.latlng.lng);
      const mapY = Math.floor(event.latlng.lat);
      if (!Number.isFinite(mapX) || !Number.isFinite(mapY)) return null;

      return {
        mapX,
        mapY,
        tibiaX: transform.minX + mapX,
        tibiaY: transform.maxY + TILE_SIZE - mapY,
        z: selectedFloorRef.current,
      };
    };

    const onMouseMove = (event: L.LeafletMouseEvent) => {
      if (drawingEnabledRef.current) return;
      if (!pixelInspectorEnabledRef.current) return;
      const cell = toPixelCell(event);
      setHoverPixel(cell);
    };

    const onClick = (event: L.LeafletMouseEvent) => {
      if (drawingEnabledRef.current) return;
      if (!pixelInspectorEnabledRef.current) return;
      const cell = toPixelCell(event);
      setSelectedPixel(cell);
    };

    const onMouseOut = () => {
      setHoverPixel(null);
    };

    const onViewChanged = () => {
      setViewRevision((v) => v + 1);
    };

    map.on("mousemove", onMouseMove);
    map.on("click", onClick);
    map.on("mouseout", onMouseOut);
    map.on("zoom move", onViewChanged);
    onViewChanged();

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      loadRequestIdRef.current += 1;
      map.off("mousemove", onMouseMove);
      map.off("click", onClick);
      map.off("mouseout", onMouseOut);
      map.off("zoom move", onViewChanged);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerGroupRef.current) return;
    void loadFloorTiles(selectedFloor);
  }, [selectedFloor, resourcesRevision]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (drawingEnabled) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.enable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [drawingEnabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          setRedoNonce((n) => n + 1);
        } else {
          setUndoNonce((n) => n + 1);
        }
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        setRedoNonce((n) => n + 1);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!drawingEnabledRef.current) return;
        event.preventDefault();
        if (window.confirm("Limpar todas as marcações deste andar?")) {
          setClearNonce((n) => n + 1);
        }
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const shortcuts: Partial<Record<string, DrawingTool>> = {
        v: "pan",
        b: "brush",
        l: "line",
        a: "arrow",
        r: "rect",
        c: "circle",
        t: "text",
      };
      const nextTool = shortcuts[event.key.toLowerCase()];

      if (nextTool) {
        event.preventDefault();
        setSelectedTool(nextTool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function loadFloorTiles(floor: number) {
    const requestId = ++loadRequestIdRef.current;
    const map = mapInstanceRef.current;
    const layerGroup = tileLayerGroupRef.current;
    if (!map || !layerGroup) return;

    setLoading(true);
    setErrorMessage(null);
    floorTransformRef.current = null;
    setFloorTransform(null);
    layerGroup.clearLayers();

    try {
      const metadata: TileMeta[] = await getTileMetadata(floor);

      if (requestId !== loadRequestIdRef.current || !mapRef.current?.isConnected) {
        return;
      }

      setTileCount(metadata.length);

      if (!metadata.length) {
        setErrorMessage(
          `Nenhum tile encontrado para o andar ${floor}. Clique em "Atualizar Recursos" ou gere os tiles novamente.`
        );
        return;
      }

      const tileSize = TILE_SIZE;
      const minX = TIBIA_MAP_ORIGIN_X;
      const maxY = TIBIA_MAP_MAX_BASE_Y;
      const nextTransform = { minX, maxY };
      floorTransformRef.current = nextTransform;
      setFloorTransform(nextTransform);

      const bounds = metadata.reduce<L.LatLngBounds | null>((acc, tile) => {
        const normalizedX = tile.baseX - minX;
        const normalizedY = maxY - tile.baseY;

        const tileBounds = L.latLngBounds(
          L.latLng(normalizedY + tileSize, normalizedX),
          L.latLng(normalizedY, normalizedX + tileSize)
        );

        const tileUrl = getTileImageUrl(floor, tile.baseX, tile.baseY, resourcesRevision);
        const image = L.imageOverlay(tileUrl, tileBounds, { opacity: 1, interactive: false });
        image.on("error", () => {
          console.error("Erro ao carregar tile:", { floor, baseX: tile.baseX, baseY: tile.baseY, tileUrl });
          setErrorMessage("Erro ao carregar tiles. Verifique o console e a rota /api/tiles.");
        });
        image.addTo(layerGroup);

        if (debugTiles) {
          L.rectangle(tileBounds, { color: "#33ff66", weight: 1, fill: false }).addTo(layerGroup);
          L.marker([normalizedY + 128, normalizedX + 128], {
            interactive: false,
            icon: L.divIcon({
              className: "tile-debug-label",
              html: `Tile floor=${floor} x=${tile.baseX} y=${tile.baseY}`,
            }),
          }).addTo(layerGroup);
        }

        return acc ? acc.extend(tileBounds) : tileBounds;
      }, null);

      if (requestId !== loadRequestIdRef.current || !mapRef.current?.isConnected) {
        return;
      }

      requestAnimationFrame(() => {
        if (!mapRef.current?.isConnected || requestId !== loadRequestIdRef.current) return;
        map.invalidateSize();
        if (bounds) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      });
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("Erro ao carregar tiles:", error);
      setErrorMessage("Erro ao carregar tiles. Verifique o console e a rota /api/tiles.");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  const map = mapInstanceRef.current;
  const hoverGeometry = hoverPixel ? getPixelGeometry(map, hoverPixel.mapX, hoverPixel.mapY) : null;
  const selectedGeometry = selectedPixel ? getPixelGeometry(map, selectedPixel.mapX, selectedPixel.mapY) : null;
  const displayInfo = selectedPixel ?? hoverPixel;

  return (
    <section className="map-panel" data-tour="map">
      <div className="map-shell">
        <div ref={mapRef} className="leaflet-map" />

        <PlaceLabels
          map={mapInstanceRef.current}
          visible={showPlaceLabels}
          floor={selectedFloor}
        />

        {pixelInspectorEnabled && (
          <div className="pixel-inspector-overlay" aria-hidden>
            {hoverGeometry && (
              <div
                className="pixel-hover-cell"
                style={{
                  left: `${hoverGeometry.left}px`,
                  top: `${hoverGeometry.top}px`,
                  width: `${hoverGeometry.width}px`,
                  height: `${hoverGeometry.height}px`,
                }}
              />
            )}

            {selectedGeometry && (
              <>
                <div className="pixel-crosshair-v" style={{ left: `${selectedGeometry.centerX}px` }} />
                <div className="pixel-crosshair-h" style={{ top: `${selectedGeometry.centerY}px` }} />
                <div
                  className="pixel-selected-cell"
                  style={{
                    left: `${selectedGeometry.left}px`,
                    top: `${selectedGeometry.top}px`,
                    width: `${selectedGeometry.width}px`,
                    height: `${selectedGeometry.height}px`,
                  }}
                />
              </>
            )}
          </div>
        )}

        <AnnotationCanvas
          floor={selectedFloor}
          map={mapInstanceRef.current}
          coordinateTransform={floorTransform}
          drawingEnabled={drawingEnabled}
          brushColor={brushColor}
          selectedTool={selectedTool}
          undoNonce={undoNonce}
          redoNonce={redoNonce}
          clearNonce={clearNonce}
          annotationsRevision={annotationsRevision}
          tibiaMarkersRevision={tibiaMarkersRevision}
          initialAnnotations={annotationsByFloor[selectedFloor] ?? []}
          annotationsByFloor={annotationsByFloor}
          tibiaMarkersByFloor={tibiaMarkersByFloor}
          showGlobalAnnotations={showGlobalAnnotations}
          showFloorAnnotations={showFloorAnnotations}
          showTibiaGlobalMarkers={showTibiaGlobalMarkers}
          showTibiaFloorMarkers={showTibiaFloorMarkers}
          onHistoryChange={({ canUndo: undo, canRedo: redo }) => {
            setCanUndo(undo);
            setCanRedo(redo);
          }}
          onAnnotationsChange={(annotations) => onFloorAnnotationsChange(selectedFloor, annotations)}
        />

        <div className="map-tools-overlay" data-tour="drawing">
        <DrawingToolbar
            className="drawing-toolbar-overlay"
            brushColor={brushColor}
            selectedTool={selectedTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onColorChange={setBrushColor}
            onToolChange={setSelectedTool}
            onUndo={() => setUndoNonce((n) => n + 1)}
            onRedo={() => setRedoNonce((n) => n + 1)}
            onClear={() => setClearNonce((n) => n + 1)}
          />
          <button
            type="button"
            className={`icon-tool-button ${pixelInspectorEnabled ? "tool-button-active" : ""}`}
            onClick={() => setPixelInspectorEnabled((prev) => !prev)}
            title={pixelInspectorEnabled ? "Desligar mira" : "Ligar mira"}
            aria-label={pixelInspectorEnabled ? "Desligar mira" : "Ligar mira"}
          >
            <CrosshairIcon />
          </button>
        </div>

        {displayInfo && pixelInspectorEnabled && (
          <div className="pixel-coords-badge">
            X: {displayInfo.tibiaX} | Y: {displayInfo.tibiaY} | Z: {displayInfo.z}
          </div>
        )}

        {(loading || errorMessage) && (
          <div className="map-feedback-overlay">
            {loading && <p>Carregando tiles...</p>}
            {errorMessage && <p>{errorMessage}</p>}
          </div>
        )}
      </div>
      <div className="map-status">
        Andar arquivo {selectedFloor} | Tibia {toTibiaLevelLabel(selectedFloor)} | {tileCount} tile(s)
      </div>
    </section>
  );
}
