import React, { useState } from 'react';
import { X, Play, CheckCircle2, AlertTriangle, Sparkles, Loader2, RefreshCw, PenTool } from 'lucide-react';
import { LevelDef, SolverResult, SwitchItem, TeleporterItem } from '../types/game';
import { solveLevel } from '../game/solver';
import { sound } from '../audio/sound';

interface LevelEditorModalProps {
  onPlayCustomLevel: (level: LevelDef) => void;
  onClose: () => void;
}

type BrushType = 'floor' | 'wall' | 'start' | 'exit' | 'goldKey' | 'goldGate' | 'cyanKey' | 'cyanGate' | 'switch' | 'teleporter';

export const LevelEditorModal: React.FC<LevelEditorModalProps> = ({
  onPlayCustomLevel,
  onClose,
}) => {
  const [width, setWidth] = useState<number>(6);
  const [height, setHeight] = useState<number>(6);
  const [title, setTitle] = useState<string>('Custom Chamber');
  const [grid, setGrid] = useState<string[]>([
    '######',
    '#S...#',
    '#.##.#',
    '#..K.#',
    '#G..E#',
    '######',
  ]);
  const [selectedBrush, setSelectedBrush] = useState<BrushType>('floor');
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Brush symbols map
  const brushCharMap: Record<BrushType, string> = {
    floor: '.',
    wall: '#',
    start: 'S',
    exit: 'E',
    goldKey: 'K',
    goldGate: 'G',
    cyanKey: 'C',
    cyanGate: 'D',
    switch: '1',
    teleporter: 'T',
  };

  const handleTileClick = (x: number, y: number) => {
    sound.playMove();
    const newChar = brushCharMap[selectedBrush];

    const newGrid = [...grid];
    // If painting Start, ensure only one Start exists
    if (newChar === 'S') {
      for (let r = 0; r < height; r++) {
        newGrid[r] = newGrid[r].replace(/S/g, '.');
      }
    }
    // If painting Exit, ensure only one Exit exists
    if (newChar === 'E') {
      for (let r = 0; r < height; r++) {
        newGrid[r] = newGrid[r].replace(/E/g, '.');
      }
    }

    const rowChars = (newGrid[y] || '').split('');
    rowChars[x] = newChar;
    newGrid[y] = rowChars.join('');

    setGrid(newGrid);
    setSolverResult(null); // invalidate previous verification
  };

  const handleResize = (newW: number, newH: number) => {
    sound.playMove();
    setWidth(newW);
    setHeight(newH);

    const newGrid: string[] = [];
    for (let y = 0; y < newH; y++) {
      let row = '';
      for (let x = 0; x < newW; x++) {
        if (x === 0 || x === newW - 1 || y === 0 || y === newH - 1) {
          row += '#';
        } else if (x === 1 && y === 1) {
          row += 'S';
        } else if (x === newW - 2 && y === newH - 2) {
          row += 'E';
        } else {
          row += '.';
        }
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setSolverResult(null);
  };

  const constructLevelDef = (): LevelDef => {
    // Detect switches or teleporters if any
    const switches: SwitchItem[] = [];
    const teleporters: TeleporterItem[] = [];

    // Check teleporters
    const tpCoords: { x: number; y: number }[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y]?.[x] === 'T') {
          tpCoords.push({ x, y });
        }
      }
    }
    if (tpCoords.length >= 2) {
      teleporters.push({
        id: 'tp-custom',
        x: tpCoords[0].x,
        y: tpCoords[0].y,
        targetX: tpCoords[1].x,
        targetY: tpCoords[1].y,
        maxUses: 1,
        remainingUses: 1,
      });
    }

    return {
      id: `custom-${Date.now()}`,
      name: title || 'Custom Chamber',
      subtitle: 'Constructed in Level Architect',
      difficulty: 'medium',
      width,
      height,
      rows: grid,
      switches,
      teleporters,
      parMoves: solverResult?.minMoves || 10,
      mechanicsDescription: 'Custom player-created chamber with automated algorithmic validation.',
    };
  };

  const verifyCustomLevel = () => {
    sound.playMove();
    const lvl = constructLevelDef();
    const result = solveLevel(lvl);
    setSolverResult(result);
    if (result.solvable) {
      sound.playWinFanfare();
    } else {
      sound.playTrapped();
    }
  };

  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    sound.playKeyPickup();
    try {
      const response = await fetch('/api/gemini/generate-chamber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: 'medium', theme: 'Quantum Rift' }),
      });

      if (response.ok) {
        const data = await response.json();
        const ch = data.chamber;
        if (ch && ch.rows && ch.width && ch.height) {
          setTitle(ch.name || 'AI Quantum Chamber');
          setWidth(ch.width);
          setHeight(ch.height);
          setGrid(ch.rows);
          // Auto-verify with solver
          const testLvl: LevelDef = {
            id: 'ai-generated',
            name: ch.name || 'AI Chamber',
            subtitle: ch.subtitle || 'Generated by Gemini 3.8 Flash',
            difficulty: 'medium',
            width: ch.width,
            height: ch.height,
            rows: ch.rows,
            parMoves: ch.parMoves || 12,
            mechanicsDescription: ch.flavorText || 'AI synthesized chamber.',
          };
          const res = solveLevel(testLvl);
          setSolverResult(res);
          sound.playWinFanfare();
        }
      } else {
        // Fallback procedural chamber
        handleResize(7, 7);
      }
    } catch {
      handleResize(7, 7);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl p-6 rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl shadow-purple-950/80 text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Level Architect</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono border border-purple-700/60 uppercase">
                  Design & Prove
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Paint tiles and run mathematical BFS verification
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

        {/* Toolbar & Sizing */}
        <div className="flex flex-wrap items-center justify-between gap-3 my-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Dimensions:</span>
            {[5, 6, 7, 8].map((size) => (
              <button
                key={size}
                onClick={() => handleResize(size, size)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  width === size
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {size}x{size}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateWithAi}
            disabled={isGeneratingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            )}
            <span>Generate with Gemini AI</span>
          </button>
        </div>

        {/* Palette Brush Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 my-2">
          <span className="text-[11px] font-mono text-slate-400 px-2 uppercase">Brush:</span>
          {[
            { id: 'floor', label: 'Floor (.)', color: 'bg-slate-800 text-slate-200' },
            { id: 'wall', label: 'Wall (#)', color: 'bg-slate-700 text-white font-bold' },
            { id: 'start', label: 'Start (S)', color: 'bg-emerald-950 text-emerald-300 border-emerald-600' },
            { id: 'exit', label: 'Exit (E)', color: 'bg-cyan-950 text-cyan-300 border-cyan-600' },
            { id: 'goldKey', label: 'Gold Key (K)', color: 'bg-amber-950 text-amber-300 border-amber-600' },
            { id: 'goldGate', label: 'Gold Gate (G)', color: 'bg-amber-950 text-amber-400 border-amber-700' },
            { id: 'cyanKey', label: 'Cyan Key (C)', color: 'bg-sky-950 text-sky-300 border-sky-600' },
            { id: 'cyanGate', label: 'Cyan Gate (D)', color: 'bg-sky-950 text-sky-400 border-sky-700' },
            { id: 'teleporter', label: 'Portal (T)', color: 'bg-purple-950 text-purple-300 border-purple-600' },
          ].map((brush) => (
            <button
              key={brush.id}
              onClick={() => {
                sound.playMove();
                setSelectedBrush(brush.id as BrushType);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                selectedBrush === brush.id
                  ? 'border-purple-400 ring-2 ring-purple-500/40 font-bold scale-105'
                  : 'border-transparent opacity-85 hover:opacity-100'
              } ${brush.color}`}
            >
              {brush.label}
            </button>
          ))}
        </div>

        {/* Grid Canvas Canvas Editor */}
        <div className="flex justify-center my-4 overflow-x-auto p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div
            className="grid gap-1 select-none"
            style={{
              gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, y) =>
              row.split('').map((char, x) => {
                let cellBg = 'bg-slate-900 border-slate-800 text-slate-500';
                if (char === '#') cellBg = 'bg-slate-700 border-slate-600 text-slate-300 font-bold';
                else if (char === 'S') cellBg = 'bg-emerald-900/80 border-emerald-500 text-emerald-200 font-bold';
                else if (char === 'E') cellBg = 'bg-cyan-900/80 border-cyan-500 text-cyan-200 font-bold';
                else if (char === 'K') cellBg = 'bg-amber-900/80 border-amber-500 text-amber-200 font-bold';
                else if (char === 'G') cellBg = 'bg-amber-950 border-amber-600 text-amber-400 font-bold';
                else if (char === 'C') cellBg = 'bg-sky-900/80 border-sky-500 text-sky-200 font-bold';
                else if (char === 'D') cellBg = 'bg-sky-950 border-sky-600 text-sky-400 font-bold';
                else if (char === 'T') cellBg = 'bg-purple-900/80 border-purple-500 text-purple-200 font-bold';

                return (
                  <button
                    key={`${x},${y}`}
                    onClick={() => handleTileClick(x, y)}
                    className={`w-9 h-9 md:w-11 md:h-11 rounded-lg border flex items-center justify-center font-mono text-xs md:text-sm transition-transform active:scale-90 hover:scale-105 cursor-pointer shadow-sm ${cellBg}`}
                  >
                    {char === '.' ? '' : char}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Verification Status */}
        {solverResult && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs my-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {solverResult.solvable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <span className={solverResult.solvable ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                  {solverResult.solvable ? 'Mathematically Solvable!' : 'No Solution Found'}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {solverResult.diagnostics}
                </p>
              </div>
            </div>

            {solverResult.solvable && (
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                Min: {solverResult.minMoves} moves
              </span>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
          <button
            onClick={verifyCustomLevel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Test Solvability</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                sound.playMove();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                const lvl = constructLevelDef();
                sound.playWinFanfare();
                onPlayCustomLevel(lvl);
                onClose();
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Custom Chamber</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
