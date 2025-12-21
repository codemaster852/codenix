
import React, { useState } from 'react';
import { MASTER_ROSTER, MAGIC_ELEMENTS, UNIT_CLASSES } from '../constants';
import { StickUnit, MagicElement } from '../types';
import { Check, Info, Swords, Sparkles, ShieldCheck } from 'lucide-react';
import { UnitPreview } from './UnitPreview';

interface DeckSelectionProps {
  onConfirm: (selectedUnitIds: string[], selectedMagic: MagicElement[]) => void;
}

export const DeckSelection: React.FC<DeckSelectionProps> = ({ onConfirm }) => {
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<MagicElement[]>([]);

  const toggleUnit = (id: string) => {
    if (selectedUnits.includes(id)) {
      setSelectedUnits(prev => prev.filter(uid => uid !== id));
    } else if (selectedUnits.length < 8) {
      setSelectedUnits(prev => [...prev, id]);
    }
  };

  const toggleMagic = (name: MagicElement) => {
    if (selectedMagic.includes(name)) {
      setSelectedMagic(prev => prev.filter(m => m !== name));
    } else if (selectedMagic.length < 2) {
      setSelectedMagic(prev => [...prev, name]);
    }
  };

  const isReady = selectedUnits.length === 8 && selectedMagic.length === 2;

  return (
    <div className="w-full max-w-6xl mx-auto p-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-12">
        <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-4">
          CHOOSE YOUR <span className="text-amber-500">LEGACY</span>
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Select 8 Units and 2 Magic Elements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Unit Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <Swords className="text-amber-500" /> WARRIORS ({selectedUnits.length}/8)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {MASTER_ROSTER.map(unit => {
              const isSelected = selectedUnits.includes(unit.id);
              const isDisabled = !isSelected && selectedUnits.length >= 8;
              
              return (
                <button
                  key={unit.id}
                  onClick={() => toggleUnit(unit.id)}
                  disabled={isDisabled}
                  className={`group relative flex flex-col p-3 rounded-3xl border transition-all text-left ${
                    isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 scale-105 shadow-xl shadow-amber-500/20' : 
                    isDisabled ? 'bg-slate-900/30 border-white/5 opacity-40 cursor-not-allowed grayscale' : 
                    'bg-slate-900/50 border-white/10 hover:border-amber-500/50 hover:bg-slate-800'
                  }`}
                >
                  {isSelected && <Check className="absolute top-2 right-2 z-10 bg-slate-950 text-amber-500 rounded-full p-0.5" size={14} />}
                  <div className="h-24 w-full mb-3">
                    <UnitPreview className={unit.className} unitName={unit.name} color={isSelected ? "#020617" : "#f59e0b"} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight mb-1 truncate">{unit.name}</span>
                  <div className="flex items-center justify-between mt-auto">
                     <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-slate-950/60' : 'text-slate-500'}`}>
                      {unit.className}
                    </span>
                    <span className="text-[10px] font-black">{unit.stats.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Magic Selection */}
        <div className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <Sparkles className="text-amber-500" /> MAGIC ELEMENTS ({selectedMagic.length}/2)
            </h3>
            <div className="space-y-4">
              {MAGIC_ELEMENTS.map(magic => {
                const isSelected = selectedMagic.includes(magic.name as MagicElement);
                const isDisabled = !isSelected && selectedMagic.length >= 2;
                
                return (
                  <button
                    key={magic.name}
                    onClick={() => toggleMagic(magic.name as MagicElement)}
                    disabled={isDisabled}
                    className={`group relative flex items-center gap-5 p-6 rounded-3xl border transition-all text-left w-full ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xl' : 
                      isDisabled ? 'bg-slate-900/30 border-white/5 opacity-40 cursor-not-allowed' : 
                      'bg-slate-900/50 border-white/10 hover:border-amber-500/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
                      {React.createElement(magic.icon, { size: 24 })}
                    </div>
                    <div>
                      <span className="text-base font-black uppercase tracking-tight block">{magic.name}</span>
                      <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-slate-950/70' : 'text-slate-400'}`}>
                        {magic.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <button
              onClick={() => onConfirm(selectedUnits, selectedMagic)}
              disabled={!isReady}
              className={`w-full py-8 rounded-[2.5rem] font-black text-3xl italic uppercase tracking-tighter transition-all flex items-center justify-center gap-4 ${
                isReady ? 'bg-amber-500 text-slate-950 hover:scale-105 active:scale-95 shadow-2xl' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              READY FOR WAR <ShieldCheck size={32} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
