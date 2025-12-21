
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Entity } from '../types';
import { soundEngine } from '../sounds';

interface BattlefieldProps {
  onGameOver: (winner: 'player' | 'enemy') => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 380;
const STATUE_X_PLAYER = 100;
const STATUE_X_ENEMY = CANVAS_WIDTH - 100;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Projectile { x: number; y: number; tx: number; ty: number; speed: number; damage: number; targetId: string; }

export const Battlefield: React.FC<BattlefieldProps> = ({ gameState, setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lastStatueAttackTime = useRef<number>(0);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number; active: boolean } | null>(null);

  const addParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 1.5) * 4,
        life: 1.0, color, size: Math.random() * 3 + 1
      });
    }
  };

  const drawStickMan = (ctx: CanvasRenderingContext2D, entity: Entity, isSelected: boolean) => {
    if (entity.state === 'garrisoned') return;
    const { x, y, type, state, animationFrame, unit } = entity;
    const isPlayer = type === 'player';
    const teamColor = isPlayer ? '#f59e0b' : '#ef4444';
    const direction = isPlayer ? 1 : -1;
    const isGiant = unit.className === 'Giant';
    const isFrozen = state === 'frozen';
    const isRaging = isPlayer && gameState.rageTimeRemaining > 0;
    
    ctx.save();
    ctx.translate(x, y);
    const scale = isGiant ? 2.2 : 1;
    const thickness = isGiant ? 5 : 2;
    
    if (isRaging) { ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24'; }
    if (isFrozen) { ctx.fillStyle = 'rgba(186, 230, 253, 0.4)'; ctx.beginPath(); ctx.ellipse(0, -30 * scale, 15 * scale, 40 * scale, 0, 0, Math.PI * 2); ctx.fill(); }
    if (isSelected) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.ellipse(0, 2, 18 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }

    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, 2, 10 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isFrozen ? '#93c5fd' : (isRaging ? '#fbbf24' : '#ffffff');
    ctx.lineWidth = thickness; ctx.lineCap = 'round';

    const walkCycle = (state === 'moving' || state === 'returning') ? Math.sin(animationFrame * 0.2) * 10 : 0;
    const attackCycle = state === 'attacking' ? Math.sin(animationFrame * 0.5) * 15 : 0;

    // Basic Stickman logic
    ctx.beginPath(); ctx.arc(0, -40 * scale, 8 * scale, 0, Math.PI * 2); ctx.stroke(); // Head
    ctx.beginPath(); ctx.moveTo(0, -32 * scale); ctx.lineTo(0, -12 * scale); ctx.stroke(); // Body
    ctx.beginPath(); ctx.moveTo(0, -28 * scale); ctx.lineTo(direction * (12 * scale + attackCycle), -18 * scale - attackCycle/2); ctx.stroke(); // R-Arm
    ctx.beginPath(); ctx.moveTo(0, -28 * scale); ctx.lineTo(direction * -12 * scale, -18 * scale); ctx.stroke(); // L-Arm
    ctx.beginPath(); ctx.moveTo(0, -12 * scale); ctx.lineTo(walkCycle * scale, 0); ctx.stroke(); // R-Leg
    ctx.beginPath(); ctx.moveTo(0, -12 * scale); ctx.lineTo(-walkCycle * scale, 0); ctx.stroke(); // L-Leg

    // Equipment
    ctx.strokeStyle = teamColor;
    if (unit.name === 'Sword') { ctx.beginPath(); ctx.moveTo(direction * 12 * scale + attackCycle, -18 * scale); ctx.lineTo(direction * (28 * scale + attackCycle), -34 * scale); ctx.stroke(); }
    if (unit.name === 'Spearton') { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(direction * -12, -25, 12, 0, Math.PI * 2); ctx.fill(); }

    // Health bar
    const hpPct = Math.max(0, entity.currentHealth / entity.unit.stats.maxHealth);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-15, -60, 30, 4);
    ctx.fillStyle = teamColor; ctx.fillRect(-14, -59, 28 * hpPct, 2);
    ctx.restore();
  };

  const update = useCallback(() => {
    setGameState(prev => {
      if (prev.isGameOver || prev.phase !== 'playing') return prev;
      
      let newGold = prev.gold;
      let newPlayerStatueHealth = prev.playerStatueHealth;
      let newEnemyStatueHealth = prev.enemyStatueHealth;
      const now = Date.now();
      const damageMap: Record<string, number> = {};

      // Castle Statue Defense
      if (now - lastStatueAttackTime.current > 1500) {
        const closestEnemies = prev.entities.filter(e => e.type === 'enemy' && e.x < 500);
        if (closestEnemies.length > 0) {
          const target = closestEnemies[0];
          projectilesRef.current.push({ x: STATUE_X_PLAYER, y: GROUND_Y - 140, tx: target.x, ty: target.y - 30, speed: 8, damage: 30, targetId: target.id });
          lastStatueAttackTime.current = now;
        }
      }

      // Projectile update
      projectilesRef.current = projectilesRef.current.filter(p => {
        const dx = p.tx - p.x; const dy = p.ty - p.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 10) { damageMap[p.targetId] = (damageMap[p.targetId] || 0) + p.damage; return false; }
        const vx = (dx / dist) * p.speed; const vy = (dy / dist) * p.speed;
        p.x += vx; p.y += vy; return true;
      });

      // Combat logic
      prev.entities.forEach(entity => {
        if (entity.state === 'frozen') return;
        const enemies = prev.entities.filter(e => e.type !== entity.type && e.state !== 'garrisoned');
        const range = entity.unit.stats.range * 40 + 40;
        const targetStatueX = entity.type === 'player' ? STATUE_X_ENEMY : STATUE_X_PLAYER;

        let closest = null; let minDist = range;
        enemies.forEach(e => { const d = Math.abs(e.x - entity.x); if (d < minDist) { minDist = d; closest = e; } });

        if (closest && now - entity.lastAttackTime > entity.unit.stats.attackSpeed) {
          damageMap[closest.id] = (damageMap[closest.id] || 0) + entity.unit.stats.damage;
          entity.lastAttackTime = now; entity.state = 'attacking';
        } else if (!closest && Math.abs(targetStatueX - entity.x) < 80) {
          if (now - entity.lastAttackTime > entity.unit.stats.attackSpeed) {
            if (entity.type === 'player') newEnemyStatueHealth -= entity.unit.stats.damage;
            else newPlayerStatueHealth -= entity.unit.stats.damage;
            entity.lastAttackTime = now; entity.state = 'attacking';
            soundEngine.playHit();
          }
        }
      });

      const newEntities = prev.entities.map(entity => {
        let next = { ...entity, animationFrame: entity.animationFrame + 1 };
        if (next.state === 'frozen' && now > (next.freezeEndTime || 0)) next.state = 'idle';
        if (damageMap[entity.id]) { next.currentHealth -= damageMap[entity.id]; addParticles(entity.x, entity.y - 30, '#ef4444', 3); }
        if (next.currentHealth <= 0) return null;

        const isRaging = entity.type === 'player' && prev.rageTimeRemaining > 0;
        const speed = entity.unit.stats.speed * 0.25 * (isRaging ? 2 : 1);

        if (entity.state === 'frozen') return next;
        
        if (entity.unit.className === 'Miner' && prev.battleMode !== 'garrison') {
          const mineX = entity.type === 'player' ? 250 : 950;
          const statueX = entity.type === 'player' ? STATUE_X_PLAYER : STATUE_X_ENEMY;
          if (entity.cargo === 0) {
            if (Math.abs(mineX - entity.x) < 20) { next.state = 'mining'; if (next.animationFrame % 100 === 0) next.cargo = 20; }
            else { next.state = 'moving'; next.x += (mineX > entity.x ? 1 : -1) * speed; }
          } else {
            // Replaced missing 'isPlayer' variable with 'entity.type === "player"'
            if (Math.abs(statueX - entity.x) < 20) { if (entity.type === 'player') newGold += next.cargo; next.cargo = 0; next.state = 'idle'; }
            else { next.state = 'moving'; next.x += (statueX > entity.x ? 1 : -1) * speed; }
          }
        } else if (entity.type === 'player') {
           if (prev.battleMode === 'garrison') {
             if (Math.abs(STATUE_X_PLAYER - entity.x) < 20) next.state = 'garrisoned';
             else { next.state = 'moving'; next.x -= speed * 1.5; }
           } else if (prev.battleMode === 'attack' && next.state !== 'attacking') {
             next.state = 'moving'; next.x += speed;
           } else if (prev.battleMode === 'defend') {
             if (next.x > 300) next.x -= speed; else if (next.x < 250) next.x += speed; else next.state = 'idle';
           }
        } else { // Enemy AI
           if (next.state !== 'attacking') { next.state = 'moving'; next.x -= speed; }
        }
        return next;
      }).filter((e): e is Entity => e !== null);

      return { 
        ...prev, entities: newEntities, gold: newGold, 
        playerStatueHealth: newPlayerStatueHealth, enemyStatueHealth: newEnemyStatueHealth,
        isGameOver: newEnemyStatueHealth <= 0 || newPlayerStatueHealth <= 0,
        winner: newEnemyStatueHealth <= 0 ? 'player' : (newPlayerStatueHealth <= 0 ? 'enemy' : null)
      };
    });
    particlesRef.current = particlesRef.current.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, life: p.life - 0.02 })).filter(p => p.life > 0);
    requestRef.current = requestAnimationFrame(update);
  }, [setGameState]);

  useEffect(() => { requestRef.current = requestAnimationFrame(update); return () => cancelAnimationFrame(requestRef.current!); }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Draw Statues
    ctx.fillStyle = '#334155'; ctx.fillRect(STATUE_X_PLAYER - 20, GROUND_Y - 150, 40, 150);
    ctx.fillRect(STATUE_X_ENEMY - 20, GROUND_Y - 150, 40, 150);
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(STATUE_X_PLAYER, GROUND_Y - 150, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(STATUE_X_ENEMY, GROUND_Y - 150, 8, 0, Math.PI * 2); ctx.fill();

    gameState.entities.forEach(e => drawStickMan(ctx, e, selectedIds.has(e.id)));
    projectilesRef.current.forEach(p => { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10, p.y); ctx.stroke(); });
    particlesRef.current.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    
    if (selectionBox?.active) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fillRect(selectionBox.startX, selectionBox.startY, selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY);
    }
  }, [gameState, selectedIds, selectionBox]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    setSelectionBox({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top, active: true });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox?.active) return;
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    setSelectionBox(prev => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null);
  };
  const handleMouseUp = () => {
    if (!selectionBox) return;
    const xMin = Math.min(selectionBox.startX, selectionBox.currentX); const xMax = Math.max(selectionBox.startX, selectionBox.currentX);
    const newIds = new Set<string>();
    gameState.entities.forEach(e => { if (e.type === 'player' && e.x >= xMin && e.x <= xMax) newIds.add(e.id); });
    setSelectedIds(newIds); setSelectionBox(null);
  };

  return (
    <div className="relative border-4 border-slate-800 rounded-3xl overflow-hidden bg-slate-950">
      <canvas 
        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} 
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        className="w-full h-auto cursor-crosshair select-none" 
      />
      <div className="absolute top-4 left-4 flex gap-4">
        <div className="bg-slate-900/80 px-4 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
          STATUE HP: {Math.max(0, Math.floor(gameState.playerStatueHealth))}
        </div>
      </div>
    </div>
  );
};
