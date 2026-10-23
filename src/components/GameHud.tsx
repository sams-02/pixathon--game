import React from 'react';
import {
  RotateCcw,
  Undo2,
  Lightbulb,
  Camera,
  Volume2,
  VolumeX,
  Grid,
  HelpCircle,
  Activity,
  Zap,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Timer,
  Sparkles,
} from 'lucide-react';
import { LevelDef, AstronautAbilities, Position } from '../types/game';
import { sound } from '../audio/sound';

interface GameHudProps {
  level: LevelDef;
  moveCount: number;
  prevPos?: Position | null;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onOpenOracle: () => void;
  onOpenLevelSelect: () => void;
  onOpenHelp: () => void;
  onToggleCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isIsometric: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  abilities: AstronautAbilities;
  onToggleBlinkMode: () => void;
  isBlinkActive: boolean;
  onActivatePhaseRestore: () => void;
  elapsedSeconds: number;
  onPanView?: (dir: 'forward' | 'backward' | 'left' | 'right') => void;
  onResetViewPan?: () => void;
  onOrbitView?: (dAz: number) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  level,
  moveCount,
  prevPos = null,
  canUndo,
  onUndo,
  onReset,
  onOpenOracle,
  onOpenLevelSelect,
  onOpenHelp,
  onToggleCamera,
  onZoomIn,
  onZoomOut,
  isIsometric,
  isMuted,
  onToggleMute,
  abilities,
  onToggleBlinkMode,
  isBlinkActive,
  onActivatePhaseRestore,
  elapsedSeconds,
  onPanView,
  onResetViewPan,
  onOrbitView,
}) => {
  const isOptimal = moveCount <= level.parMoves;
  const isSpeedrunStar = elapsedSeconds <= 30;
  const [showRuleToast, setShowRuleToast] = React.useState<boolean>(true);

  // Auto-announce rule on each level load
  React.useEffect(() => {
    setShowRuleToast(true);
    const timer = setTimeout(() => {
      setShowRuleToast(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [level.name]);

  return (
    <div className="absolute top-0 inset-x-0 z-20 flex flex-col pointer-events-none select-none text-slate-100">
      {/* Quantum Blink Active Global Banner */}
      {isBlinkActive && (
        <div className="w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 py-1.5 px-4 text-center text-xs md:text-sm font-mono font-bold text-cyan-200 border-b border-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse pointer-events-auto flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-amber-300" />
          <span>QUANTUM BLINK ENGAGED: Click ANY deck plate on the map to teleport anywhere! (Press B or Esc to cancel)</span>
        </div>
      )}

      {/* Prominent Level-Start Problem Statement #3 Rule Announcement Toast */}
      {showRuleToast && (
        <div className="w-full px-4 pt-2 pb-1 flex justify-center pointer-events-auto animate-in slide-in-from-top duration-300">
          <div
            onClick={() => setShowRuleToast(false)}
            className="max-w-2xl w-full p-3 md:p-3.5 rounded-2xl bg-slate-950/95 border-2 border-amber-500/80 shadow-[0_10px_35px_rgba(245,158,11,0.3)] text-left flex items-center justify-between gap-3.5 cursor-pointer hover:border-amber-400 transition-all backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0 text-amber-300">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300 uppercase tracking-wider">
                    Problem Statement #3
                  </span>
                  <span className="text-xs font-bold text-white uppercase tracking-tight">
                    Sole Rule Change Active:
                  </span>
                </div>
                <div className="text-sm font-black text-amber-300 tracking-tight mt-0.5">
                  YOU CANNOT GO BACKWARDS
                </div>
                <div className="text-xs text-slate-300 font-medium leading-tight mt-0.5">
                  Every step you take collapses the floor behind you for 1 turn. Stepping backward is forbidden!
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRuleToast(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold shrink-0 cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>
        </div>
      )}

      {/* Persistent Center Problem Statement #3 Status Badge */}
      <div className="w-full flex justify-center pt-1.5 pointer-events-auto">
        <div
          onClick={() => setShowRuleToast(!showRuleToast)}
          className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/90 border border-amber-500/70 shadow-lg text-[11px] md:text-xs font-mono text-amber-300 cursor-pointer hover:bg-slate-900 transition-all"
          title="Click to view full Problem Statement #3 rule announcement"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider">RULE #3:</span>
          <span className="text-amber-200 font-semibold">Cannot Go Backwards</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 font-mono">
            Collapsed: {prevPos ? `(${prevPos.x}, ${prevPos.y}) [LOCKED]` : 'None (Start)'}
          </span>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="flex justify-between items-start p-3 md:p-6">
        {/* Top Left: EVA Astronaut Telemetry, Moves & 30s Speedrun Clock */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/50 text-cyan-400 font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>EVA {level.difficulty}</span>
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-md">
              {level.name}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-300 font-medium drop-shadow">
            {level.subtitle}
          </p>

          {/* Telemetry Chips & 30s Clock */}
          <div className="flex flex-wrap items-center gap-2.5 mt-1 font-mono">
            {/* Moves vs Par */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/90 shadow-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">EVA Steps</span>
              <span className={`text-base font-bold tabular-nums ${isOptimal ? 'text-cyan-400' : 'text-amber-400'}`}>
                {moveCount}
              </span>
              <span className="text-slate-500 text-xs">/</span>
              <span className="text-xs text-slate-400 font-semibold">{level.parMoves} par</span>
            </div>

            {/* 30-Second Speedrun Challenge Clock */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-md ${
                isSpeedrunStar
                  ? 'bg-slate-900 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900/90 border-slate-700 text-slate-400'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 ${isSpeedrunStar ? 'text-amber-400 animate-spin-slow' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase tracking-wider">Mission Clock:</span>
              <span className="text-base font-bold tabular-nums">
                {elapsedSeconds.toFixed(1)}s
              </span>
              {isSpeedrunStar ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/50 font-bold">
                  ★ Sub-30s Pace
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Over 30s</span>
              )}
            </div>

            {/* Zoom In / Out Quick Controls (Enlarge Map) */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-700/90 shadow-md">
              <button
                onClick={() => {
                  sound.playMove();
                  onZoomIn();
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Enlarge Map (Zoom In [+])"
              >
                <ZoomIn className="w-4 h-4 text-cyan-400" />
              </button>
              <button
                onClick={() => {
                  sound.playMove();
                  onZoomOut();
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Zoom Out [-]"
              >
                <ZoomOut className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>

            {/* Center View onto Commander Vance */}
            {onResetViewPan && (
              <button
                onClick={() => {
                  sound.playMove();
                  onResetViewPan();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/90 text-xs font-mono transition-all shadow-md active:scale-95 cursor-pointer"
                title="Center Camera View on Commander Vance (C)"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>Center</span>
                <kbd className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">C</kbd>
              </button>
            )}
          </div>
        </div>

        {/* Top Right: Mission Tactical & Ability Controls */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Main Controls row */}
          <div className="flex items-center gap-2">
            {/* Undo Step */}
            <button
              onClick={() => {
                if (canUndo) {
                  sound.playUndo();
                  onUndo();
                }
              }}
              disabled={!canUndo}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-lg active:scale-95 cursor-pointer ${
                canUndo
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-950/70 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Rewind Last EVA Step (Z)"
            >
              <Undo2 className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Undo</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Z</kbd>
            </button>

            {/* Reset Chamber */}
            <button
              onClick={() => {
                sound.playMove();
                onReset();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-medium transition-all shadow-lg active:scale-95 cursor-pointer"
              title="Reset Platform Deck (R)"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Reset</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">R</kbd>
            </button>

            {/* Tactical Oracle / Gemini AI Advisor */}
            <button
              onClick={() => {
                sound.playKeyPickup();
                onOpenOracle();
              }}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/50 text-sm font-semibold transition-all shadow-lg shadow-cyan-950/60 active:scale-95 cursor-pointer"
              title="Orbital Navigation Telemetry / Oracle (H)"
            >
              <Lightbulb className="w-4 h-4 text-yellow-300 fill-yellow-300/40" />
              <span>Oracle</span>
            </button>

            {/* Camera Perspective Mode */}
            <button
              onClick={() => {
                sound.playMove();
                onToggleCamera();
              }}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
              title={`Switch to ${isIsometric ? 'Top-Down Tactical' : 'Orbital Free'} Camera`}
            >
              <Camera className="w-4 h-4 text-slate-300" />
            </button>

            {/* Level Select */}
            <button
              onClick={() => {
                sound.playMove();
                onOpenLevelSelect();
              }}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
              title="Sector Archives"
            >
              <Grid className="w-4 h-4 text-slate-300" />
            </button>

            {/* Mute Comms */}
            <button
              onClick={() => {
                onToggleMute();
                sound.playMove();
              }}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
              title={isMuted ? 'Unmute Suit Comms' : 'Mute Suit Comms'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* EVA Manual */}
            <button
              onClick={() => {
                sound.playMove();
                onOpenHelp();
              }}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
              title="EVA Protocols & Guidelines"
            >
              <HelpCircle className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* ASTRONAUT SPECIAL ABILITIES BAR */}
          <div className="flex items-center gap-2 mt-1">
            {/* Ability 1: Quantum Blink (Teleport Anywhere!) */}
            <button
              onClick={() => {
                if (abilities.quantumBlinks > 0) {
                  sound.playQuantumBlink();
                  onToggleBlinkMode();
                } else {
                  sound.playAbilityDenied();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                isBlinkActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-300 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] animate-pulse'
                  : abilities.quantumBlinks > 0
                  ? 'bg-slate-900/95 hover:bg-purple-950/80 border-purple-500/60 text-purple-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title="Quantum Blink: Teleport to ANY tile on the map! (Press B)"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Teleport Anywhere</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-200 border border-purple-700 text-[10px]">
                {abilities.quantumBlinks}
              </span>
              <kbd className="hidden lg:inline px-1 rounded bg-slate-800 text-[9px] text-slate-400">B</kbd>
            </button>

            {/* Ability 2: Phase Stabilizer (Restore Collapsed Tile) */}
            <button
              onClick={() => {
                if (abilities.phaseRestores > 0) {
                  sound.playPhaseRestore();
                  onActivatePhaseRestore();
                } else {
                  sound.playAbilityDenied();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                abilities.phaseRestores > 0
                  ? 'bg-slate-900/95 hover:bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title="Phase Stabilizer: Instantly restore the uncoupled deck tile! (Press P)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore Tile</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-200 border border-emerald-700 text-[10px]">
                {abilities.phaseRestores}
              </span>
              <kbd className="hidden lg:inline px-1 rounded bg-slate-800 text-[9px] text-slate-400">P</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
