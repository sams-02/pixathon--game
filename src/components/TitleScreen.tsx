import React from 'react';
import { Play, Grid, Sparkles, HelpCircle, Volume2, VolumeX, ShieldAlert, Compass, UserCheck } from 'lucide-react';
import { sound } from '../audio/sound';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenLevelEditor: () => void;
  onOpenHelp: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenLevelSelect,
  onOpenLevelEditor,
  onOpenHelp,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none text-slate-100">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-mono font-bold text-base shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            EVA
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono font-semibold">
              Deep Space Orbital Array
            </div>
            <div className="text-sm text-slate-300 font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commander Elena Vance · Human Astrogator</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onToggleMute();
              sound.playMove();
            }}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 transition-all cursor-pointer shadow-lg active:scale-95"
            title={isMuted ? 'Unmute Suit Comms' : 'Mute Suit Comms'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
          <button
            onClick={() => {
              onOpenHelp();
              sound.playMove();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 transition-all cursor-pointer shadow-lg text-sm font-medium active:scale-95"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>EVA Protocols</span>
          </button>
        </div>
      </div>

      {/* Center Hero Mission Briefing with Problem Statement #3 Announcement */}
      <div className="flex flex-col items-center text-center my-auto max-w-3xl mx-auto px-4">
        {/* Prominent Problem Statement #3 Rule Announcement Banner */}
        <div className="w-full mb-6 p-4 rounded-2xl bg-slate-950/90 border-2 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-left flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0 text-amber-300">
            <ShieldAlert className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/80 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-widest">
                Problem Statement #3
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-mono text-[11px] font-semibold uppercase">
                Sole Rule Change Added
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              NEW RULE: YOU CANNOT GO BACKWARDS
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-0.5">
              We updated the existing puzzle game with one unique rule: <span className="text-amber-300 font-bold">the tile you just left collapses for 1 turn</span>. You can never step backward into your previous position!
            </p>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-md font-sans mb-3">
          CHRONOTILE
        </h1>
        <p className="text-base md:text-lg text-slate-200 font-light max-w-xl leading-relaxed mb-6 drop-shadow">
          Echoes of the Step — Navigate high-precision orbital platforms where your own footsteps lock the deck behind you. Plan every vector two paces ahead.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
          <button
            onClick={() => {
              sound.playWinFanfare();
              onStartGame();
            }}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(6,182,212,0.45)] transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>Begin Space Walk</span>
          </button>

          <button
            onClick={() => {
              sound.playMove();
              onOpenLevelSelect();
            }}
            className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-base transition-all cursor-pointer hover:border-slate-500 shadow-xl active:scale-95"
          >
            <Grid className="w-5 h-5 text-cyan-400" />
            <span>Chamber Matrix</span>
          </button>

          <button
            onClick={() => {
              sound.playMove();
              onOpenLevelEditor();
            }}
            className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-base transition-all cursor-pointer hover:border-purple-500/60 shadow-xl active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Station Architect</span>
          </button>
        </div>
      </div>

      {/* Bottom Telemetry Control Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-4 pointer-events-auto bg-slate-950/60 rounded-xl px-4 py-2.5 backdrop-blur-none">
        <div className="flex items-center gap-4 mb-2 sm:mb-0">
          <span className="flex items-center gap-1.5 text-slate-300">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">WASD / Arrows</kbd>
            <span>EVA Magnetic Boots</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">Z</kbd>
            <span>Undo Step</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">R</kbd>
            <span>Reset Array</span>
          </span>
        </div>

        <div className="text-slate-400 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click Deck Tiles · Mouse Drag to Orbit Horizon · Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
