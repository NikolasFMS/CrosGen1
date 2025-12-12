import { GridCellData, PlacedWord, Orientation, ClueGroup, WordData } from './types';

// Initialize an empty grid
export const createEmptyGrid = (rows: number, cols: number): GridCellData[][] => {
  const grid: GridCellData[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: GridCellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        char: null,
        clueNumber: null,
        wordIds: [],
        isValid: true,
        isError: false,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Calculate the grid state based on placed words
export const calculateGrid = (placedWords: PlacedWord[], rows: number, cols: number): { grid: GridCellData[][]; clues: ClueGroup[] } => {
  const grid = createEmptyGrid(rows, cols);
  
  // 1. Place letters on the grid
  placedWords.forEach((pw) => {
    const dr = pw.orientation === 'down' ? 1 : 0;
    const dc = pw.orientation === 'across' ? 1 : 0;

    for (let i = 0; i < pw.word.length; i++) {
      const r = pw.row + i * dr;
      const c = pw.col + i * dc;

      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        const cell = grid[r][c];
        
        // Collision detection logic
        if (cell.char !== null && cell.char !== pw.word[i]) {
          cell.isError = true;
        }
        
        cell.char = pw.word[i];
        cell.wordIds.push(pw.id);
      }
    }
  });

  // 2. Assign Clue Numbers
  
  let currentNumber = 1;
  const clues: ClueGroup[] = [];

  // Iterate grid to find start positions
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wordsStartingHere = placedWords.filter(w => w.row === r && w.col === c);
      
      if (wordsStartingHere.length > 0) {
        
        wordsStartingHere.forEach(w => {
           clues.push({
             number: currentNumber,
             clue: w.clue,
             word: w.word,
             orientation: w.orientation
           });
           w.number = currentNumber;
        });

        // Set the number on the cell for rendering
        grid[r][c].clueNumber = currentNumber;
        
        currentNumber++;
      }
    }
  }

  // Sort clues for display
  clues.sort((a, b) => a.number - b.number);

  return { grid, clues };
};

// Validate if a word can be placed tentatively (for hover effects)
export const validatePlacement = (
  grid: GridCellData[][],
  word: string,
  row: number,
  col: number,
  orientation: Orientation,
  rows: number,
  cols: number
): boolean => {
  const dr = orientation === 'down' ? 1 : 0;
  const dc = orientation === 'across' ? 1 : 0;

  // Out of bounds check
  if (row < 0 || col < 0) return false;
  if (row + (word.length - 1) * dr >= rows) return false;
  if (col + (word.length - 1) * dc >= cols) return false;

  // Collision check
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dr;
    const c = col + i * dc;
    const cell = grid[r][c];
    
    // If cell is occupied, it MUST match the letter
    if (cell.char !== null && cell.char !== word[i]) {
      return false;
    }
  }

  return true;
};

