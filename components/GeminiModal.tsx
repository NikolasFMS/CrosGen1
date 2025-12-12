import React, { useState } from 'react';
import { generateCrosswordData } from '../services/geminiService';
import { GeneratedContent } from '../types';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface GeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: GeneratedContent) => void;
}

const GeminiModal: React.FC<GeminiModalProps> = ({ isOpen, onClose, onImport }) => {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Russian');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generateCrosswordData(topic, language);
      onImport(data);
      onClose();
    } catch (e) {
      setError("Ошибка генерации. Проверьте API ключ или попробуйте другую тему.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={18} />
            AI Генератор
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Введите тему, и Gemini сгенерирует список слов и определений для кроссворда.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Тема</label>
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: Космос, Литература, Города"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-700 mb-1">Язык</label>
             <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
             >
                 <option value="Russian">Русский</option>
                 <option value="English">Английский</option>
                 <option value="Spanish">Испанский</option>
                 <option value="French">Французский</option>
                 <option value="German">Немецкий</option>
             </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiModal;