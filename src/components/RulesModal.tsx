import React from 'react';
import { X, ShieldAlert, Sparkles, CheckCircle, Layers } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How to Play Rummikub</h2>
              <p className="text-xs text-slate-400">Official rules & game engine guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Section 1: Objective */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Game Objective
            </h3>
            <p>
              Be the first player to clear all 14+ tiles from your rack by forming valid combinations (melds) on the board!
            </p>
          </div>

          {/* Section 2: Initial Meld Requirement */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Initial Meld Requirement (&ge; 30 Points)
            </h3>
            <p className="text-xs leading-relaxed text-amber-200/90">
              For your very first play of the game, you must place valid melds directly from your rack totaling at least{' '}
              <strong className="text-amber-300 font-bold">30 points</strong>. You cannot manipulate existing table melds until after your initial meld is achieved.
            </p>
          </div>

          {/* Section 3: Valid Melds */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Valid Melds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <h4 className="font-bold text-white mb-1 text-xs uppercase tracking-wider text-amber-300">Groups</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  3 or 4 tiles of the <strong>same number value</strong> with <strong>different colors</strong> (e.g. Red 7, Blue 7, Black 7).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <h4 className="font-bold text-white mb-1 text-xs uppercase tracking-wider text-emerald-300">Runs</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  3 or more <strong>consecutive numbers</strong> of the <strong>same color</strong> (e.g. Blue 4, Blue 5, Blue 6, Blue 7).
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Jokers */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-amber-400">Jokers</h3>
            <p className="text-xs leading-relaxed">
              Jokers can substitute for any tile color or number in a group or run. Their point value matches the tile they substitute for.
            </p>
          </div>

          {/* Section 5: Turn Controls */}
          <div className="space-y-2 border-t border-slate-800 pt-4">
            <h3 className="text-base font-bold text-slate-200">Turn Snapshot & Actions</h3>
            <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-400">
              <li>
                <strong className="text-slate-200">End Turn:</strong> Validates all melds on the table. Rejects turn if any table meld is invalid.
              </li>
              <li>
                <strong className="text-slate-200">Reset Turn:</strong> Reverts the table board and your rack to the state at the start of your turn.
              </li>
              <li>
                <strong className="text-slate-200">Draw Tile:</strong> Reverts modified board state, draws 1 tile from the pool to your rack, and passes turn.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
