import React from 'react';
import type { Player } from '../types/game';
import { Volume2, VolumeX, HelpCircle, RefreshCw, Layers, ShieldCheck, ShieldAlert, Lightbulb, Download, Bot, Search, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  poolCount: number;
  activePlayer: Player | null;
  humanPlayer: Player | null;
  aiPlayer: Player | null;
  isHumanTurn: boolean;
  soundEnabled: boolean;
  isMagnifierEnabled: boolean;
  onToggleSound: () => void;
  onToggleMagnifier: () => void;
  onOpenRules: () => void;
  onRestartGame: () => void;
  onGetHint?: () => void;
  onInstallApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  poolCount,
  activePlayer,
  humanPlayer,
  aiPlayer,
  isHumanTurn,
  soundEnabled,
  isMagnifierEnabled,
  onToggleSound,
  onToggleMagnifier,
  onOpenRules,
  onRestartGame,
  onGetHint,
  onInstallApp,
}) => {
  const aiTileCount = aiPlayer?.handTiles?.length ?? 14;

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg ring-2 ring-amber-400/30">
            <span className="font-extrabold text-slate-950 text-xl tracking-wider">R</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Rummikub <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono">PRO</span>
              <span className="text-emerald-300 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 font-mono font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/20 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> v1.0.1 UPDATED
              </span>
            </h1>
            <p className="text-xs text-slate-400">Classic Tile Strategy Game</p>
          </div>
        </div>

        {/* HUD Game Status Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-inner">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Pool:</span>
            <span className="text-sm font-bold font-mono text-amber-300">{poolCount} tiles</span>
          </div>

          {/* Persistent Bot Hand Tile Count Display Badge */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-semibold shadow-inner text-amber-300">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Bot:</span>
            <span className="font-bold font-mono text-amber-300">{aiTileCount} tiles</span>
          </div>

          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all',
              isHumanTurn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse-subtle'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}
          >
            <span className={clsx('w-2 h-2 rounded-full', isHumanTurn ? 'bg-emerald-400' : 'bg-amber-400')} />
            <span>Turn: {activePlayer?.name || 'Loading...'}</span>
          </div>

          <div
            className={clsx(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium',
              humanPlayer?.hasInitialMeld
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
            )}
          >
            {humanPlayer?.hasInitialMeld ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Initial Meld Done</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Initial Meld Required (&ge; 30 pts)</span>
              </>
            )}
          </div>
        </div>

        {/* Action & Settings Buttons */}
        <div className="flex items-center gap-2">
          {onInstallApp && (
            <button
              onClick={onInstallApp}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer border border-cyan-300/40"
              title="Install Rummikub as a standalone PWA application on ChromeOS/Desktop"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Install App</span>
            </button>
          )}

          {/* Toggleable Tile Magnifier Button */}
          <button
            onClick={onToggleMagnifier}
            className={clsx(
              'px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer',
              isMagnifierEnabled
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20 shadow-lg ring-1 ring-cyan-400/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
            )}
            title="Toggle 2x Zoom Tile Magnifier Preview on hover"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Magnifier: {isMagnifierEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {onGetHint && (
            <button
              onClick={onGetHint}
              disabled={!isHumanTurn}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition shadow-sm',
                isHumanTurn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 hover:text-amber-100 shadow-amber-500/10 cursor-pointer transform hover:scale-105 active:scale-95'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed opacity-50'
              )}
              title="Get AI move suggestions and hints for your turn"
            >
              <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Hint</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={onOpenRules}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 flex items-center gap-1 text-xs cursor-pointer"
            title="Game Rules & Guide"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden md:inline">Rules</span>
          </button>

          <button
            onClick={onRestartGame}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition border border-slate-700 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};
