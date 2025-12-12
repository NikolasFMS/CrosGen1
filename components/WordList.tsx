import React from 'react';
import { WordData } from '../types';
import { GripVertical, Check, RefreshCw } from 'lucide-react';

interface WordListProps {
  words: WordData[];
  placedWordIds: Set<string>;
  activeWordId: string | null;
  onSelectWord: (word: WordData) => void;
  orientation: 'across' | 'down';
  toggleOrientation: () => void;
}

const WordList: React.FC<WordListProps> = ({ 
  words, 
  placedWordIds, 
  activeWordId, 
  onSelectWord,
  orientation,
  toggleOrientation
}) => {
  return (
    <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Банк Слов</h3>
             <button 
                onClick={toggleOrientation}
                className="text-xs flex items-center gap-1 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 transition-colors"
                title="ПКМ по сетке или нажмите для поворота"
             >
                <RefreshCw size={12} />
                {orientation === 'across' ? 'Гориз.' : 'Верт.'}
             </button>
        </div>
     
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {words.length === 0 && (
            <p className="text-sm text-slate-400 italic">Слов пока нет.</p>
        )}
        {words.map((w) => {
          const isPlaced = placedWordIds.has(w.id);
          const isActive = activeWordId === w.id;
          
          return (
            <div
              key={w.id}
              onClick={() => !isPlaced && onSelectWord(w)}
              className={`
                group relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                ${isPlaced 
                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-default' 
                    : isActive 
                        ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500' 
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {!isPlaced && <GripVertical size={16} className="text-slate-400 flex-shrink-0" />}
                <div className="flex flex-col truncate">
                    <span className={`font-bold text-sm ${isPlaced ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                        {w.word}
                    </span>
                    <span className="text-xs text-slate-500 truncate" title={w.clue}>
                        {w.clue}
                    </span>
                </div>
              </div>
              
              {isPlaced && <Check size={16} className="text-green-500 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WordList;