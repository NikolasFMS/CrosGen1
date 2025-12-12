import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import { Printer, Eye, EyeOff, FileText, Sparkles, Trash2, RotateCw, Settings as SettingsIcon, Wand2, Download, Image as ImageIcon, LayoutTemplate, Grid3X3, List } from 'lucide-react';
import { WordData, PlacedWord, Orientation, GeneratedContent, GridConfig } from './types';
import { calculateGrid, validatePlacement, generateLayout } from './utils';
import { EXAMPLE_INPUT, DEFAULT_ROWS, DEFAULT_COLS, DEFAULT_STYLE } from './constants';
import Grid from './components/Grid';
import WordList from './components/WordList';
import GeminiModal from './components/GeminiModal';
import SettingsModal from './components/SettingsModal';

// Helper to parse raw text input
const parseInput = (text: string): WordData[] => {
  return text.split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => {
      const parts = line.split('-').map(p => p.trim());
      // Handle "WORD - Definition"
      if (parts.length >= 2) {
        const word = parts[0].replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toUpperCase();
        const clue = parts.slice(1).join('-').trim();
        if (word && clue) {
            return { id: uuidv4(), word, clue };
        }
      }
      return null;
    })
    .filter((w): w is WordData => w !== null);
};

// Storage Key
const STORAGE_KEY = 'crossword_architect_v1';

