export type ExportAnnotation =
  | { type: "brush"; floor: number; color: string; points: Array<{ x: number; y: number }> }
  | { type: "line"; floor: number; color: string; a: { x: number; y: number }; b: { x: number; y: number } }
  | { type: "arrow"; floor: number; color: string; a: { x: number; y: number }; b: { x: number; y: number } }
  | { type: "rect"; floor: number; color: string; a: { x: number; y: number }; b: { x: number; y: number } }
  | { type: "circle"; floor: number; color: string; a: { x: number; y: number }; b: { x: number; y: number } }
  | { type: "text"; floor: number; color: string; point: { x: number; y: number }; text: string }
  | { type: "marker"; floor: number; color: string; point: { x: number; y: number }; icon: number; text: string };
