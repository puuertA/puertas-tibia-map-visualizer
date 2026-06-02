export type AnnotationType =
  | "freehand"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text";

export interface Annotation {
  id: string;
  type: AnnotationType;
  floor: number | "global";
  points: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  opacity?: number;
  createdAt: string;
  updatedAt: string;
}
