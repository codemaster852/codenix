
import React, { useState, useEffect } from 'react';
import { Army, LocalStrategyAdvice } from '../types';
import { BrainCircuit, Info, ShieldAlert, Map, ScrollText } from 'lucide-react';

interface StrategyPanelProps {
  army: Army;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ army }) => {
  const [advice, setAdvice] = useState<LocalStrategyAdvice | null>(null);

  useEffect(() => {
    if (army.units.length === 0) {
      setAdvice(null);
      return;
    }

    // Local heuristic logic
    const unitNames = army.units.map(u => u.name);
    const classes = army.units.map(u => u.className);
    
    let tactics = "Maintain a balanced frontline and protect your economy.";
    let counters = ["Beware of enemy Giants", "Watch for Archidon flanking"];
    let mainAdvice = "Build 4-5 Miners early to secure a strong gold lead.";

    if (classes.filter(c => c === 'Miner').length > 1) {
      tactics = "Economic Boom: You have multiple miner types. Focus on defending the gold mines while your economy scales.";
      mainAdvice = "Deploy Speartons near the defense line to protect your high gold investment.";
    }

    if (classes.includes('Giant') || classes.includes('Special')) {
      tactics = "Heavy Assault: Your army is built for raw power. Push aggressively once your elites are deployed.";
      counters.push("Avoid small skirmishes; fight in one massive wave.");
      mainAdvice = "Use Cold magic to freeze defenders while your Giant approaches.";
    }

    if (classes.filter(c => c === 'Ranger').length >= 2) {
      tactics = "Ranged Supremacy: Keep your archers behind a wall of Speartons.";
      mainAdvice = "Use the 'Defend' battle mode to keep your archers at maximum effective range.";
    }

    setAdvice({
      tactics,
      counters,
      advice: mainAdvice
    });
  }, [army]);

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-amber-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-amber-500" size={20} />
            Order Strategist
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tactical Deployment Analysis</p>
        </div>
      </div>

      {advice ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div className="space-y-4">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <h4 className="text-amber-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                <Info size={12} /> Battle Tactics
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">{advice.tactics}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <h4 className="text-blue-400 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                <Map size={12} /> Command Advice
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">{advice.advice}</p>
            </div>
          </div>
          
          <div className="md:col-span-2 p-4 bg-red-950/20 rounded-xl border border-red-900/20">
             <h4 className="text-red-400 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                <ShieldAlert size={12} /> Threat Assessment
              </h4>
              <ul className="grid grid-cols-2 gap-2">
                {advice.counters.map((c, i) => (
                  <li key={i} className="text-slate-400 text-[10px] flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500" /> {c}
                  </li>
                ))}
              </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
          <p className="text-slate-500 text-xs">
            Select your units to receive strategic insights from the Order Command.
          </p>
        </div>
      )}
    </div>
  );
};
