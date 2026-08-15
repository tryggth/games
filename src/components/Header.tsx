import React from 'react';
import type { Player } from '../types/game';
import { Volume2, VolumeX, HelpCircle, RefreshCw, Layers, ShieldAlert, Lightbulb, Download, Bot, Search, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  poolCount: number;
  activePlayer: Player | null;
  humanPlayer: Player | null;
  aiPlayer: Player | null;
  isHumanTurn: boolean;
  soundEnabled: boolean;
  isMagnifierEnabled: boolean;
  botLastMoveMessage?: string | null;
  onToggleSound: () => void;
  onToggleMagnifier: () => void;
  onOpenRules: () => void;
  onRestartGame: () => void;
  onGetHint?: () => void;
  onInstallApp?: () => void;
}

const appVersion = (import.meta as any).env?.VITE_APP_VERSION || 'v1.0.0';

export const Header: React.FC<HeaderProps> = ({
  poolCount,
  activePlayer,
  humanPlayer,
  aiPlayer,
  isHumanTurn,
  soundEnabled,
  isMagnifierEnabled,
  botLastMoveMessage,
  onToggleSound,
  onToggleMagnifier,
  onOpenRules,
  onRestartGame,
  onGetHint,
  onInstallApp,
}) => {
  const aiTileCount = aiPlayer?.hand?.length ?? 14;

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-700 px-4 py-3 shadow-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg ring-2 ring-amber-400/40">
            <span className="font-extrabold text-slate-950 text-xl tracking-wider">R</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Rummikub <span className="text-amber-300 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 font-mono font-bold">PRO</span>
              <span className="text-cyan-200 text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/50 font-mono font-bold flex items-center gap-1 shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> {appVersion}
              </span>
            </h1>
            <p className="text-sm text-slate-200 font-medium">Classic Tile Strategy Game</p>
          </div>
        </div>

        {/* HUD Game Status Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-600 shadow-inner">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-200 font-semibold">Pool:</span>
            <span className="text-base font-extrabold font-mono text-amber-300">{poolCount} tiles</span>
          </div>

          {/* Persistent Bot Hand Tile Count Display Badge */}
          <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-600 text-sm font-semibold shadow-inner text-amber-300">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200">Bot:</span>
            <span className="text-base font-extrabold font-mono text-amber-300">{aiTileCount} tiles</span>
          </div>

          {/* Persistent Bot Last Move Status Banner at Top of Window */}
          {botLastMoveMessage && (
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-400/40 px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm text-amber-200">
              <Bot className="w-4 h-4 text-amber-400" />
              <span className="text-slate-200 font-medium">Bot's Last Turn:</span>
              <span className="font-extrabold text-amber-100">{botLastMoveMessage}</span>
            </div>
          )}

          <div
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-bold shadow-sm transition-all',
              isHumanTurn
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse-subtle'
                : 'bg-amber-500/20 border-amber-400 text-amber-200'
            )}
          >
            <span className={clsx('w-2.5 h-2.5 rounded-full ring-2 ring-white/20', isHumanTurn ? 'bg-emerald-400' : 'bg-amber-400')} />
            <span>Turn: {activePlayer?.name || 'Loading...'}</span>
          </div>

          {!humanPlayer?.hasInitialMeld && (
            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-sm font-bold bg-amber-950/60 border-amber-600/70 text-amber-200 shadow-md">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Initial Meld Required (&ge; 30 pts)</span>
            </div>
          )}
        </div>

        {/* Action & Settings Buttons */}
        <div className="flex items-center gap-2">
          {onInstallApp && (
            <button
              onClick={onInstallApp}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer border border-cyan-300"
              title="Install Rummikub as a standalone PWA application on ChromeOS/Desktop"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Install App</span>
            </button>
          )}

          {/* Toggleable Tile Magnifier Button */}
          <button
            onClick={onToggleMagnifier}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-extrabold flex items-center gap-1.5 border transition cursor-pointer',
              isMagnifierEnabled
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow-lg ring-2 ring-cyan-400/50'
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:text-white hover:bg-slate-700'
            )}
            title="Toggle 2x Zoom Tile Magnifier Preview on hover"
          >
            <Search className="w-4 h-4 text-cyan-300" />
            <span>Magnifier: {isMagnifierEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {onGetHint && (
            <button
              onClick={onGetHint}
              disabled={!isHumanTurn}
              className={clsx(
                'px-3.5 py-2 rounded-lg text-sm font-extrabold flex items-center gap-1.5 border transition shadow-sm',
                isHumanTurn
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-500/35 hover:text-white shadow-amber-500/20 cursor-pointer transform hover:scale-105 active:scale-95'
                  : 'bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              )}
              title="Get AI move suggestions and hints for your turn"
            >
              <Lightbulb className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Hint</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition border border-slate-600 cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={onOpenRules}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition border border-slate-600 flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
            title="Game Rules & Guide"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Rules</span>
          </button>

          <button
            onClick={onRestartGame}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white transition border border-slate-600 flex items-center gap-1.5 text-sm font-bold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};
