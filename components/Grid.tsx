import React, { useState, useRef } from 'react';
import { GridCellData, Orientation, WordData, GridConfig, PlacedWord } from '../types';
import { validatePlacement } from '../utils';
import { RotateCw, Trash2, X } from 'lucide-react';

interface GridProps {
  grid: GridCellData[][];
  activeWord: WordData | null;
  placedWords: PlacedWord[];
  onPlaceWord: (word: WordData, row: number, col: number, orientation: Orientation) => void;
  onRemoveWord: (wordId: string) => void;
  onRotateWord: (wordId: string) => void;
  orientation: Orientation;
  toggleOrientation: () => void;
  isModeHidden: boolean;
  config: GridConfig;
}

const Grid: React.FC<GridProps> = ({ 
  grid, 
  activeWord, 
  placedWords,
  onPlaceWord, 
  onRemoveWord,
  onRotateWord,
  orientation,
  toggleOrientation,
  isModeHidden,
  config
}) => {
  const [hoverPos, setHoverPos] = useState<{ r: number, c: number } | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  
  const handleCellClick = (r: number, c: number) => {
    // If dragging a word, try to place it
    if (activeWord) {
      if (validatePlacement(grid, activeWord.word, r, c, orientation, config.rows, config.cols)) {
        onPlaceWord(activeWord, r, c, orientation);
      }
    } else {
        // If clicking on an existing word, select it
        const cell = grid[r][c];
        if (cell.wordIds.length > 0) {
           const topWordId = cell.wordIds[cell.wordIds.length - 1];
           setSelectedWordId(topWordId === selectedWordId ? null : topWordId);
        } else {
            setSelectedWordId(null);
        }
    }
  };

  const getWordPosition = (wordId: string) => {
      const word = placedWords.find(w => w.id === wordId);
      if (!word) return null;
      // Calculate center of word for popup
      const isAcross = word.orientation === 'across';
      const r = word.row + (isAcross ? 0 : Math.floor(word.word.length / 2));
      const c = word.col + (isAcross ? Math.floor(word.word.length / 2) : 0);
      return { r, c };
  };
  
  const selectedWordPos = selectedWordId ? getWordPosition(selectedWordId) : null;

  // Determine cell styling based on state
  const getCellStyle = (r: number, c: number, cell: GridCellData) => {
    const isHovered = hoverPos && activeWord;
    const borderWidth = config.style.borderWidth || 1;
    
    let isPhantom = false;
    let isValidPhantom = true;

    if (isHovered && activeWord) {
       const dr = orientation === 'down' ? 1 : 0;
       const dc = orientation === 'across' ? 1 : 0;
       const index = orientation === 'down' ? (r - hoverPos.r) : (c - hoverPos.c);
       const otherAxisMatch = orientation === 'down' ? (c === hoverPos.c) : (r === hoverPos.r);

       if (otherAxisMatch && index >= 0 && index < activeWord.word.length) {
         isPhantom = true;
         isValidPhantom = validatePlacement(grid, activeWord.word, hoverPos.r, hoverPos.c, orientation, config.rows, config.cols);
       }
    }

    const isSelected = selectedWordId && cell.wordIds.includes(selectedWordId);

    // Base Style
    const style: React.CSSProperties = {
        color: config.style.textColor,
        borderWidth: `${borderWidth}px`,
        borderStyle: 'solid',
        // Negative margin causes borders to overlap, preventing double-thickness
        marginRight: `-${borderWidth}px`,
        marginBottom: `-${borderWidth}px`,
        zIndex: 1 // Default z-index
    };

    if (isPhantom) {
      style.backgroundColor = isValidPhantom ? "#dcfce7" : "#fee2e2"; 
      style.borderColor = isValidPhantom ? config.style.wordBorderColor : '#ef4444'; 
      style.zIndex = 20; // Phantom on top
      if (!isValidPhantom) style.color = "#dc2626"; 
    } else if (cell.isError) {
      style.backgroundColor = "#fecaca"; 
      style.borderColor = '#ef4444';
      style.zIndex = 15;
    } else if (cell.char) {
      style.backgroundColor = config.style.filledColor;
      style.borderColor = config.style.wordBorderColor;
      style.zIndex = 10; // Word cells above empty cells
      if (isSelected) {
          style.backgroundColor = '#e0e7ff'; // Highlight selected word
      }
    } else {
      style.backgroundColor = config.style.emptyColor;
      style.borderColor = config.style.cellBorderColor;
    }

    return { style, isPhantom, isValidPhantom };
  };

  return (
    <div className="relative inline-block">
        {/* Border container wrapper to handle the outer edge clipping caused by negative margins */}
        <div 
            className="inline-block"
            // Add padding equal to border width to contain overflowing borders on the right/bottom
            style={{ paddingRight: `${config.style.borderWidth}px`, paddingBottom: `${config.style.borderWidth}px` }} 
            onMouseLeave={() => setHoverPos(null)}
            onContextMenu={(e) => {
                e.preventDefault();
                toggleOrientation();
            }}
        >
        {grid.map((row, r) => (
            <div key={r} className="flex">
            {row.map((cell, c) => {
                const { style, isPhantom, isValidPhantom } = getCellStyle(r, c, cell);
                return (
                    <div
                    key={c}
                    className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center relative cursor-pointer text-lg font-bold transition-colors duration-75 select-none`}
                    style={style}
                    onMouseEnter={() => setHoverPos({ r, c })}
                    onClick={() => handleCellClick(r, c)}
                    >
                    {/* Clue Number */}
                    {cell.clueNumber && (
                        <span 
                            className="absolute top-0.5 left-0.5 text-[8px] md:text-[10px] leading-none font-normal font-sans"
                            style={{ color: config.style.numberColor }}
                        >
                        {cell.clueNumber}
                        </span>
                    )}
                    
                    {/* Character or Phantom Character */}
                    {!isModeHidden && (
                        <>
                            {isPhantom && isValidPhantom && (
                                (() => {
                                    const dr = orientation === 'down' ? 1 : 0;
                                    const dc = orientation === 'across' ? 1 : 0;
                                    const idx = (r - hoverPos!.r) * dr + (c - hoverPos!.c) * dc;
                                    return activeWord?.word[idx];
                                })()
                            )}
                            {cell.char}
                        </>
                    )}
                    {!isModeHidden && isPhantom && !isValidPhantom && '?'}
                    </div>
                );
            })}
            </div>
        ))}
        </div>

        {/* Selected Word Context Menu */}
        {selectedWordPos && !activeWord && (
            <div 
                className="absolute z-50 flex flex-col gap-1 bg-white shadow-xl rounded-lg p-1.5 border border-slate-200 animate-in fade-in zoom-in duration-200 no-print"
                style={{ 
                    top: `${selectedWordPos.r * 40}px`, // Approximate positioning based on cell size
                    left: `${selectedWordPos.c * 40 + 50}px` 
                }}
            >
                 <div className="flex items-center justify-between pb-1 border-b mb-1">
                     <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Действия</span>
                     <button onClick={() => setSelectedWordId(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
                 </div>
                 <button 
                    onClick={() => { onRotateWord(selectedWordId!); setSelectedWordId(null); }}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded text-xs text-slate-700 font-medium"
                >
                    <RotateCw size={14} /> Повернуть
                </button>
                 <button 
                    onClick={() => { onRemoveWord(selectedWordId!); setSelectedWordId(null); }}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 hover:text-red-600 rounded text-xs text-red-500 font-medium"
                >
                    <Trash2 size={14} /> Удалить
                </button>
            </div>
        )}
    </div>
  );
};

export default Grid;