// Auto-generate layout
export const generateLayout = (words: WordData[], rows: number, cols: number): PlacedWord[] => {
  // 1. Sort words by length (longest first)
  const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
  if (sortedWords.length === 0) return [];

  const placed: PlacedWord[] = [];
  
  // Map to track occupied cells for fast lookup
  const gridMap = new Map<string, string>();
  const isOccupied = (r: number, c: number) => gridMap.has(`${r},${c}`);
  const getChar = (r: number, c: number) => gridMap.get(`${r},${c}`);

  const canPlace = (word: string, row: number, col: number, orientation: Orientation): boolean => {
      const dr = orientation === 'down' ? 1 : 0;
      const dc = orientation === 'across' ? 1 : 0;

      // Bounds
      if (row < 0 || col < 0) return false;
      if (orientation === 'across' && col + word.length > cols) return false;
      if (orientation === 'down' && row + word.length > rows) return false;

      for (let i = 0; i < word.length; i++) {
          const r = row + i * dr;
          const c = col + i * dc;
          const char = word[i];
          const existing = getChar(r, c);

          // 1. Mismatch
          if (existing && existing !== char) return false;

          // 2. Adjacency checks
          if (!existing) {
              const pDr = dc; 
              const pDc = dr; 
              
              // Standard Check: Immediate neighbors (no touching parallel words allowed)
              if (isOccupied(r + pDr, c + pDc) || isOccupied(r - pDr, c - pDc)) return false;

              // Extended Check: 1-cell gap check (minimum 2 cells spacing requested)
              // If r+2 is occupied, there is only a 1-cell gap. We want at least 2 empty cells (Gap 2).
              if (isOccupied(r + 2 * pDr, c + 2 * pDc) || isOccupied(r - 2 * pDr, c - 2 * pDc)) return false;

              // Diagonal Check: Prevent "corner touching" (Strict Criss-Cross Rule)
              const diags = [
                { dr: -1, dc: -1 },
                { dr: -1, dc: 1 },
                { dr: 1, dc: -1 },
                { dr: 1, dc: 1 }
              ];

              for (const d of diags) {
                if (isOccupied(r + d.dr, c + d.dc)) {
                   // If diagonal is occupied, one of the shared orthogonal neighbors must be occupied
                   const shared1 = isOccupied(r + d.dr, c);
                   const shared2 = isOccupied(r, c + d.dc);
                   if (!shared1 && !shared2) return false;
                }
              }
          }
      }

      // Check immediate start/end boundaries
      if (isOccupied(row - dr, col - dc)) return false;
      if (isOccupied(row + word.length * dr, col + word.length * dc)) return false;

      return true;
  };

  const placeWordInMap = (pw: PlacedWord) => {
      const dr = pw.orientation === 'down' ? 1 : 0;
      const dc = pw.orientation === 'across' ? 1 : 0;
      for (let i = 0; i < pw.word.length; i++) {
          gridMap.set(`${pw.row + i * dr},${pw.col + i * dc}`, pw.word[i]);
      }
      placed.push(pw);
  };

  // Place first word in center
  const firstWord = sortedWords[0];
  const fr = Math.floor(rows / 2);
  const fc = Math.floor((cols - firstWord.word.length) / 2);
  // Ensure it fits
  if (fc >= 0) {
      placeWordInMap({ ...firstWord, row: fr, col: fc, orientation: 'across' });
  } else {
      // If it doesn't fit centered, try 0,0
      placeWordInMap({ ...firstWord, row: 0, col: 0, orientation: 'across' });
  }

  const unplaced = sortedWords.slice(1);
  let changed = true;

  // Retry loop
  while (changed && unplaced.length > 0) {
      changed = false;
      for (let i = 0; i < unplaced.length; i++) {
          const w = unplaced[i];
          let bestPlacement: PlacedWord | null = null;

          // Try to intersect with any placed word
          for (const pw of placed) {
              for (let j = 0; j < w.word.length; j++) {
                  const char = w.word[j];
                  
                  // Scan placed word for matching char
                  const pDr = pw.orientation === 'down' ? 1 : 0;
                  const pDc = pw.orientation === 'across' ? 1 : 0;
                  
                  for (let k = 0; k < pw.word.length; k++) {
                       if (pw.word[k] === char) {
                           // Potential intersection
                           const intersectR = pw.row + k * pDr;
                           const intersectC = pw.col + k * pDc;
                           
                           const newOrientation: Orientation = pw.orientation === 'across' ? 'down' : 'across';
                           const nDr = newOrientation === 'down' ? 1 : 0;
                           const nDc = newOrientation === 'across' ? 1 : 0;
                           
                           const startR = intersectR - (j * nDr);
                           const startC = intersectC - (j * nDc);
                           
                           if (canPlace(w.word, startR, startC, newOrientation)) {
                               bestPlacement = { ...w, row: startR, col: startC, orientation: newOrientation };
                               break;
                           }
                       }
                  }
                  if (bestPlacement) break;
              }
              if (bestPlacement) break;
          }

          if (bestPlacement) {
              placeWordInMap(bestPlacement);
              unplaced.splice(i, 1);
              changed = true;
              i--; 
          }
      }
  }

  return placed;
};