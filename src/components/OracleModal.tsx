import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Sparkles, Footprints, ShieldCheck, ArrowRight, Loader2, Play } from 'lucide-react';
import { LevelDef, Position, GameInventory } from '../types/game';
import { solveLevel } from '../game/solver';
import { sound } from '../audio/sound';

interface OracleModalProps {
  level: LevelDef;
  playerPos: Position;
  prevPos: Position | null;
  moveCount: number;
  inventory: GameInventory;
  onClose: () => void;
  onApplyNextMove?: (targetPos: Position) => void;
}

export const OracleModal: React.FC<OracleModalProps> = ({
  level,
  playerPos,
  prevPos,
  moveCount,
  inventory,
  onClose,
  onApplyNextMove,
}) => {
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string>('algorithmic');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // 1. Compute exact deterministic algorithmic solution
  // Create a sub-level starting from current playerPos and prevPos
  const currentLevelState: LevelDef = {
    ...level,
    rows: level.rows.map((row, rY) => {
      let newRow = '';
      for (let rX = 0; rX < level.width; rX++) {
        if (rX === playerPos.x && rY === playerPos.y) {
          newRow += 'S';
        } else {
          newRow += row[rX] || '#';
        }
      }
      return newRow;
    }),
  };

  const solution = solveLevel(currentLevelState);

  // Next step
  const nextStep = solution.solvable && solution.path.length > 1 ? solution.path[1] : null;
  let nextStepDirection = '';
  if (nextStep) {
    const dx = nextStep.x - playerPos.x;
    const dy = nextStep.y - playerPos.y;
    if (dx === 1) nextStepDirection = 'Right [D]';
    else if (dx === -1) nextStepDirection = 'Left [A]';
    else if (dy === 1) nextStepDirection = 'Down [S]';
    else if (dy === -1) nextStepDirection = 'Up [W]';
  }

  // 2. Fetch Gemini Tactical Advice
  const fetchGeminiTacticalAdvice = async () => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/gemini/oracle-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelName: level.name,
          moveCount,
          playerPos,
          prevPos,
          inventory,
          availableMoves: nextStep ? [nextStep] : [],
          boardSummary: level.rows.join('\n'),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiHint(data.hint);
        setAiSource(data.source || 'gemini-3.8-flash');
      } else {
        setAiHint(
          level.tacticalTip ||
            'Notice the chamber topology: every step seals the tile behind you for 1 turn. If entering a narrow passage, ensure you have an exit vector!'
        );
        setAiSource('tactical-manual');
      }
    } catch {
      setAiHint(
        level.tacticalTip ||
          'Notice the chamber topology: every step seals the tile behind you for 1 turn. If entering a narrow passage, ensure you have an exit vector!'
      );
      setAiSource('tactical-manual');
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchGeminiTacticalAdvice();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Lightbulb className="w-5 h-5 text-yellow-300 fill-yellow-300/30" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Tactical Oracle</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono border border-cyan-700/60 uppercase">
                  BFS Solver & Gemini AI
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Chamber Analysis: {level.name}
              </p>
            </div>
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

        {/* 1. Algorithmic BFS Mathematical Solution */}
        <div className="my-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Algorithmic Path Proof</span>
            </span>
            <span className="text-slate-400">{solution.timeMs}ms runtime</span>
          </div>

          {solution.solvable ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Remaining to Goal:</span>
                <span className="text-emerald-400 font-bold text-base">
                  {solution.minMoves} {solution.minMoves === 1 ? 'move' : 'moves'}
                </span>
              </div>

              {nextStep && (
                <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-cyan-300 uppercase tracking-wider">
                      Next Optimal Step:
                    </div>
                    <div className="text-sm font-bold text-white">
                      {nextStepDirection} to ({nextStep.x}, {nextStep.y})
                    </div>
                  </div>

                  {onApplyNextMove && (
                    <button
                      onClick={() => {
                        sound.playMove();
                        onApplyNextMove(nextStep);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Take Step</span>
                    </button>
                  )}
                </div>
              )}

              {/* Path preview coordinates */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                <span className="text-slate-400 shrink-0">Path:</span>
                {solution.path.map((pos, idx) => (
                  <span
                    key={idx}
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                      idx === 0
                        ? 'bg-slate-800 text-white font-bold'
                        : idx === 1
                        ? 'bg-cyan-900 text-cyan-200 font-bold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    ({pos.x},{pos.y})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-amber-300">
              No mathematical solution exists from this current coordinate! Undo previous moves or restart the chamber to escape deadlock.
            </div>
          )}
        </div>

        {/* 2. Gemini AI Chamber Analysis */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/40 border border-indigo-500/30 font-sans">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-mono mb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Chamber Guardian Intuition</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
              {aiSource}
            </span>
          </div>

          {isLoadingAi ? (
            <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Consulting Chronos intelligence...</span>
            </div>
          ) : (
            <p className="text-sm text-slate-200 leading-relaxed italic">
              "{aiHint || level.tacticalTip}"
            </p>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sound.playMove();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold transition-all cursor-pointer active:scale-95"
          >
            Return to Chamber
          </button>
        </div>
      </div>
    </div>
  );
};
