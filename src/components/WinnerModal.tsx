import React from 'react';
import type { Player } from '../types/game';
import { Trophy, RefreshCw, Bot, User } from 'lucide-react';

interface WinnerModalProps {
  winner: Player | null;
  onPlayAgain: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ winner, onPlayAgain }) => {
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20 ring-4 ring-amber-400/30 flex items-center justify-center animate-bounce">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {winner.isAi ? 'Game Over!' : 'Victory!'}
          </h2>
          <p className="text-sm text-slate-300 flex items-center justify-center gap-2">
            {winner.isAi ? <Bot className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-emerald-400" />}
            <span className="font-bold text-amber-300">{winner.name}</span> has cleared all tiles and won the game!
          </p>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Play Again</span>
        </button>
      </div>
    </div>
  );
};
