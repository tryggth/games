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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">How to Play Rummikub</h2>
              <p className="text-sm text-slate-200 font-medium">Official rules & game engine guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          {/* Section 1: Objective */}
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Game Objective
            </h3>
            <p className="leading-relaxed">
              Be the first player to clear all 14+ tiles from your rack by forming valid combinations (melds) on the board!
            </p>
          </div>

          {/* Section 2: Initial Meld Requirement */}
          <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-600/70 space-y-2 shadow-md">
            <h3 className="text-base font-extrabold text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Initial Meld Requirement (&ge; 30 Points)
            </h3>
            <p className="text-sm leading-relaxed text-amber-100 font-medium">
              For your very first play of the game, you must place valid melds directly from your rack totaling at least{' '}
              <strong className="text-amber-300 font-bold">30 points</strong>. You cannot manipulate existing table melds until after your initial meld is achieved.
            </p>
          </div>

          {/* Section 3: Valid Melds */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Valid Melds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-600 shadow-sm">
                <h4 className="font-extrabold text-amber-300 mb-1.5 text-sm uppercase tracking-wider">Groups</h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                  3 or 4 tiles of the <strong className="text-white">same number value</strong> with <strong className="text-white">different colors</strong> (e.g. Red 7, Blue 7, Black 7, Chartreuse 7).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800 border border-slate-600 shadow-sm">
                <h4 className="font-extrabold text-emerald-300 mb-1.5 text-sm uppercase tracking-wider">Runs</h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                  3 or more <strong className="text-white">consecutive numbers</strong> of the <strong className="text-white">same color</strong> (e.g. Blue 4, Blue 5, Blue 6, Blue 7).
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Jokers */}
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-amber-300">Jokers</h3>
            <p className="text-sm leading-relaxed">
              Jokers can substitute for any tile color or number in a group or run. Their point value matches the tile they substitute for.
            </p>
          </div>

          {/* Section 5: Turn Controls */}
          <div className="space-y-2 border-t border-slate-700 pt-4">
            <h3 className="text-base font-extrabold text-slate-100">Turn Snapshot & Actions</h3>
            <ul className="list-disc list-inside text-sm space-y-2 text-slate-200">
              <li>
                <strong className="text-white font-bold">End Turn:</strong> Validates all melds on the table. Rejects turn if any table meld is invalid.
              </li>
              <li>
                <strong className="text-white font-bold">Reset Turn:</strong> Reverts the table board and your rack to the state at the start of your turn.
              </li>
              <li>
                <strong className="text-white font-bold">Draw Tile:</strong> Reverts uncommitted board moves, draws 1 tile from the pool to your rack, and passes turn.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition cursor-pointer shadow-lg"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
