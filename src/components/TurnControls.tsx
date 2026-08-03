import React from 'react';
import { Play, Plus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TurnControlsProps {
  isHumanTurn: boolean;
  isAiThinking: boolean;
  tilesPlayedCount: number;
  isBoardValid: boolean;
  turnPointsGained: number;
  hasInitialMeld: boolean;
  onEndTurn: () => void;
  onDrawTile: () => void;
  poolCount: number;
}

export const TurnControls: React.FC<TurnControlsProps> = ({
  isHumanTurn,
  isAiThinking,
  tilesPlayedCount,
  isBoardValid,
  turnPointsGained,
  hasInitialMeld,
  onEndTurn,
  onDrawTile,
  poolCount,
}) => {
  const hasPlayedTiles = tilesPlayedCount > 0;
  const initialMeldSatisfied = hasInitialMeld || turnPointsGained >= 30;
  const canEndTurn = hasPlayedTiles && isBoardValid && initialMeldSatisfied;

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Bot Thinking & Player Status Indicator */}
      <div className="flex items-center gap-3">
        {isAiThinking ? (
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Rummikub Bot is thinking & playing...</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            {isHumanTurn ? (
              hasPlayedTiles ? (
                canEndTurn ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Played {tilesPlayedCount} tile(s) (+{turnPointsGained} pts). Ready to submit!
                  </span>
                ) : !initialMeldSatisfied ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Played {tilesPlayedCount} tile(s). Initial meld requires 30+ pts from hand ({turnPointsGained}/30 pts).
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Played {tilesPlayedCount} tile(s). Fix invalid melds on table before ending.
                  </span>
                )
              ) : (
                <span className="text-slate-300 font-medium">Your Turn: Make table melds or Draw a tile to pass.</span>
              )
            ) : (
              <span className="text-slate-400 font-medium">Opponent's Turn</span>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Draw Tile & Pass Button (Always available to draw/pass turn) */}
        <button
          onClick={onDrawTile}
          disabled={!isHumanTurn || isAiThinking}
          className={clsx(
            'px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition border shadow-lg cursor-pointer transform hover:scale-105 active:scale-95',
            isHumanTurn && !isAiThinking
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400 shadow-blue-500/20'
              : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
          )}
          title={
            hasPlayedTiles
              ? 'Revert uncommitted board moves, draw 1 tile from pool, and pass turn'
              : `Draw 1 tile from pool (${poolCount} left) and pass turn`
          }
        >
          <Plus className="w-4 h-4 text-cyan-300" />
          <span>Draw Tile & Pass (+1)</span>
        </button>

        {/* End Turn Action / Warning Button */}
        {hasPlayedTiles && (
          canEndTurn ? (
            /* Valid End Turn: Glowing Emerald */
            <button
              onClick={onEndTurn}
              disabled={!isHumanTurn || isAiThinking}
              className={clsx(
                'px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition border shadow-xl cursor-pointer transform hover:scale-105 active:scale-95 animate-pulse',
                isHumanTurn && !isAiThinking
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 border-emerald-300 shadow-emerald-500/40 ring-2 ring-emerald-400/60'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              )}
              title="Submit turn and pass to opponent"
            >
              <Play className="w-4 h-4 fill-current text-slate-950" />
              <span>End Turn</span>
            </button>
          ) : !initialMeldSatisfied ? (
            /* Initial Meld Requirement Not Met */
            <button
              onClick={onEndTurn}
              disabled={!isHumanTurn || isAiThinking}
              className={clsx(
                'px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition border shadow-md',
                isHumanTurn && !isAiThinking
                  ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-600/80 cursor-pointer'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              )}
              title={`Initial meld requires 30+ points from hand (currently ${turnPointsGained} pts)`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>End Turn (Need 30+ Pts: {turnPointsGained}/30)</span>
            </button>
          ) : (
            /* Board Melds Invalid */
            <button
              onClick={onEndTurn}
              disabled={!isHumanTurn || isAiThinking}
              className={clsx(
                'px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition border shadow-md',
                isHumanTurn && !isAiThinking
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-600/80 cursor-pointer'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              )}
              title="Click to check invalid melds on the table"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>End Turn (Fix Invalid Melds)</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};
