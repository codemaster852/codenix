
import React from 'react';
import { UnitClass } from '../types';

interface UnitPreviewProps {
  className: UnitClass;
  unitName?: string;
  color?: string;
}

export const UnitPreview: React.FC<UnitPreviewProps> = ({ className, unitName, color = "currentColor" }) => {
  const isGiant = className === 'Giant';
  const isDragon = unitName === 'Dragon';
  const isZombie = unitName === 'Zombie';
  const isNinja = unitName === 'Ninja';
  const isSpearton = unitName === 'Spearton';
  const isMage = className === 'Mage';

  return (
    <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-xl border border-slate-700 h-48 w-full overflow-hidden">
      <svg viewBox="0 0 100 100" className={`h-full w-full ${isGiant ? 'scale-125' : ''}`} style={{ color }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {isDragon ? (
          <g transform="translate(10, 20)">
            <path d="M 0 40 Q 20 0 40 40 Q 60 80 80 40" stroke="currentColor" strokeWidth="4" fill="none" />
            <path d="M 40 40 L 60 20 L 70 30" stroke="currentColor" strokeWidth="4" fill="none" />
            <path d="M 10 30 Q 30 -10 50 30" fill="currentColor" opacity="0.3" />
            <circle cx="70" cy="25" r="5" fill="currentColor" />
            <path d="M 20 60 L 0 80" stroke="currentColor" strokeWidth="3" />
          </g>
        ) : (
          <g transform={isZombie ? "rotate(15, 50, 50)" : ""}>
            {/* Head/Hair/Hat */}
            {isMage && <path d="M 35 15 L 50 -5 L 65 15 Z" fill="currentColor" />}
            {isSpearton && <path d="M 40 5 L 50 -5 L 60 5 L 60 20 L 40 20 Z" fill="currentColor" opacity="0.8" />}
            <circle cx="50" cy="20" r={isGiant ? 14 : 10} stroke="currentColor" strokeWidth="3" fill={isZombie ? "currentColor" : "none"} opacity={isZombie ? 0.4 : 1} />
            
            {/* Body / Cloth */}
            <line x1="50" y1="30" x2="50" y2="60" stroke="currentColor" strokeWidth={isGiant ? 8 : 3} />
            {isSpearton && <path d="M 40 30 L 60 30 L 55 55 L 45 55 Z" fill="currentColor" opacity="0.3" />}
            {isNinja && <path d="M 45 35 L 55 35 L 50 50 Z" fill="currentColor" />}
            
            {/* Arms */}
            <line x1="50" y1="40" x2={isZombie ? 35 : 30} y2={isZombie ? 55 : 50} stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="40" x2={isZombie ? 65 : 70} y2={isZombie ? 55 : 50} stroke="currentColor" strokeWidth="3" />
            
            {/* Legs */}
            <line x1="50" y1="60" x2="35" y2="85" stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="60" x2="65" y2="85" stroke="currentColor" strokeWidth="3" />

            {/* Equipment */}
            {className === 'Warrior' && <path d="M 70 50 L 90 30" stroke="currentColor" strokeWidth="4" />}
            {className === 'Ranger' && <path d="M 75 30 Q 90 50 75 70" stroke="currentColor" strokeWidth="2" fill="none" />}
            {className === 'Tank' && <rect x="15" y="35" width="20" height="30" fill="currentColor" opacity="0.5" rx="2" />}
            {className === 'Miner' && <path d="M 25 45 L 40 55 M 25 55 L 40 45" stroke="currentColor" strokeWidth="3" />}
            {isMage && <circle cx="75" cy="50" r="6" fill="currentColor" filter="url(#glow)" />}
            {unitName === 'Bomber' && <circle cx="50" cy="5" r="15" fill="black" stroke="currentColor" strokeWidth="2" />}
          </g>
        )}
      </svg>
    </div>
  );
};
