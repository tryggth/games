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
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Move Suggestions & Hints
              </h3>
              <p className="text-xs text-slate-400">
                {hintResult.hasMoves
                  ? `Found ${hintResult.moves.length} strategic move(s) for your turn`
                  : 'Turn Strategy Recommendation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {!hintResult.hasMoves ? (
            <div className="py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                <Info className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-amber-200">No Valid Plays Found</h4>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                There are currently no legal melds or extensions available from your hand.
                Click <span className="text-amber-300 font-semibold">Draw Tile</span> on the control bar below to pass your turn and get a new tile.
              </p>
            </div>
          ) : (
            hintResult.moves.map((move: HintMove, idx: number) => (
              <div
                key={move.id || idx}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/40 transition flex flex-col gap-2.5 shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {move.type === 'new-meld' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>New Meld</span>
                      </span>
                    )}

                    {move.type === 'extend-meld' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <PlusCircle className="w-3 h-3 text-amber-400" />
                        <span>Extend Meld</span>
                      </span>
                    )}

                    {move.type === 'split-recombine' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <Split className="w-3 h-3 text-purple-400" />
                        <span>Split & Recombine</span>
                      </span>
                    )}

                    <span className="text-xs font-bold text-slate-200">{move.title}</span>
                  </div>

                  {move.pointValue && move.pointValue > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-400">
                      +{move.pointValue} pts
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {move.description}
                </p>

                {move.suggestedTileIds.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {move.suggestedTileIds.length} tile(s) suggested
                    </span>

                    <button
                      onClick={() => {
                        onSelectSuggestedTiles(move.suggestedTileIds);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition transform hover:scale-105 active:scale-95 flex items-center gap-1"
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
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
