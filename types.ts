export type Orientation = 'across' | 'down';

export interface WordData {
  id: string;
  word: string;
  clue: string;
}

export interface PlacedWord extends WordData {
  row: number;
  col: number;
  orientation: Orientation;
  number?: number; // The clue number (e.g., 1 Across)
}

export interface GridCellData {
  row: number;
  col: number;
  char: string | null;
  clueNumber: number | null; // If this cell starts a word
  wordIds: string[]; // IDs of words occupying this cell
  isValid: boolean; // For previewing placement
  isError: boolean; // For collision detection
}

export interface ClueGroup {
  number: number;
  clue: string;
  word: string;
  orientation: Orientation;
}

export interface GeneratedContent {
    words: { word: string; clue: string }[];
}

export interface GridStyle {
  borderColor: string;
  cellBorderColor: string;
  wordBorderColor: string; // New: Color for borders of cells containing letters
  filledColor: string;
  emptyColor: string;
  textColor: string;
  numberColor: string;
  borderWidth: number; // New: Width of the cell borders
}

export interface GridConfig {
  rows: number;
  cols: number;
  style: GridStyle;
}