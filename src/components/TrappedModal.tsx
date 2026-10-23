import React from 'react';
import { AlertOctagon, Undo2, RotateCcw } from 'lucide-react';
import { Position } from '../types/game';
import { sound } from '../audio/sound';

interface TrappedModalProps {
  prevPos: Position | null;
  onUndo: () => void;
  onReset: () => void;
}

export const TrappedModal: React.FC<TrappedModalProps> = ({
  prevPos,
  onUndo,
  onReset,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-red-500/50 shadow-2xl shadow-red-950/60 text-center text-slate-100">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/60 flex items-center justify-center mb-4 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          EVA Interlock Lockout
        </h3>
        <p className="text-xs text-red-300 font-mono uppercase tracking-wider mb-3">
          No Walkable Vectors Remaining
        </p>

        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-sans">
          Commander Elena cannot step backward onto deck plate{' '}
          <span className="font-mono text-amber-300 font-semibold">
            {prevPos ? `(${prevPos.x}, ${prevPos.y})` : 'unknown'}
          </span>{' '}
          because the magnetic interlock is in hydraulic cooldown for this cycle. Every space walk step must push forward or loop through open station aisles.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              sound.playUndo();
              onUndo();
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer active:scale-95"
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo Step (Z)</span>
          </button>

          <button
            onClick={() => {
              sound.playMove();
              onReset();
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restart Chamber (R)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
