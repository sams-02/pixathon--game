import React from 'react';
import { X, CheckCircle2, Play, Lock, Zap, Award } from 'lucide-react';
import { LevelDef } from '../types/game';
import { HANDCRAFTED_LEVELS } from '../game/levels';
import { sound } from '../audio/sound';

interface LevelSelectModalProps {
  currentLevelId: string;
  completedLevelIds: string[];
  onSelectLevel: (level: LevelDef) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  completedLevelIds,
  onSelectLevel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Chamber Archives</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono border border-cyan-700/60 uppercase">
                Handcrafted & Algorithmically Certified
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Select a temporal trial to enter
            </p>
          </div>

          <button
            onClick={() => {
              sound.playMove();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4 overflow-y-auto pr-1">
          {HANDCRAFTED_LEVELS.map((lvl, index) => {
            const isCurrent = lvl.id === currentLevelId;
            const isCompleted = completedLevelIds.includes(lvl.id);

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  sound.playMove();
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between group active:scale-98 ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-cyan-300 font-semibold uppercase">
                      Chamber {index + 1} · {lvl.difficulty}
                    </span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cleared</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">
                        Par: {lvl.parMoves}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {lvl.name.replace(/Chamber [IVXLC]+: /, '')}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {lvl.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>{lvl.width}x{lvl.height} Grid</span>
                  </span>
                  <span className="text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    <span>Enter</span>
                    <Play className="w-3 h-3 fill-cyan-400" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>All {HANDCRAFTED_LEVELS.length} chambers are 100% mathematically certified solvable.</span>
          <button
            onClick={() => {
              sound.playMove();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
