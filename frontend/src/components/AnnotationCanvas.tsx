import { useEffect, useRef } from "react";
import L from "leaflet";
import { DrawingTool } from "./DrawingToolbar";
import { ExportAnnotation } from "../types/ExportAnnotation";

interface AnnotationCanvasProps {
  floor: number;
  map: L.Map | null;
  coordinateTransform: { minX: number; maxY: number } | null;
  drawingEnabled: boolean;
  brushColor: string;
  selectedTool: DrawingTool;
  undoNonce: number;
  redoNonce: number;
  clearNonce: number;
  annotationsRevision: number;
  tibiaMarkersRevision: number;
  initialAnnotations?: ExportAnnotation[];
  annotationsByFloor?: Record<number, ExportAnnotation[]>;
  tibiaMarkersByFloor?: Record<number, ExportAnnotation[]>;
  showGlobalAnnotations: boolean;
  showFloorAnnotations: boolean;
  showTibiaGlobalMarkers: boolean;
  showTibiaFloorMarkers: boolean;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  onAnnotationsChange?: (annotations: ExportAnnotation[]) => void;
}

type Point = { lat: number; lng: number };

type Annotation =
  | { type: "brush"; color: string; points: Point[] }
  | { type: "line"; color: string; a: Point; b: Point }
  | { type: "arrow"; color: string; a: Point; b: Point }
  | { type: "rect"; color: string; a: Point; b: Point }
  | { type: "circle"; color: string; a: Point; b: Point }
  | { type: "text"; color: string; point: Point; text: string }
  | { type: "marker"; color: string; point: Point; icon: number; text: string };

const PANE_NAME = "annotationPane";

function toLatLng(point: Point) {
  return L.latLng(point.lat, point.lng);
}

const TILE_SIZE = 256;

