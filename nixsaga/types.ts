
export type UnitClass = 'Miner' | 'Warrior' | 'Ranger' | 'Tank' | 'Mage' | 'Giant' | 'Support' | 'Special';
export type BattleMode = 'attack' | 'defend' | 'garrison';
export type MagicElement = 'Blood Rain' | 'Fire' | 'Cold';
export type GamePhase = 'deck-selection' | 'playing' | 'game-over' | 'level-splash';

export interface UnitStats {
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  range: number;
  cost: number;
  attackSpeed: number;
}

export interface StickUnit {
  id: string;
  name: string;
  className: UnitClass;
  stats: UnitStats;
  ability: string;
  lore: string;
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy';
  unit: StickUnit;
  x: number;
  y: number;
  currentHealth: number;
  state: 'moving' | 'attacking' | 'mining' | 'returning' | 'dying' | 'idle' | 'garrisoned' | 'frozen';
  lastAttackTime: number;
  animationFrame: number;
  cargo: number;
  manualTargetX?: number;
  freezeEndTime?: number;
}

export interface Upgrades {
  damageLevel: number;
  healthLevel: number;
  miningLevel: number;
}

export interface GameState {
  gold: number;
  enemyGold: number;
  playerStatueHealth: number;
  enemyStatueHealth: number;
  entities: Entity[];
  isGameOver: boolean;
  winner: 'player' | 'enemy' | null;
  level: number;
  unlockedUnitIds: string[];
  battleMode: BattleMode;
  phase: GamePhase;
  selectedDeck: string[];
  selectedMagic: MagicElement[];
  magicCooldowns: Record<string, number>;
  rageTimeRemaining: number;
  upgrades: Upgrades;
}

export interface LocalStrategyAdvice {
  tactics: string;
  counters: string[];
  advice: string;
}

// Added Army interface to support strategy analysis
export interface Army {
  units: StickUnit[];
}
