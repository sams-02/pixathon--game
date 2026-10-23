import React from 'react';
import {
  X,
  AlertOctagon,
  Footprints,
  Navigation,
  Compass,
  Repeat,
  Zap,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layers,
  Crosshair,
  CheckCircle2,
} from 'lucide-react';
import { sound } from '../audio/sound';

interface HelpModalProps {
  onClose: () => void;
  isFirstBoot?: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose, isFirstBoot = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl p-5 sm:p-7 rounded-3xl bg-slate-900 border border-cyan-500/50 shadow-2xl shadow-cyan-950/90 text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-500/60 text-cyan-400 shadow-md shadow-cyan-950/50">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Astronaut Flight Playbook</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono uppercase tracking-wider">
                  EVA Protocol 3.8
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Commander Elena Vance · Orbital EVA Mission Briefing
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playMove();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close Briefing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-4 my-4 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-300">
          {/* CRITICAL LAW HIGHLIGHT BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/90 via-amber-950/70 to-red-950/90 border-2 border-red-500/70 shadow-lg shadow-red-950/80">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0 mt-0.5 shadow-md">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-900 border border-red-500 text-red-200 uppercase tracking-widest">
                    PROBLEM STATEMENT #3
                  </span>
                  <span className="text-xs text-amber-300 font-bold uppercase tracking-wide">
                    Sole Rule Change Added
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  NEW RULE: WE CANNOT GO BACKWARDS!
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-red-100 font-medium">
                  We have updated the existing puzzle game with this single unique rule: <span className="text-amber-300 font-bold underline">the tile you just left collapses into space for 1 turn</span>. You can NEVER immediately step backward into your previous position! Moving into a 1-tile corridor without an exit or teleporter will trap you. Plan your route in loops or multi-tile chambers!
                </p>
              </div>
            </div>
          </div>

          {/* DUAL CONTROLS ARCHITECTURE: WASD vs ARROW KEYS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Astronaut Movement */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h5 className="font-bold text-white text-sm">Character Navigation</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">W</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">A</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">S</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">D</kbd>{' '}
                  or <span className="text-cyan-300 font-semibold">Click Tile</span>
                </p>
                <p className="text-xs text-slate-400">
                  Commander Vance moves relative to your current camera view. Pressing <span className="text-cyan-300 font-mono">W</span> always steps screen-forward into the scene.
                </p>
              </div>
            </div>

            {/* Camera View Movement */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <h5 className="font-bold text-white text-sm">Camera View Navigation</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono font-bold">↑</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono font-bold">↓</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono font-bold">←</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono font-bold">→</kbd>{' '}
                  Arrow Keys
                </p>
                <p className="text-xs text-slate-400">
                  Smoothly glide the camera view <span className="text-blue-300 font-semibold">forward, backward, left, and right</span> across the enlarged space station to scout ahead. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">C</kbd> to re-center on Vance.
                </p>
              </div>
            </div>
          </div>

          {/* Tactical Chamber 1 Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400 shrink-0 h-min">
              <Repeat className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">
                Enlarged Arena & Tactical Loops (Chamber 1)
              </h4>
              <p className="leading-relaxed text-slate-300">
                Chamber 1 is now a large 12x8 deep-space platform. To turn around or reach the Gold Key without backtracking, <span className="text-purple-300 font-semibold">circle around the obsidian bulkheads</span>. By looping through the corridors, your previously uncoupled footsteps safely recover behind you.
              </p>
            </div>
          </div>

          {/* Astronaut Special Superpowers */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shrink-0 h-min">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">
                Astronaut Superpowers: Teleport Anywhere & Phase Restore
              </h4>
              <p className="leading-relaxed text-slate-300">
                • <span className="text-purple-300 font-bold">Quantum Blink (Press B)</span>: Projects a 3D targeting reticle. Click <span className="text-cyan-300 font-semibold">ANY platform tile</span> on the arena to teleport there immediately!<br/>
                • <span className="text-emerald-300 font-bold">Phase Stabilizer (Press P)</span>: Re-solidifies the uncoupled hazard tile behind you, allowing an emergency escape.<br/>
                • <span className="text-amber-300 font-bold">30-Second Speedrun Star</span>: Clear each chamber in under 30 seconds to earn the Speedrun Ace accolade!
              </p>
            </div>
          </div>

          {/* Quick Hotkey Table */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono text-[11px]">
            <span className="text-cyan-400 uppercase font-semibold tracking-wider block mb-2">
              Mission Flight Controls
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">WASD</kbd> Move Vance</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Arrows</kbd> Move Camera View</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Drag / Q,E</kbd> Orbit 360°</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">C</kbd> Center Camera</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">B</kbd> Teleport Anywhere</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">P</kbd> Phase Restore</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Z</kbd> Undo Step</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">R</kbd> Reset Chamber</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">+ / -</kbd> Zoom In / Out</div>
            </div>
          </div>
        </div>

        {/* Footer Launch Action */}
        <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">Space</kbd> or click to begin
          </span>
          <button
            onClick={() => {
              sound.playWinFanfare();
              onClose();
            }}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-900/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isFirstBoot ? 'Understood · Commence EVA Mission' : 'Resume Mission'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
