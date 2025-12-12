import React, { useState } from 'react';
import { X, Settings, Link, Unlink } from 'lucide-react';
import { GridConfig, GridStyle } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GridConfig;
  onUpdate: (config: GridConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdate }) => {
  const [isLinked, setIsLinked] = useState(true);

  if (!isOpen) return null;

  const handleStyleChange = (key: keyof GridStyle, value: string | number) => {
    onUpdate({
      ...config,
      style: {
        ...config.style,
        [key]: value
      }
    });
  };

  const handleDimensionChange = (key: 'rows' | 'cols', value: string) => {
    const val = parseInt(value);
    if (!isNaN(val) && val >= 5 && val <= 35) {
      if (isLinked) {
        onUpdate({ ...config, rows: val, cols: val });
      } else {
        onUpdate({ ...config, [key]: val });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-100 text-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings size={18} />
            Настройки
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Grid Size */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Размер сетки</label>
                 <button 
                    onClick={() => setIsLinked(!isLinked)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                    title={isLinked ? "Разорвать связь" : "Связать ширину и высоту"}
                 >
                    {isLinked ? <Link size={16}/> : <Unlink size={16}/>}
                 </button>
            </div>
            
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-600 w-16 font-medium">Ширина</span>
                    <input 
                        type="range" 
                        min="5" 
                        max="35" 
                        value={config.cols} 
                        onChange={(e) => handleDimensionChange('cols', e.target.value)}
                        className="flex-1"
                    />
                    <span className="font-mono font-bold w-6 text-right text-sm">{config.cols}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-600 w-16 font-medium">Высота</span>
                    <input 
                        type="range" 
                        min="5" 
                        max="35" 
                        value={config.rows} 
                        onChange={(e) => handleDimensionChange('rows', e.target.value)}
                        className="flex-1"
                    />
                    <span className="font-mono font-bold w-6 text-right text-sm">{config.rows}</span>
                </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Borders */}
          <div className="space-y-2">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Границы</label>
             <div className="flex items-center gap-4">
                <span className="text-xs text-slate-600 w-16 font-medium">Толщина</span>
                <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="0.5"
                    value={config.style.borderWidth} 
                    onChange={(e) => handleStyleChange('borderWidth', parseFloat(e.target.value))}
                    className="flex-1"
                />
                <span className="font-mono font-bold w-6 text-right text-sm">{config.style.borderWidth}</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Colors */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Цвета</label>
            
            <div className="grid grid-cols-2 gap-4">
                <ColorInput 
                    label="Рамка" 
                    value={config.style.borderColor} 
                    onChange={(v) => handleStyleChange('borderColor', v)} 
                />
                <ColorInput 
                    label="Сетка (пустая)" 
                    value={config.style.cellBorderColor} 
                    onChange={(v) => handleStyleChange('cellBorderColor', v)} 
                />
                <ColorInput 
                    label="Границы слов" 
                    value={config.style.wordBorderColor} 
                    onChange={(v) => handleStyleChange('wordBorderColor', v)} 
                />
                <ColorInput 
                    label="Фон слова" 
                    value={config.style.filledColor} 
                    onChange={(v) => handleStyleChange('filledColor', v)} 
                />
                <ColorInput 
                    label="Фон пустой" 
                    value={config.style.emptyColor} 
                    onChange={(v) => handleStyleChange('emptyColor', v)} 
                />
                 <ColorInput 
                    label="Текст" 
                    value={config.style.textColor} 
                    onChange={(v) => handleStyleChange('textColor', v)} 
                />
                 <ColorInput 
                    label="Номера" 
                    value={config.style.numberColor} 
                    onChange={(v) => handleStyleChange('numberColor', v)} 
                />
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden"
            />
        </div>
    </div>
);

export default SettingsModal;