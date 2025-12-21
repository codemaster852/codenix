
import React from 'react';
import { Pickaxe, Sword, Target, Shield, Wand2, TowerControl, HeartPulse, Zap, Flame, Skull, Anchor, Wind, Crosshair, Gem, Swords, Ghost, Bomb, Bird, Droplets, Snowflake } from 'lucide-react';
import { UnitClass, StickUnit } from './types';

export const UNIT_CLASSES: { name: UnitClass; icon: any; description: string }[] = [
  { name: 'Miner', icon: Pickaxe, description: 'Gathers gold and resources.' },
  { name: 'Warrior', icon: Sword, description: 'Basic melee frontline.' },
  { name: 'Ranger', icon: Target, description: 'Long range support.' },
  { name: 'Tank', icon: Shield, description: 'High health, low damage frontline.' },
  { name: 'Mage', icon: Wand2, description: 'Area of effect magic and spells.' },
  { name: 'Giant', icon: TowerControl, description: 'Massive, slow, devastating power.' },
  { name: 'Support', icon: HeartPulse, description: 'Heals or buffs friendly units.' },
  { name: 'Special', icon: Zap, description: 'Unique units with specific roles.' }
];

export const MASTER_ROSTER: StickUnit[] = [
  { id: 'u1', name: 'Miner', className: 'Miner', stats: { health: 60, maxHealth: 60, damage: 2, speed: 8, range: 1, cost: 150, attackSpeed: 1000 }, ability: 'Gold Rush', lore: 'The backbone of the Order economy.' },
  { id: 'u2', name: 'Sword', className: 'Warrior', stats: { health: 100, maxHealth: 100, damage: 15, speed: 8, range: 1, cost: 125, attackSpeed: 800 }, ability: 'Dash', lore: 'Standard infantry of the Order.' },
  { id: 'u3', name: 'Archidon', className: 'Ranger', stats: { health: 80, maxHealth: 80, damage: 12, speed: 6, range: 12, cost: 300, attackSpeed: 1200 }, ability: 'Fire Arrow', lore: 'Their arrows block out the sun.' },
  { id: 'u4', name: 'Spearton', className: 'Tank', stats: { health: 400, maxHealth: 400, damage: 20, speed: 4, range: 1, cost: 500, attackSpeed: 1500 }, ability: 'Shield Wall', lore: 'Unmovable defenders.' },
  { id: 'u5', name: 'Magic Kill', className: 'Mage', stats: { health: 120, maxHealth: 120, damage: 45, speed: 3, range: 10, cost: 800, attackSpeed: 3000 }, ability: 'Blast', lore: 'Masters of raw arcane power.' },
  { id: 'u6', name: 'Giant', className: 'Giant', stats: { health: 1500, maxHealth: 1500, damage: 80, speed: 2, range: 2, cost: 1500, attackSpeed: 4000 }, ability: 'Earthquake', lore: 'Colossal engines of war.' },
  { id: 'u16', name: 'Dragon', className: 'Special', stats: { health: 800, maxHealth: 800, damage: 60, speed: 5, range: 8, cost: 2000, attackSpeed: 2500 }, ability: 'Inferno', lore: 'Ancient rulers of the skies.' },
  { id: 'u17', name: 'Bomber', className: 'Special', stats: { health: 50, maxHealth: 50, damage: 150, speed: 9, range: 1, cost: 200, attackSpeed: 500 }, ability: 'Explode', lore: 'They only have one job, and it’s a blast.' },
  { id: 'u18', name: 'Zombie', className: 'Warrior', stats: { health: 180, maxHealth: 180, damage: 10, speed: 3, range: 1, cost: 100, attackSpeed: 1200 }, ability: 'Undying', lore: 'The dead do not rest in Inamorta.' },
  { id: 'u19', name: 'Ninja', className: 'Special', stats: { health: 90, maxHealth: 90, damage: 35, speed: 12, range: 1, cost: 450, attackSpeed: 600 }, ability: 'Vanish', lore: 'Strike fast, strike true.' },
  { id: 'u20', name: 'Blood Improver', className: 'Support', stats: { health: 120, maxHealth: 120, damage: 5, speed: 6, range: 4, cost: 400, attackSpeed: 1000 }, ability: 'Revitalize', lore: 'Alchemy used to mend broken spirits.' },
  { id: 'u21', name: 'Arachdon', className: 'Special', stats: { health: 250, maxHealth: 250, damage: 25, speed: 7, range: 5, cost: 600, attackSpeed: 1200 }, ability: 'Web Trap', lore: 'Eight-legged nightmares from the caves.' }
];

export const MAGIC_ELEMENTS = [
  { name: 'Blood Rain', icon: Droplets, description: 'Calls down a crimson storm that dissolves all foes.' },
  { name: 'Fire', icon: Flame, description: 'Erupts a wall of flame upon the enemy forces.' },
  { name: 'Cold', icon: Snowflake, description: 'Freezes all enemies in place, leaving them helpless.' }
];

export const INITIAL_UNITS: StickUnit[] = MASTER_ROSTER.slice(0, 4);
