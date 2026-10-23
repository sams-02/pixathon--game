import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Star, ArrowRight, RotateCcw, Grid, Award, Timer, Zap } from 'lucide-react';
import { LevelDef } from '../types/game';
import { sound } from '../audio/sound';

interface VictoryModalProps {
  level: LevelDef;
  moveCount: number;
  elapsedSeconds: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  moveCount,
  elapsedSeconds,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  hasNextLevel,
}) => {
  const isParOrBetter = moveCount <= level.parMoves;
  const isNearPar = moveCount <= level.parMoves + 4;
  const isSpeedrunPassed = elapsedSeconds <= 30.0;
  const stars = isParOrBetter ? 3 : isNearPar ? 2 : 1;

  useEffect(() => {
    try {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#38bdf8', '#06b6d4', '#f59e0b', '#ec4899', '#a855f7', '#ffffff'],
      });
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-6 md:p-8 rounded-3xl bg-slate-900 border border-cyan-500/50 shadow-2xl shadow-cyan-950 text-center text-slate-100">
        {/* Glow Halo */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.45)]">
          <Trophy className="w-12 h-12 text-yellow-400 drop-shadow" />
        </div>

        <div className="mt-8 mb-2">
          <span className="px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold uppercase tracking-widest">
            Airlock Ingress Complete · Atmosphere Pressurized
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
            {level.name}
          </h2>
          <p className="text-xs text-slate-400 font-medium">{level.subtitle}</p>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[1, 2, 3].map((starIdx) => (
            <Star
              key={starIdx}
              className={`w-9 h-9 transition-transform duration-300 ${
                starIdx <= stars
                  ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-110'
                  : 'text-slate-700 fill-slate-800'
              }`}
            />
          ))}
        </div>

        {/* 30-Second Speedrun Accolade */}
        {isSpeedrunPassed ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono mb-3 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="font-bold">★ Speedrun Ace: Cleared in {elapsedSeconds.toFixed(1)}s (Under 30s!)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono mb-3">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            <span>Time Taken: {elapsedSeconds.toFixed(1)}s</span>
          </div>
        )}

        {/* Performance Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 my-4 font-mono">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Moves Taken</span>
            <span className={`text-2xl font-bold ${isParOrBetter ? 'text-emerald-400' : 'text-amber-400'}`}>
              {moveCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Target Par</span>
            <span className="text-2xl font-bold text-slate-200">
              {level.parMoves}
            </span>
          </div>
        </div>

        {isParOrBetter ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono mb-6">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Optimal Temporal Mastery (Par Achieved)</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono mb-6">
            Airlock reached! Replay to achieve optimal par ({level.parMoves} moves).
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {hasNextLevel ? (
            <button
              onClick={() => {
                sound.playMove();
                onNextLevel();
              }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-900/40 transition-all cursor-pointer active:scale-98"
            >
              <span>Next Chamber</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                sound.playMove();
                onOpenLevelSelect();
              }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <span>Master Trial Cleared! Level Select</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                sound.playMove();
                onReplay();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Replay</span>
            </button>

            <button
              onClick={() => {
                sound.playMove();
                onOpenLevelSelect();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700 cursor-pointer active:scale-95"
            >
              <Grid className="w-4 h-4 text-cyan-400" />
              <span>Chambers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
