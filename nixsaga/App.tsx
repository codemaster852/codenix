
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StickUnit, GameState, Entity, UnitClass, BattleMode, MagicElement, Upgrades } from './types';
import { INITIAL_UNITS, UNIT_CLASSES, MASTER_ROSTER, MAGIC_ELEMENTS } from './constants';
import { Battlefield } from './components/Battlefield';
import { DeckSelection } from './components/DeckSelection';
import { soundEngine } from './sounds';
import { 
  Swords, 
  Coins, 
  Trophy, 
  ChevronRight, 
  Shield, 
  Home, 
  Target, 
  Hammer, 
  Swords as BattleIcon 
} from 'lucide-react';

const SPELL_COOLDOWNS: Record<MagicElement, number> = {
  'Blood Rain': 45000,
  'Fire': 20000,
  'Cold': 30000
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    gold: 500,
    enemyGold: 600,
    playerStatueHealth: 1000,
    enemyStatueHealth: 1000,
    entities: [],
    isGameOver: false,
    winner: null,
    level: 1,
    unlockedUnitIds: INITIAL_UNITS.map(u => u.id),
    battleMode: 'attack',
    phase: 'deck-selection',
    selectedDeck: [],
    selectedMagic: [],
    magicCooldowns: {},
    rageTimeRemaining: 0,
    upgrades: { damageLevel: 0, healthLevel: 0, miningLevel: 0 }
  });
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      setGameState(prev => {
        if (prev.rageTimeRemaining <= 0) return prev;
        return {
          ...prev,
          rageTimeRemaining: Math.max(0, prev.rageTimeRemaining - 100)
        };
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const setBattleMode = (mode: BattleMode) => {
    soundEngine.playCommand(mode);
    setGameState(prev => ({ ...prev, battleMode: mode }));
  };

  const castMagic = (spell: MagicElement) => {
    const now = Date.now();
    const cooldown = gameState.magicCooldowns[spell] || 0;
    if (now < cooldown) return;
    
    setGameState(prev => {
      let newEntities = [...prev.entities];
      if (spell === 'Blood Rain') {
        newEntities = newEntities.filter(e => e.type === 'player');
        soundEngine.playCommand('attack');
      } else if (spell === 'Fire') {
        newEntities = newEntities.map(e => 
          e.type === 'enemy' ? { ...e, currentHealth: Math.max(0, e.currentHealth - (350 + prev.level * 40)) } : e
        ).filter(e => e.currentHealth > 0);
      } else if (spell === 'Cold') {
        newEntities = newEntities.map(e => 
          e.type === 'enemy' ? { ...e, state: 'frozen' as const, freezeEndTime: Date.now() + 6000 } : e
        );
      }

      return {
        ...prev,
        entities: newEntities,
        magicCooldowns: { ...prev.magicCooldowns, [spell]: now + SPELL_COOLDOWNS[spell] }
      };
    });
  };

  const buyUpgrade = (type: keyof Upgrades) => {
    const cost = 400 + (gameState.upgrades[type] * 400);
    if (gameState.gold >= cost) {
      setGameState(prev => ({
        ...prev,
        gold: prev.gold - cost,
        upgrades: { ...prev.upgrades, [type]: prev.upgrades[type] + 1 }
      }));
      soundEngine.playCoin();
    }
  };

  const spawnUnit = useCallback((unit: StickUnit, type: 'player' | 'enemy') => {
    setGameState(prev => {
      const goldKey = type === 'player' ? 'gold' : 'enemyGold';
      if (prev[goldKey] < unit.stats.cost) return prev;

      if (type === 'player') soundEngine.playSpawn();

      const stats = { ...unit.stats };
      if (type === 'player') {
        stats.damage += prev.upgrades.damageLevel * 8;
        stats.maxHealth += prev.upgrades.healthLevel * 60;
      } else {
        stats.damage += prev.level * 2;
        stats.maxHealth += prev.level * 25;
      }

      const newEntity: Entity = {
        id: Math.random().toString(36).substring(2, 11),
        type,
        unit: { ...unit, stats },
        x: type === 'player' ? 100 : 1100,
        y: 380 + (Math.random() * 40 - 20),
        currentHealth: stats.maxHealth,
        state: 'idle',
        lastAttackTime: 0,
        animationFrame: 0,
        cargo: 0
      };

      return {
        ...prev,
        [goldKey]: prev[goldKey] - unit.stats.cost,
        entities: [...prev.entities, newEntity]
      };
    });
  }, []);

  const handleDeckConfirm = (deck: string[], magic: MagicElement[]) => {
    soundEngine.playCommand('attack');
    setGameState(prev => ({
      ...prev,
      selectedDeck: deck,
      selectedMagic: magic,
      unlockedUnitIds: deck,
      phase: 'level-splash'
    }));
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'playing' }));
    }, 1800);
  };

  useEffect(() => {
    if (gameState.isGameOver || gameState.phase !== 'playing') return;

    const aiAction = () => {
      const current = stateRef.current;
      if (current.isGameOver) return;

      const { enemyGold, entities, level } = current;
      const enemyUnits = entities.filter(e => e.type === 'enemy');
      const enemyMiners = enemyUnits.filter(e => e.unit.className === 'Miner');
      const minerUnit = MASTER_ROSTER.find(u => u.className === 'Miner')!;

      const targetMinerCount = 2 + Math.min(10, Math.floor(level / 1.2));
      if (enemyMiners.length < targetMinerCount && enemyGold >= minerUnit.stats.cost) {
        spawnUnit(minerUnit, 'enemy');
        return; 
      }

      const affordableUnits = MASTER_ROSTER.filter(u => u.stats.cost <= enemyGold && u.id !== 'u1');
      if (affordableUnits.length > 0) {
        const isBossStage = level % 5 === 0;
        const spawnChance = isBossStage ? 0.8 : (0.4 + level * 0.05);
        if (Math.random() < spawnChance) {
          const unitToSpawn = affordableUnits[Math.floor(Math.random() * affordableUnits.length)];
          const maxSquadSize = isBossStage ? 20 : (8 + level * 2);
          if (enemyUnits.length - enemyMiners.length < maxSquadSize) {
             spawnUnit(unitToSpawn, 'enemy');
          }
        }
      }
    };

    const intervalTime = Math.max(400, 1800 - (gameState.level * 180));
    const aiInterval = setInterval(aiAction, intervalTime);
    return () => clearInterval(aiInterval);
  }, [gameState.isGameOver, spawnUnit, gameState.phase, gameState.level]);

  const handleNextLevel = () => {
    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      gold: prev.gold + 600 + (prev.level * 150),
      enemyGold: 800 + (prev.level * 300),
      playerStatueHealth: 1000 + (prev.upgrades.healthLevel * 120),
      enemyStatueHealth: 1000 + (prev.level * 750),
      entities: [],
      isGameOver: false,
      winner: null,
      battleMode: 'attack',
      phase: 'level-splash',
      rageTimeRemaining: 0,
      magicCooldowns: {}
    }));
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'playing' }));
    }, 1800);
  };

  const unlockedUnits = MASTER_ROSTER.filter(u => gameState.unlockedUnitIds.includes(u.id));

  if (gameState.phase === 'level-splash') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="text-amber-500 mb-4 animate-bounce">
          <BattleIcon size={64} />
        </div>
        <h2 className="text-amber-500 text-[10vw] font-black italic tracking-tighter uppercase leading-none drop-shadow-2xl">
          STAGE {gameState.level}
        </h2>
        {gameState.level % 5 === 0 && (
          <p className="text-red-500 font-black text-2xl uppercase tracking-[0.5em] mt-2 animate-pulse">BOSS ENCOUNTER</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">
      {gameState.phase === 'playing' && (
        <header className="bg-slate-900/95 backdrop-blur-2xl border-b border-white/10 p-4 shrink-0 z-[100]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                  <Swords className="text-slate-950" size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">NixSaga</h1>
                  <p className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">Chronicles of Power</p>
                </div>
              </div>
              
              <div className="flex flex-col border-l border-white/10 pl-8">
                <span className="text-[9px] font-black text-slate-500 uppercase">GOLD</span>
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-amber-500" />
                  <span className="text-xl font-black tabular-nums">{gameState.gold}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/5">
                {[
                  { m: 'garrison', i: Home, t: 'Garrison' },
                  { m: 'defend', i: Shield, t: 'Defend' },
                  { m: 'attack', i: Target, t: 'Attack' }
                ].map(({ m, i: Icon, t }) => (
                  <button 
                    key={m} onClick={() => setBattleMode(m as BattleMode)}
                    className={`p-3 px-5 rounded-xl transition-all flex flex-col items-center gap-1 ${gameState.battleMode === m ? 'bg-amber-500 text-slate-950 shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Icon size={18} />
                    <span className="text-[8px] font-black uppercase">{t}</span>
                  </button>
                ))}
              </div>
              <div className="bg-slate-950/50 px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3">
                <Trophy size={18} className="text-amber-500" />
                <span className="text-sm font-black uppercase">LVL {gameState.level}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 p-4 flex flex-col items-center justify-center relative">
        {gameState.phase === 'deck-selection' ? (
          <DeckSelection onConfirm={handleDeckConfirm} />
        ) : (
          <div className="w-full max-w-7xl space-y-4 animate-in fade-in duration-700">
            <Battlefield gameState={gameState} setGameState={setGameState} onGameOver={() => {}} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 bg-slate-900/70 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white/10">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tactical Deployment</span>
                  <div className="flex gap-2">
                    {gameState.selectedMagic.map(magicName => {
                      const cooldownAt = gameState.magicCooldowns[magicName] || 0;
                      const isReady = currentTime >= cooldownAt;
                      const remaining = Math.max(0, Math.ceil((cooldownAt - currentTime) / 1000));
                      const magicInfo = MAGIC_ELEMENTS.find(m => m.name === magicName);
                      return (
                        <button key={magicName} onClick={() => castMagic(magicName)} disabled={!isReady} className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${isReady ? 'bg-slate-800 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-slate-950' : 'bg-slate-900 opacity-50'}`}>
                          {magicInfo && React.createElement(magicInfo.icon, { size: 14 })}
                          <span className="text-[9px] font-black uppercase">{magicName} {!isReady && `(${remaining}s)`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {unlockedUnits.map(unit => {
                    const unitClass = UNIT_CLASSES.find(c => c.name === unit.className);
                    const canAfford = gameState.gold >= unit.stats.cost;
                    return (
                      <button key={unit.id} onClick={() => spawnUnit(unit, 'player')} disabled={!canAfford} className={`p-4 rounded-3xl border flex flex-col items-center gap-1 transition-all ${canAfford ? 'bg-slate-800 border-white/10 hover:border-amber-500 active:scale-95 shadow-lg' : 'bg-slate-950 opacity-40 grayscale'}`}>
                        <div className="mb-1 text-amber-500">
                          {React.createElement(unitClass?.icon || Swords, { size: 20 })}
                        </div>
                        <span className="text-[9px] font-black uppercase truncate w-full text-center">{unit.name}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Coins size={10} className="text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500">{unit.stats.cost}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900/70 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white/10">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                   <Hammer size={12} /> Global Armory
                 </h4>
                 <div className="space-y-3">
                    {[
                      { type: 'damageLevel', label: 'Unit Damage', i: Swords },
                      { type: 'healthLevel', label: 'Unit Vitality', i: Shield }
                    ].map(u => {
                      const cost = 400 + (gameState.upgrades[u.type as keyof Upgrades] * 400);
                      const canAfford = gameState.gold >= cost;
                      return (
                        <button key={u.type} onClick={() => buyUpgrade(u.type as keyof Upgrades)} disabled={!canAfford} className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${canAfford ? 'bg-slate-950/50 border-white/10 hover:bg-slate-800 active:scale-95' : 'opacity-40 grayscale'}`}>
                          <div className="flex items-center gap-3">
                            <u.i size={16} className="text-amber-500" />
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black uppercase">{u.label}</span>
                              <span className="text-[9px] text-slate-500">Rank {gameState.upgrades[u.type as keyof Upgrades]}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-black text-amber-500">{cost}G</span>
                        </button>
                      );
                    })}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {gameState.isGameOver && (
        <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in zoom-in duration-300">
           <div className="text-center space-y-12">
              <h3 className={`text-[12rem] font-black italic uppercase leading-none drop-shadow-2xl ${gameState.winner === 'player' ? 'text-amber-500' : 'text-red-600'}`}>
                {gameState.winner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </h3>
              <div className="flex justify-center gap-6">
                <button onClick={() => { if(gameState.winner === 'player') handleNextLevel(); else window.location.reload(); }} className="px-20 py-8 bg-amber-500 text-slate-950 font-black rounded-[2.5rem] text-3xl uppercase italic flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-2xl">
                  {gameState.winner === 'player' ? 'NEXT BATTLE' : 'RESTART SAGA'} <ChevronRight size={36} />
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
