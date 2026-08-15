import React from 'react';
import type { HintResult, HintMove } from '../engine/hintSolver';
import { Lightbulb, X, Sparkles, PlusCircle, Split, Info } from 'lucide-react';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  hintResult: HintResult | null;
  onSelectSuggestedTiles: (tileIds: string[]) => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  isOpen,
  onClose,
  hintResult,
  onSelectSuggestedTiles,
}) => {
  if (!isOpen || !hintResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Move Suggestions & Hints
              </h3>
              <p className="text-sm text-slate-200 font-medium">
                {hintResult.hasMoves
                  ? `Found ${hintResult.moves.length} strategic move(s) for your turn`
                  : 'Turn Strategy Recommendation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {!hintResult.hasMoves ? (
            <div className="py-8 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                <Info className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-amber-200">No Valid Plays Found</h4>
              <p className="text-sm text-slate-200 max-w-md leading-relaxed">
                There are currently no legal melds or extensions available from your hand.
                Click <span className="text-amber-300 font-bold">Draw Tile</span> on the control bar below to pass your turn and get a new tile.
              </p>
            </div>
          ) : (
            hintResult.moves.map((move: HintMove, idx: number) => (
              <div
                key={move.id || idx}
                className="p-4 rounded-xl border border-slate-700 bg-slate-950/70 hover:border-amber-500/50 transition flex flex-col gap-2.5 shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {move.type === 'new-meld' && (
                      <span className="inline-flex items-center gap-1 text-xs font-black uppercase px-2.5 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/50">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                        <span>New Meld</span>
                      </span>
                    )}

                    {move.type === 'extend-meld' && (
                      <span className="inline-flex items-center gap-1 text-xs font-black uppercase px-2.5 py-0.5 rounded bg-amber-500/25 text-amber-200 border border-amber-400/50">
                        <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                        <span>Extend Meld</span>
                      </span>
                    )}

                    {move.type === 'split-recombine' && (
                      <span className="inline-flex items-center gap-1 text-xs font-black uppercase px-2.5 py-0.5 rounded bg-purple-500/25 text-purple-200 border border-purple-400/50">
                        <Split className="w-3.5 h-3.5 text-purple-300" />
                        <span>Split & Recombine</span>
                      </span>
                    )}

                    <span className="text-sm font-bold text-slate-100">{move.title}</span>
                  </div>

                  {move.pointValue && move.pointValue > 0 && (
                    <span className="text-sm font-mono font-extrabold text-amber-300">
                      +{move.pointValue} pts
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-200 font-medium leading-relaxed">
                  {move.description}
                </p>

                {move.suggestedTileIds.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-mono font-semibold">
                      {move.suggestedTileIds.length} tile(s) suggested
                    </span>

                    <button
                      onClick={() => {
                        onSelectSuggestedTiles(move.suggestedTileIds);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Select Tiles</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-700 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