const App: React.FC = () => {
  // --- Lazy Init State from LocalStorage ---
  const [inputText, setInputText] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).inputText : EXAMPLE_INPUT;
  });

  const [words, setWords] = useState<WordData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).words : []; 
  });

  const [placedWords, setPlacedWords] = useState<PlacedWord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).placedWords : [];
  });

  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
     const saved = localStorage.getItem(STORAGE_KEY);
     return saved ? JSON.parse(saved).gridConfig : {
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        style: DEFAULT_STYLE
     };
  });

  // --- Other State ---
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('across');
  const [isModeHidden, setIsModeHidden] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'words' | 'grid'>('words'); // 'words' | 'grid'

  const printRef = useRef<HTMLDivElement>(null);
  
  // --- Effects ---
  
  // Initial parsing if no words loaded but input exists (first run fallback)
  useEffect(() => {
    if (words.length === 0 && inputText) {
         setWords(parseInput(inputText));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-Save
  useEffect(() => {
    const stateToSave = {
        inputText,
        words,
        placedWords,
        gridConfig
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [inputText, words, placedWords, gridConfig]);


  // --- Derived State ---
  const { grid, clues } = useMemo(() => calculateGrid(placedWords, gridConfig.rows, gridConfig.cols), [placedWords, gridConfig.rows, gridConfig.cols]);
  
  const placedWordIds = useMemo(() => new Set(placedWords.map(w => w.id)), [placedWords]);

  const activeWord = useMemo(() => 
    words.find(w => w.id === activeWordId) || null
  , [words, activeWordId]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    const newWords = parseInput(text);
    
    // Try to match existing placed words to new words to keep them on grid
    const remappedPlacedWords: PlacedWord[] = [];
    const newWordList: WordData[] = newWords.map(nw => {
        const existing = placedWords.find(pw => pw.word === nw.word && pw.clue === nw.clue);
        if (existing) {
             remappedPlacedWords.push({ ...existing, id: nw.id });
        }
        return nw;
    });

    setWords(newWordList);
    setPlacedWords(remappedPlacedWords);
  };

  const handleFormatText = () => {
    const uniqueMap = new Map<string, string>();
    
    inputText.split('\n').forEach(line => {
      const parts = line.split('-');
      if (parts.length >= 2) {
        const word = parts[0].trim().toUpperCase();
        let clue = parts.slice(1).join('-').trim();
        if (clue.length > 0) {
            clue = clue.charAt(0).toUpperCase() + clue.slice(1);
        }
        
        if (word && clue && !uniqueMap.has(word)) {
           uniqueMap.set(word, clue);
        }
      }
    });

    const formattedText = Array.from(uniqueMap.entries())
      .map(([w, c]) => `${w} - ${c}`)
      .join('\n');
    
    setInputText(formattedText);
    const newWords = parseInput(formattedText);
    
    const remappedPlacedWords: PlacedWord[] = [];
    const newWordList = newWords.map(nw => {
         const existing = placedWords.find(pw => pw.word === nw.word && pw.clue === nw.clue);
         if (existing) {
             remappedPlacedWords.push({ ...existing, id: nw.id });
         }
         return nw;
    });

    setWords(newWordList);
    setPlacedWords(remappedPlacedWords);
  };

  const handleAiImport = (content: GeneratedContent) => {
      const textBlock = content.words.map(w => `${w.word} - ${w.clue}`).join('\n');
      setInputText(textBlock);
      setWords(parseInput(textBlock));
      setPlacedWords([]); 
      // Stay on words tab to review, or switch? Stay is better.
  };

  const handleAutoArrange = () => {
     if (words.length === 0) return;
     const layout = generateLayout(words, gridConfig.rows, gridConfig.cols);
     setPlacedWords(layout);
     if (layout.length < words.length) {
         console.warn("Could not place all words");
     }
     setMobileTab('grid'); // Switch to grid view on mobile
  };

  const handlePlaceWord = (word: WordData, row: number, col: number, orient: Orientation) => {
    setPlacedWords(prev => [
      ...prev,
      { ...word, row, col, orientation: orient }
    ]);
    setActiveWordId(null); 
  };

  const handleRemoveWord = (wordId: string) => {
    setPlacedWords(prev => prev.filter(w => w.id !== wordId));
  };

  const handleRotateWord = (wordId: string) => {
    setPlacedWords(prev => {
        const word = prev.find(w => w.id === wordId);
        if (!word) return prev;
        const newOrientation = word.orientation === 'across' ? 'down' : 'across';
        return prev.map(w => w.id === wordId ? { ...w, orientation: newOrientation } : w);
    });
  };

  const handlePrint = () => {
    setIsModeHidden(true); 
    setTimeout(() => {
      window.print();
    }, 500); 
  };

  const handleSaveImage = async () => {
    if (!printRef.current) return;
    setIsModeHidden(true);
    
    // Wait for render
    setTimeout(async () => {
        try {
            const canvas = await html2canvas(printRef.current!, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                ignoreElements: (element) => element.classList.contains('no-print')
            });
            const link = document.createElement('a');
            link.download = `crossword-${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error("Failed to save image", err);
            alert("Не удалось сохранить изображение.");
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 print-container">
      {/* Header - No Print */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-wrap gap-y-3 items-center justify-between no-print shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-2 mr-4">
            <div className="bg-slate-900 text-white p-2 rounded-lg shrink-0">
                <FileText size={20} />
            </div>
            <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Архитектор Кроссвордов</h1>
            </div>
        </div>
        
        <div className="flex items-center gap-2 ml-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar max-w-full">
             <button 
                onClick={handleAutoArrange}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition shadow-sm text-sm font-medium whitespace-nowrap"
                title="Автоматически расставить слова"
            >
                <LayoutTemplate size={18} />
                <span className="hidden md:inline">Авто</span>
            </button>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-2.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="Настройки"
            >
                <SettingsIcon size={20} />
            </button>
             <button 
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition shadow-sm text-sm font-medium whitespace-nowrap"
            >
                <Sparkles size={18} />
                <span className="hidden md:inline">AI</span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>
            <button 
                onClick={handleSaveImage}
                className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition shadow-sm text-sm font-medium"
                title="Сохранить как картинку"
            >
                <ImageIcon size={20} />
                <span className="hidden lg:inline">PNG</span>
            </button>
            <button 
                onClick={() => setIsModeHidden(!isModeHidden)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm font-medium transition-colors ${isModeHidden ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                {isModeHidden ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm text-sm font-medium"
            >
                <Printer size={18} />
                <span className="hidden md:inline">Печать</span>
            </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex bg-white border-b border-slate-200 px-2 pt-2 no-print shrink-0">
          <button 
            onClick={() => setMobileTab('words')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${mobileTab === 'words' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <List size={16} /> Слова ({words.length})
          </button>
          <button 
            onClick={() => setMobileTab('grid')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${mobileTab === 'grid' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Grid3X3 size={16} /> Сетка
          </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Sidebar: Input & Word Bank */}
        <div className={`
            ${mobileTab === 'words' ? 'flex' : 'hidden'} 
            lg:flex flex-col 
            w-full lg:w-80 
            bg-white border-r border-slate-200 
            no-print z-10 shadow-lg lg:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]
            h-full
        `}>
          <div className="flex-1 flex flex-col min-h-0">
             {/* Input Area */}
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ввод слов</h3>
                    <button 
                        onClick={handleFormatText}
                        className="text-[10px] flex items-center gap-1 bg-white border px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Формат"
                    >
                        <Wand2 size={10} />
                        Формат
                    </button>
                </div>
                <textarea 
                    className="w-full h-24 md:h-32 p-3 text-xs border rounded-md font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="СЛОВО - Определение"
                    value={inputText}
                    onChange={handleInputChange}
                />
                <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>СЛОВО - Определение</span>
                </p>
             </div>

             {/* Word List */}
             <div className="flex-1 overflow-hidden p-4 bg-slate-50/30">
                <WordList 
                    words={words}
                    placedWordIds={placedWordIds}
                    activeWordId={activeWordId}
                    onSelectWord={(w) => setActiveWordId(w.id)}
                    orientation={orientation}
                    toggleOrientation={() => setOrientation(o => o === 'across' ? 'down' : 'across')}
                />
             </div>
          </div>
        </div>

        {/* Center: Workspace / Print View */}
        <div className={`
            ${mobileTab === 'grid' ? 'flex' : 'hidden'} 
            lg:flex flex-1 flex-col 
            overflow-auto bg-slate-100/50 p-2 md:p-8 items-center print-container
        `}>
            
            <div ref={printRef} className="max-w-4xl w-full bg-white shadow-xl rounded-xl p-4 md:p-8 print:shadow-none print:p-0 flex flex-col gap-6 md:gap-8 print-break-inside-avoid">
                
                {/* Print Header */}
                <div className="hidden print:block text-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Кроссворд</h1>
                    <p className="text-slate-500">Заполните сетку, используя подсказки ниже.</p>
                </div>

                {/* 1. The Grid (Top) */}
                <div className="flex flex-col items-center justify-center mb-2 md:mb-4">
                    <div className="max-w-full overflow-x-auto pb-4 md:pb-0 px-2 -mx-2 touch-pan-x">
                        <Grid 
                            grid={grid}
                            activeWord={activeWord}
                            placedWords={placedWords}
                            onPlaceWord={handlePlaceWord}
                            onRemoveWord={handleRemoveWord}
                            onRotateWord={handleRotateWord}
                            orientation={orientation}
                            toggleOrientation={() => setOrientation(o => o === 'across' ? 'down' : 'across')}
                            isModeHidden={isModeHidden}
                            config={gridConfig}
                        />
                    </div>
                     <div className="mt-4 text-center text-xs text-slate-400 no-print flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1"><RotateCw size={12}/> Нажмите для поворота</span>
                    </div>
                </div>

                {/* 2. Clues (Bottom) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full border-t pt-6 md:pt-8">
                    <div>
                        <h3 className="text-lg font-bold border-b pb-2 mb-4 text-slate-800">
                            По горизонтали
                        </h3>
                        <ul className="space-y-2 mb-4 md:mb-6 text-sm">
                            {clues.filter(c => c.orientation === 'across').map(c => (
                                <li key={`a-${c.number}`} className="flex gap-2">
                                    <span className="font-bold text-slate-900 w-6 text-right flex-shrink-0">{c.number}.</span>
                                    <span className="text-slate-700 leading-snug">{c.clue}</span>
                                </li>
                            ))}
                            {clues.filter(c => c.orientation === 'across').length === 0 && <li className="text-slate-400 italic">Нет вопросов</li>}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold border-b pb-2 mb-4 text-slate-800">
                            По вертикали
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {clues.filter(c => c.orientation === 'down').map(c => (
                                <li key={`d-${c.number}`} className="flex gap-2">
                                    <span className="font-bold text-slate-900 w-6 text-right flex-shrink-0">{c.number}.</span>
                                    <span className="text-slate-700 leading-snug">{c.clue}</span>
                                </li>
                            ))}
                             {clues.filter(c => c.orientation === 'down').length === 0 && <li className="text-slate-400 italic">Нет вопросов</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* Modals */}
      <GeminiModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        onImport={handleAiImport}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={gridConfig}
        onUpdate={setGridConfig}
      />
    </div>
  );
};

export default App;