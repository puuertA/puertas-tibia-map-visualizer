import { ExportAnnotation } from "../types/ExportAnnotation";

interface TibiaMarker {
  x: number;
  y: number;
  z: number;
  icon: number;
  text: string;
}

const MARKER_COLORS = [
  "#6ee7b7",
  "#60a5fa",
  "#f87171",
  "#fb923c",
  "#facc15",
  "#a78bfa",
  "#c084fc",
  "#f472b6",
  "#ef4444",
  "#94a3b8",
  "#fbbf24",
  "#92400e",
  "#d6d3d1",
  "#22c55e",
  "#dc2626",
  "#991b1b",
  "#ef4444",
  "#f97316",
  "#16a34a",
  "#84cc16",
];

class BinaryReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get position() {
    return this.offset;
  }

  get length() {
    return this.bytes.length;
  }

  set position(nextOffset: number) {
    this.offset = nextOffset;
  }

  readVarint() {
    let result = 0;
    let shift = 0;

    while (this.offset < this.bytes.length) {
      const byte = this.bytes[this.offset];
      this.offset += 1;
      result += (byte & 0x7f) * 2 ** shift;

      if ((byte & 0x80) === 0) {
        return result;
      }

      shift += 7;
    }

    throw new Error("Arquivo de marcacoes incompleto");
  }

  readBytes(length: number) {
    const end = this.offset + length;
    if (end > this.bytes.length) {
      throw new Error("Arquivo de marcacoes incompleto");
    }

    const chunk = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return chunk;
  }
}

function parsePosition(reader: BinaryReader, end: number) {
  const position: Partial<Pick<TibiaMarker, "x" | "y" | "z">> = {};

  while (reader.position < end) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wireType = tag & 7;

    if (wireType !== 0) {
      throw new Error("Posicao de marcacao invalida");
    }

    const value = reader.readVarint();
    if (field === 1) position.x = value;
    if (field === 2) position.y = value;
    if (field === 3) position.z = value;
  }

  if (
    typeof position.x !== "number" ||
    typeof position.y !== "number" ||
    typeof position.z !== "number"
  ) {
    throw new Error("Marcacao sem coordenadas");
  }

  return position as Pick<TibiaMarker, "x" | "y" | "z">;
}

function parseMarker(reader: BinaryReader, end: number, decoder: TextDecoder): TibiaMarker {
  const marker: Partial<TibiaMarker> = {};

  while (reader.position < end) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wireType = tag & 7;

    if (wireType === 2) {
      const length = reader.readVarint();
      const start = reader.position;

      if (field === 1) {
        Object.assign(marker, parsePosition(reader, start + length));
        reader.position = start + length;
        continue;
      }

      const bytes = reader.readBytes(length);
      if (field === 3) {
        marker.text = decoder.decode(bytes).trim();
      }
      continue;
    }

    if (wireType === 0) {
      const value = reader.readVarint();
      if (field === 2) marker.icon = value;
      continue;
    }

    throw new Error("Formato de marcacao nao suportado");
  }

  if (
    typeof marker.x !== "number" ||
    typeof marker.y !== "number" ||
    typeof marker.z !== "number" ||
    typeof marker.icon !== "number"
  ) {
    throw new Error("Marcacao invalida");
  }

  return {
    x: marker.x,
    y: marker.y,
    z: marker.z,
    icon: marker.icon,
    text: marker.text ?? "",
  };
}

export function parseTibiaMinimapMarkers(buffer: ArrayBuffer) {
  const reader = new BinaryReader(new Uint8Array(buffer));
  const decoder = new TextDecoder("utf-8");
  const annotationsByFloor: Record<number, ExportAnnotation[]> = {};

  while (reader.position < reader.length) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wireType = tag & 7;

    if (field !== 1 || wireType !== 2) {
      throw new Error("Arquivo minimapmarkers.bin invalido");
    }

    const length = reader.readVarint();
    const marker = parseMarker(reader, reader.position + length, decoder);
    const annotation: ExportAnnotation = {
      type: "marker",
      floor: marker.z,
      color: MARKER_COLORS[marker.icon] ?? "#f8fafc",
      point: { x: marker.x, y: marker.y },
      icon: marker.icon,
      text: marker.text,
    };

    annotationsByFloor[marker.z] = [...(annotationsByFloor[marker.z] ?? []), annotation];
  }

  return annotationsByFloor;
}
