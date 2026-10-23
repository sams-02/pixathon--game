import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Key,
  Flame,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { GameInventory, Position } from '../types/game';

interface CollapsibleDockProps {
  playerPos: Position;
  prevPos: Position | null;
  inventory: GameInventory;
  isSolvable: boolean;
  minMoves: number;
  availableMovesCount: number;
  onToggleBlinkMode: () => void;
  isBlinkActive: boolean;
  onActivatePhaseRestore: () => void;
}

export const CollapsibleDock: React.FC<CollapsibleDockProps> = ({
  playerPos,
  prevPos,
  inventory,
  isSolvable,
  minMoves,
  availableMovesCount,
  onToggleBlinkMode,
  isBlinkActive,
  onActivatePhaseRestore,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`fixed z-20 transition-transform duration-300 pointer-events-auto ${
        isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
      style={{
        bottom: '16px',
        left: '50%',
        transform: `translateX(-50%) ${isCollapsed ? 'translateY(calc(100% - 28px))' : 'translateY(0)'}`,
        maxWidth: 'min(980px, 96vw)',
        width: 'max-content',
      }}
    >
      {/* Top Center Drawer Toggle Handle */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900 border-t border-x border-slate-700/80 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-md select-none"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isCollapsed ? 'Show Flight Telemetry' : 'Collapse Telemetry Dock'}</span>
        </button>
      </div>

      {/* Main Solid Surface Dock */}
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl p-2.5 md:p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2.5 md:gap-4 text-slate-200 select-none">
        {/* Footprint Interlock Monitor */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800">
          <Flame className="w-4 h-4 text-amber-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Interlock Cooldown</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {prevPos ? (
                <span className="text-amber-300 font-semibold">
                  Plate ({prevPos.x}, {prevPos.y}) - Uncoupled
                </span>
              ) : (
                <span className="text-slate-400">All plates locked (Origin)</span>
              )}
            </div>
          </div>
        </div>

        {/* Astronaut Coordinate & Vector Readout */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800">
          <Compass className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-left font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">EVA Coordinate</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white font-medium">({playerPos.x}, {playerPos.y})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                availableMovesCount > 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {availableMovesCount} {availableMovesCount === 1 ? 'vector' : 'vectors'}
              </span>
            </div>
          </div>
        </div>

        {/* Special Abilities Quick Chips */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs">
          <button
            onClick={onToggleBlinkMode}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
              isBlinkActive
                ? 'bg-purple-900 border-purple-400 text-white font-bold animate-pulse'
                : 'hover:bg-slate-800 border-purple-500/40 text-purple-300'
            }`}
            title="Teleport Anywhere (Press B)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Teleport:</span>
            <span className="font-bold">{inventory.abilities?.quantumBlinks ?? 3}</span>
          </button>

          <button
            onClick={onActivatePhaseRestore}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-slate-800 text-[11px] transition-all cursor-pointer"
            title="Phase Stabilizer: Restore uncoupled tile (Press P)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore:</span>
            <span className="font-bold">{inventory.abilities?.phaseRestores ?? 2}</span>
          </button>
        </div>

        {/* Cryptographic Quantum Drive Keys */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800">
          <Key className="w-4 h-4 text-yellow-400" />
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1" title="Gold Core">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
              <span className="font-bold text-slate-200">{inventory.keys.gold}</span>
            </div>
            <div className="flex items-center gap-1" title="Cyan Core">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm" />
              <span className="font-bold text-slate-200">{inventory.keys.cyan}</span>
            </div>
            <div className="flex items-center gap-1" title="Magenta Core">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block shadow-sm" />
              <span className="font-bold text-slate-200">{inventory.keys.magenta}</span>
            </div>
          </div>
        </div>

        {/* Trajectory Verification Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800">
          {isSolvable ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col text-left font-mono">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Airlock Trajectory</span>
                <span className="text-xs text-emerald-300 font-semibold">
                  Reachable ({minMoves} steps)
                </span>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col text-left font-mono">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Airlock Trajectory</span>
                <span className="text-xs text-amber-300 font-semibold">
                  Blocked (Use Teleport or Undo)
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
