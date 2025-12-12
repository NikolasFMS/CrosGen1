import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import { Printer, Eye, EyeOff, FileText, Sparkles, Trash2, RotateCw, Settings as SettingsIcon, Wand2, Download, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
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
            // Check if we need to preserve IDs if reloading from storage, 
            // but here we generate new IDs for raw text input parsing. 
            // Logic for state restoration is handled separately.
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
    return saved ? JSON.parse(saved).words : []; // Will be populated by effect if empty but input exists
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
    
    // When typing, we generate new IDs. This breaks placed words link.
    // Ideally, we should diff, but for simplicity, we re-parse.
    // Use existing IDs if word/clue matches to preserve placement? 
    // For now simple re-parse.
    const newWords = parseInput(text);
    
    // Try to match existing placed words to new words to keep them on grid
    const remappedPlacedWords: PlacedWord[] = [];
    const newWordList: WordData[] = newWords.map(nw => {
        // Is this word already placed?
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
        // Capitalize first letter of clue
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
    // Trigger re-parse via effect or direct call? Direct call safer for sync.
    const newWords = parseInput(formattedText);
    
    // Logic to preserve placements similar to input change
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
  };

  const handleAutoArrange = () => {
     if (words.length === 0) return;
     const layout = generateLayout(words, gridConfig.rows, gridConfig.cols);
     setPlacedWords(layout);
     if (layout.length < words.length) {
         // Could add a toast here, but for now console/visual cue is enough
         console.warn("Could not place all words");
     }
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
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between no-print shadow-sm z-10">
        <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
                <FileText size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Архитектор Кроссвордов</h1>
                <p className="text-xs text-slate-500">Создание и Печать</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={handleAutoArrange}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition shadow-sm text-sm font-medium"
                title="Автоматически расставить слова"
            >
                <LayoutTemplate size={16} />
                Авторасстановка
            </button>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="Настройки"
            >
                <SettingsIcon size={18} />
            </button>
             <button 
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition shadow-sm text-sm font-medium"
            >
                <Sparkles size={16} />
                AI Генератор
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button 
                onClick={handleSaveImage}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition shadow-sm text-sm font-medium"
                title="Сохранить как картинку"
            >
                <ImageIcon size={16} />
                Сохранить PNG
            </button>
            <button 
                onClick={() => setIsModeHidden(!isModeHidden)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isModeHidden ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                {isModeHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                {isModeHidden ? 'Показать ответы' : 'Скрыть ответы'}
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm text-sm font-medium"
            >
                <Printer size={16} />
                Печать
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Input & Word Bank - No Print */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col no-print z-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="flex-1 flex flex-col min-h-0">
             {/* Tabs or Split View */}
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 relative">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ввод слов</h3>
                    <button 
                        onClick={handleFormatText}
                        className="text-[10px] flex items-center gap-1 bg-white border px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Формат: Заглавные, удалить повторы, исправить регистр определений"
                    >
                        <Wand2 size={10} />
                        Формат
                    </button>
                </div>
                <textarea 
                    className="w-full h-32 p-3 text-xs border rounded-md font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="СЛОВО - Определение"
                    value={inputText}
                    onChange={handleInputChange}
                />
                <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>СЛОВО - Определение</span>
                    <span>{words.length} слов</span>
                </p>
             </div>

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
        <div className="flex-1 overflow-auto bg-slate-100/50 p-8 flex flex-col items-center print-container">
            
            <div ref={printRef} className="max-w-4xl w-full bg-white shadow-xl rounded-xl p-8 print:shadow-none print:p-0 flex flex-col gap-8 print-break-inside-avoid">
                
                {/* Print Header */}
                <div className="hidden print:block text-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Кроссворд</h1>
                    <p className="text-slate-500">Заполните сетку, используя подсказки ниже.</p>
                </div>

                {/* 1. The Grid (Top) */}
                <div className="flex flex-col items-center justify-center mb-4">
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
                     <div className="mt-4 text-center text-xs text-slate-400 no-print flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1"><RotateCw size={12}/> ПКМ по сетке или выберите слово для поворота</span>
                    </div>
                </div>

                {/* 2. Clues (Bottom) */}
                <div className="grid grid-cols-2 gap-8 w-full border-t pt-8">
                    <div>
                        <h3 className="text-lg font-bold border-b pb-2 mb-4 text-slate-800">
                            По горизонтали
                        </h3>
                        <ul className="space-y-2 mb-6 text-sm">
                            {clues.filter(c => c.orientation === 'across').map(c => (
                                <li key={`a-${c.number}`} className="flex gap-2">
                                    <span className="font-bold text-slate-900 w-6 text-right flex-shrink-0">{c.number}.</span>
                                    <span className="text-slate-700">{c.clue}</span>
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
                                    <span className="text-slate-700">{c.clue}</span>
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