
import React, { useState } from 'react';
import { StickUnit, UnitClass } from '../types';
import { UNIT_CLASSES } from '../constants';
import { UnitPreview } from './UnitPreview';
import { Save, X } from 'lucide-react';

interface UnitEditorProps {
  onSave: (unit: StickUnit) => void;
  onCancel: () => void;
  initialUnit?: StickUnit;
}

export const UnitEditor: React.FC<UnitEditorProps> = ({ onSave, onCancel, initialUnit }) => {
  const [unit, setUnit] = useState<StickUnit>(initialUnit || {
    id: Math.random().toString(36).substr(2, 9),
    name: 'New Legend',
    className: 'Warrior',
    stats: { health: 100, maxHealth: 100, damage: 15, speed: 6, range: 1, cost: 150, attackSpeed: 1000 },
    ability: 'None',
    lore: 'A brave soldier of the Order.'
  });

  const updateStat = (key: keyof typeof unit.stats, val: number) => {
    setUnit(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: val, maxHealth: key === 'health' ? val : prev.stats.maxHealth }
    }));
  };

  return (
    <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/10 shadow-2xl max-w-2xl w-full mx-auto animate-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-amber-500">
          {initialUnit ? 'REFORGE LEGEND' : 'CREATE UNIT'}
        </h2>
        <button onClick={onCancel} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-all">
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Unit Name</label>
            <input
              type="text"
              value={unit.name}
              onChange={e => setUnit({ ...unit, name: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-amber-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Class Specialty</label>
            <div className="grid grid-cols-2 gap-2">
              {UNIT_CLASSES.map(cls => (
                <button
                  key={cls.name}
                  onClick={() => setUnit({ ...unit, className: cls.name })}
                  className={`p-3 text-[10px] font-bold uppercase rounded-xl border flex items-center gap-2 transition-all ${
                    unit.className === cls.name 
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg' 
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <cls.icon size={14} />
                  {cls.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <UnitPreview className={unit.className} unitName={unit.name} color="#f59e0b" />
          
          <div className="space-y-4 p-4 bg-slate-950/50 rounded-3xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">HP ({unit.stats.health})</span>
              <input 
                type="range" min="50" max="1500" step="50" 
                value={unit.stats.health} 
                onChange={e => updateStat('health', parseInt(e.target.value))}
                className="w-32 accent-amber-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ATK ({unit.stats.damage})</span>
              <input 
                type="range" min="5" max="250" step="5" 
                value={unit.stats.damage} 
                onChange={e => updateStat('damage', parseInt(e.target.value))}
                className="w-32 accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => onSave(unit)}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase italic text-xl shadow-xl shadow-amber-500/10"
        >
          <Save size={24} />
          ENLIST WARRIOR
        </button>
        <button
          onClick={onCancel}
          className="px-8 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all uppercase text-sm"
        >
          DISCARD
        </button>
      </div>
    </div>
  );
};