function toTibiaLevelLabel(floor: number) {
  const delta = 7 - floor;
  if (delta === 0) return "nível 0";
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function cloneAnnotations(annotations: Annotation[]) {
  return annotations.map((annotation) => JSON.parse(JSON.stringify(annotation)) as Annotation);
}

function cloneExportAnnotations(annotations: ExportAnnotation[]) {
  return annotations.map((annotation) => JSON.parse(JSON.stringify(annotation)) as ExportAnnotation);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBounds(a: Point, b: Point) {
  return L.latLngBounds(toLatLng(a), toLatLng(b));
}

function buildArrowPoints(a: Point, b: Point) {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.min(Math.max(len * 0.18, 4), 16);
  const headWidth = headLen * 0.55;

  const bx = b.lng - ux * headLen;
  const by = b.lat - uy * headLen;
  const px = -uy;
  const py = ux;

  return [
    toLatLng(a),
    toLatLng(b),
    L.latLng(by + py * headWidth, bx + px * headWidth),
    toLatLng(b),
    L.latLng(by - py * headWidth, bx - px * headWidth),
  ];
}

function buildEllipsePoints(a: Point, b: Point) {
  const centerLat = (a.lat + b.lat) / 2;
  const centerLng = (a.lng + b.lng) / 2;
  const radiusLat = Math.max(0.001, Math.abs(b.lat - a.lat) / 2);
  const radiusLng = Math.max(0.001, Math.abs(b.lng - a.lng) / 2);
  const points: L.LatLng[] = [];

  for (let i = 0; i < 48; i += 1) {
    const theta = (Math.PI * 2 * i) / 48;
    points.push(
      L.latLng(centerLat + Math.sin(theta) * radiusLat, centerLng + Math.cos(theta) * radiusLng)
    );
  }

  return points;
}

function makeLayer(annotation: Annotation, sourceFloor: number, isCurrentFloor: boolean) {
  const pathOptions = {
    color: annotation.color,
    weight: annotation.type === "brush" ? 3 : 2,
    opacity: isCurrentFloor ? 1 : 0.78,
    interactive: true,
    pane: PANE_NAME,
  };
  const tooltip = `Marcação feita no andar arquivo ${sourceFloor} | Tibia ${toTibiaLevelLabel(sourceFloor)}`;

  function withTooltip<T extends L.Layer>(layer: T, content = tooltip) {
    layer.bindTooltip(content, {
      direction: "top",
      opacity: 0.95,
      sticky: true,
      className: "annotation-floor-tooltip",
    });
    return layer;
  }

  if (annotation.type === "brush") {
    return withTooltip(L.polyline(annotation.points.map(toLatLng), pathOptions));
  }

  if (annotation.type === "line") {
    return withTooltip(L.polyline([toLatLng(annotation.a), toLatLng(annotation.b)], pathOptions));
  }

  if (annotation.type === "arrow") {
    return withTooltip(L.polyline(buildArrowPoints(annotation.a, annotation.b), pathOptions));
  }

  if (annotation.type === "rect") {
    return withTooltip(L.rectangle(getBounds(annotation.a, annotation.b), {
      ...pathOptions,
      fill: false,
    }));
  }

  if (annotation.type === "text") {
    return withTooltip(L.marker(toLatLng(annotation.point), {
      interactive: true,
      pane: PANE_NAME,
      icon: L.divIcon({
        className: "annotation-text-icon",
        html: `<span style="color:${annotation.color}">${escapeHtml(annotation.text)}</span>`,
        iconSize: [annotation.text.length * 10 + 24, 28],
        iconAnchor: [0, 14],
      }),
    }));
  }

  if (annotation.type === "marker") {
    const content = annotation.text
      ? `${escapeHtml(annotation.text)}<br><span>${tooltip}</span>`
      : tooltip;

    return withTooltip(L.marker(toLatLng(annotation.point), {
      interactive: true,
      pane: PANE_NAME,
      icon: L.divIcon({
        className: "tibia-marker-icon",
        html: `<span style="--marker-color:${annotation.color}" title="Icone ${annotation.icon}"><b>${annotation.icon}</b><img src="/tibia-marker-icons/${annotation.icon}.png" alt="" onload="this.parentElement.classList.add('has-client-icon')" onerror="this.remove()" /></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    }), content);
  }

  return withTooltip(L.polygon(buildEllipsePoints(annotation.a, annotation.b), {
    ...pathOptions,
    fill: false,
  }));
}

export function AnnotationCanvas({
  floor,
  map,
  coordinateTransform,
  drawingEnabled,
  brushColor,
  selectedTool,
  undoNonce,
  redoNonce,
  clearNonce,
  annotationsRevision,
  tibiaMarkersRevision,
  initialAnnotations = [],
  annotationsByFloor = {},
  tibiaMarkersByFloor = {},
  showGlobalAnnotations,
  showFloorAnnotations,
  showTibiaGlobalMarkers,
  showTibiaFloorMarkers,
  onHistoryChange,
  onAnnotationsChange,
}: AnnotationCanvasProps) {
  const annotationsRef = useRef<Annotation[]>([]);
  const undoStackRef = useRef<Annotation[][]>([]);
  const redoStackRef = useRef<Annotation[][]>([]);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.Layer | null>(null);
  const draftAnnotationRef = useRef<Annotation | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const drawingEnabledRef = useRef(drawingEnabled);
  const brushColorRef = useRef(brushColor);
  const selectedToolRef = useRef(selectedTool);
  const coordinateTransformRef = useRef(coordinateTransform);
  const floorRef = useRef(floor);
  const annotationsByFloorRef = useRef(annotationsByFloor);
  const tibiaMarkersByFloorRef = useRef(tibiaMarkersByFloor);
  const showGlobalAnnotationsRef = useRef(showGlobalAnnotations);
  const showFloorAnnotationsRef = useRef(showFloorAnnotations);
  const showTibiaGlobalMarkersRef = useRef(showTibiaGlobalMarkers);
  const showTibiaFloorMarkersRef = useRef(showTibiaFloorMarkers);
  const onAnnotationsChangeRef = useRef(onAnnotationsChange);

  floorRef.current = floor;
  annotationsByFloorRef.current = annotationsByFloor;
  tibiaMarkersByFloorRef.current = tibiaMarkersByFloor;
  showGlobalAnnotationsRef.current = showGlobalAnnotations;
  showFloorAnnotationsRef.current = showFloorAnnotations;
  showTibiaGlobalMarkersRef.current = showTibiaGlobalMarkers;
  showTibiaFloorMarkersRef.current = showTibiaFloorMarkers;
  onAnnotationsChangeRef.current = onAnnotationsChange;

  function emitHistoryState() {
    onHistoryChange?.({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }

  function emitAnnotations() {
    const transform = coordinateTransformRef.current;
    if (!transform) return;

    const toGamePoint = (point: Point) => ({
      x: transform.minX + point.lng,
      y: transform.maxY + TILE_SIZE - point.lat,
    });

    const currentFloor = floorRef.current;

    onAnnotationsChangeRef.current?.(
      annotationsRef.current.map((annotation) => {
        if (annotation.type === "brush") {
          return {
            type: annotation.type,
            floor: currentFloor,
            color: annotation.color,
            points: annotation.points.map(toGamePoint),
          };
        }

        if (annotation.type === "text") {
          return {
            type: annotation.type,
            floor: currentFloor,
            color: annotation.color,
            point: toGamePoint(annotation.point),
            text: annotation.text,
          };
        }

        if (annotation.type === "marker") {
          return {
            type: annotation.type,
            floor: currentFloor,
            color: annotation.color,
            point: toGamePoint(annotation.point),
            icon: annotation.icon,
            text: annotation.text,
          };
        }

        return {
          type: annotation.type,
          floor: currentFloor,
          color: annotation.color,
          a: toGamePoint(annotation.a),
          b: toGamePoint(annotation.b),
        };
      })
    );
  }

  function pushUndoSnapshot() {
    undoStackRef.current.push(cloneAnnotations(annotationsRef.current));
    if (undoStackRef.current.length > 100) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    emitHistoryState();
  }

  function renderAnnotations() {
    const transform = coordinateTransformRef.current;
    if (!layerGroupRef.current || !transform) return;

    const fromGamePoint = (point: { x: number; y: number }): Point => ({
      lat: transform.maxY + TILE_SIZE - point.y,
      lng: point.x - transform.minX,
    });

    const fromExportAnnotation = (annotation: ExportAnnotation): Annotation => {
      if (annotation.type === "brush") {
        return {
          type: annotation.type,
          color: annotation.color,
          points: annotation.points.map(fromGamePoint),
        };
      }

      if (annotation.type === "text") {
        return {
          type: annotation.type,
          color: annotation.color,
          point: fromGamePoint(annotation.point),
          text: annotation.text,
        };
      }

      if (annotation.type === "marker") {
        return {
          type: annotation.type,
          color: annotation.color,
          point: fromGamePoint(annotation.point),
          icon: annotation.icon,
          text: annotation.text,
        };
      }

      return {
        type: annotation.type,
        color: annotation.color,
        a: fromGamePoint(annotation.a),
        b: fromGamePoint(annotation.b),
      };
    };

    layerGroupRef.current.clearLayers();
    const currentFloor = floorRef.current;

    if (showGlobalAnnotationsRef.current) {
      Object.entries(annotationsByFloorRef.current).forEach(([sourceFloor, annotations]) => {
        const numericFloor = Number(sourceFloor);
        if (numericFloor === currentFloor) return;

        annotations.forEach((annotation) => {
          layerGroupRef.current?.addLayer(makeLayer(fromExportAnnotation(annotation), numericFloor, false));
        });
      });
    }

    if (showFloorAnnotationsRef.current) {
      annotationsRef.current.forEach((annotation) => {
        layerGroupRef.current?.addLayer(makeLayer(annotation, currentFloor, true));
      });
    }

    if (showTibiaGlobalMarkersRef.current) {
      Object.entries(tibiaMarkersByFloorRef.current).forEach(([sourceFloor, markers]) => {
        const numericFloor = Number(sourceFloor);
        if (numericFloor === currentFloor) return;

        markers.forEach((marker) => {
          layerGroupRef.current?.addLayer(makeLayer(fromExportAnnotation(marker), numericFloor, false));
        });
      });
    }

    if (showTibiaFloorMarkersRef.current) {
      (tibiaMarkersByFloorRef.current[currentFloor] ?? []).forEach((marker) => {
        layerGroupRef.current?.addLayer(makeLayer(fromExportAnnotation(marker), currentFloor, true));
      });
    }
  }

  function replaceDraft(annotation: Annotation | null) {
    if (!map || !layerGroupRef.current) return;

    if (draftLayerRef.current && annotation) {
      const layer = draftLayerRef.current as any;
      if (annotation.type === "brush") {
        layer.setLatLngs(annotation.points.map(toLatLng));
        return;
      }
      if (annotation.type === "line") {
        layer.setLatLngs([toLatLng(annotation.a), toLatLng(annotation.b)]);
        return;
      }
      if (annotation.type === "arrow") {
        layer.setLatLngs(buildArrowPoints(annotation.a, annotation.b));
        return;
      }
      if (annotation.type === "rect") {
        layer.setBounds(getBounds(annotation.a, annotation.b));
        return;
      }
      if (annotation.type === "circle") {
        layer.setLatLngs(buildEllipsePoints(annotation.a, annotation.b));
        return;
      }
    }

    if (draftLayerRef.current) {
      layerGroupRef.current.removeLayer(draftLayerRef.current);
      draftLayerRef.current = null;
    }

    if (!annotation) return;
    draftLayerRef.current = makeLayer(annotation, floorRef.current, true);
    layerGroupRef.current.addLayer(draftLayerRef.current);
  }

  useEffect(() => {
    drawingEnabledRef.current = drawingEnabled;
  }, [drawingEnabled]);

  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    coordinateTransformRef.current = coordinateTransform;
  }, [coordinateTransform]);

  useEffect(() => {
    if (!map) return;

    if (!map.getPane(PANE_NAME)) {
      const pane = map.createPane(PANE_NAME);
      pane.style.zIndex = "650";
      pane.style.pointerEvents = "auto";
    }

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;
    renderAnnotations();

    return () => {
      group.removeFrom(map);
      layerGroupRef.current = null;
      draftLayerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const onMouseDown = (event: L.LeafletMouseEvent) => {
      if (!drawingEnabledRef.current) return;
      const start = { lat: event.latlng.lat, lng: event.latlng.lng };
      const color = brushColorRef.current;

      pushUndoSnapshot();
      startPointRef.current = start;

      if (selectedToolRef.current === "brush") {
        draftAnnotationRef.current = { type: "brush", color, points: [start] };
      } else if (selectedToolRef.current === "line") {
        draftAnnotationRef.current = { type: "line", color, a: start, b: start };
      } else if (selectedToolRef.current === "arrow") {
        draftAnnotationRef.current = { type: "arrow", color, a: start, b: start };
      } else if (selectedToolRef.current === "rect") {
        draftAnnotationRef.current = { type: "rect", color, a: start, b: start };
      } else if (selectedToolRef.current === "text") {
        const text = window.prompt("Digite o texto da marcação:");
        if (!text?.trim()) {
          undoStackRef.current.pop();
          startPointRef.current = null;
          emitHistoryState();
          return;
        }

        annotationsRef.current = [
          ...annotationsRef.current,
          { type: "text", color, point: start, text: text.trim() },
        ];
        startPointRef.current = null;
        renderAnnotations();
        emitHistoryState();
        emitAnnotations();
        return;
      } else {
        draftAnnotationRef.current = { type: "circle", color, a: start, b: start };
      }

      replaceDraft(draftAnnotationRef.current);
    };

    const onMouseMove = (event: L.LeafletMouseEvent) => {
      if (!drawingEnabledRef.current || !draftAnnotationRef.current || !startPointRef.current) return;
      const next = { lat: event.latlng.lat, lng: event.latlng.lng };
      const draft = draftAnnotationRef.current;

      if (draft.type === "brush") {
        const last = draft.points[draft.points.length - 1];
        if (Math.hypot(next.lat - last.lat, next.lng - last.lng) < 0.15) return;
        draft.points = [...draft.points, next];
      } else if (draft.type !== "text" && draft.type !== "marker") {
        draft.b = next;
      }

      replaceDraft(draft);
    };

    const onMouseUp = () => {
      if (!drawingEnabledRef.current || !draftAnnotationRef.current) return;

      const draft = draftAnnotationRef.current;
      if (draft.type === "text" || draft.type === "marker") return;

      const shouldKeep =
        draft.type === "brush"
          ? draft.points.length > 1
          : Math.hypot(draft.b.lat - draft.a.lat, draft.b.lng - draft.a.lng) > 0.001;

      if (draftLayerRef.current && layerGroupRef.current) {
        layerGroupRef.current.removeLayer(draftLayerRef.current);
        draftLayerRef.current = null;
      }

      if (shouldKeep) {
        annotationsRef.current = [...annotationsRef.current, cloneAnnotations([draft])[0]];
      } else {
        undoStackRef.current.pop();
      }

      draftAnnotationRef.current = null;
      startPointRef.current = null;
      renderAnnotations();
      emitHistoryState();
      emitAnnotations();
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [map]);

  useEffect(() => {
    if (undoNonce === 0 || undoStackRef.current.length === 0) return;
    redoStackRef.current.push(cloneAnnotations(annotationsRef.current));
    annotationsRef.current = undoStackRef.current.pop() ?? [];
    renderAnnotations();
    emitHistoryState();
    emitAnnotations();
  }, [undoNonce]);

  useEffect(() => {
    if (redoNonce === 0 || redoStackRef.current.length === 0) return;
    undoStackRef.current.push(cloneAnnotations(annotationsRef.current));
    annotationsRef.current = redoStackRef.current.pop() ?? [];
    renderAnnotations();
    emitHistoryState();
    emitAnnotations();
  }, [redoNonce]);

  useEffect(() => {
    if (clearNonce === 0) return;
    pushUndoSnapshot();
    annotationsRef.current = [];
    renderAnnotations();
    emitHistoryState();
    emitAnnotations();
  }, [clearNonce]);

  useEffect(() => {
    if (!coordinateTransform) return;

    const fromGamePoint = (point: { x: number; y: number }): Point => ({
      lat: coordinateTransform.maxY + TILE_SIZE - point.y,
      lng: point.x - coordinateTransform.minX,
    });

    annotationsRef.current = cloneExportAnnotations(initialAnnotations).map((annotation) => {
      if (annotation.type === "brush") {
        return {
          type: annotation.type,
          color: annotation.color,
          points: annotation.points.map(fromGamePoint),
        };
      }

      if (annotation.type === "text") {
        return {
          type: annotation.type,
          color: annotation.color,
          point: fromGamePoint(annotation.point),
          text: annotation.text,
        };
      }

      if (annotation.type === "marker") {
        return {
          type: annotation.type,
          color: annotation.color,
          point: fromGamePoint(annotation.point),
          icon: annotation.icon,
          text: annotation.text,
        };
      }

      return {
        type: annotation.type,
        color: annotation.color,
        a: fromGamePoint(annotation.a),
        b: fromGamePoint(annotation.b),
      };
    });
    undoStackRef.current = [];
    redoStackRef.current = [];
    draftAnnotationRef.current = null;
    startPointRef.current = null;
    renderAnnotations();
    emitHistoryState();
  }, [floor, coordinateTransform, annotationsRevision]);

  useEffect(() => {
    renderAnnotations();
  }, [
    floor,
    annotationsByFloor,
    tibiaMarkersByFloor,
    showGlobalAnnotations,
    showFloorAnnotations,
    showTibiaGlobalMarkers,
    showTibiaFloorMarkers,
    coordinateTransform,
    tibiaMarkersRevision,
  ]);

  return null;
}
