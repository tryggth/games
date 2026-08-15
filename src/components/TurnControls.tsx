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

  // Determine button text when End Turn is disabled
  let disabledReasonText = 'Invalid Melds';
  if (!initialMeldSatisfied) {
    disabledReasonText = `Invalid Melds (Need 30+ Pts: ${turnPointsGained}/30)`;
  } else if (!isBoardValid) {
    disabledReasonText = 'Invalid Melds';
  }

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Bot Thinking & Player Status Indicator */}
      <div className="flex items-center gap-3">
        {isAiThinking ? (
          <div className="flex items-center gap-2 text-amber-300 text-sm font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Rummikub Bot is thinking & playing...</span>
          </div>
        ) : (
          <div className="text-sm font-semibold text-slate-200">
            {isHumanTurn ? (
              hasPlayedTiles ? (
                canEndTurn ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Played {tilesPlayedCount} tile(s) (+{turnPointsGained} pts). Ready to submit!
                  </span>
                ) : !initialMeldSatisfied ? (
                  <span className="text-amber-200 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Played {tilesPlayedCount} tile(s). Initial meld requires 30+ pts from hand ({turnPointsGained}/30 pts).
                  </span>
                ) : (
                  <span className="text-rose-200 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Played {tilesPlayedCount} tile(s). Fix invalid melds on table before ending.
                  </span>
                )
              ) : (
                <span className="text-slate-100 font-semibold">Your Turn: Make table melds or Draw a tile to pass.</span>
              )
            ) : (
              <span className="text-slate-300 font-semibold">Opponent's Turn</span>
            )}
          </div>
        )}
      </div>

      {/* Mutually Exclusive Single Action Button Container */}
      <div className="flex items-center gap-3">
        {!hasPlayedTiles ? (
          /* CASE 1: No tiles added from hand during current turn -> Show Draw Tile & Pass (ENABLED) */
          <button
            onClick={onDrawTile}
            disabled={!isHumanTurn || isAiThinking}
            className={clsx(
              'px-6 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 transition border shadow-lg cursor-pointer transform hover:scale-105 active:scale-95',
              isHumanTurn && !isAiThinking
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-300 shadow-blue-500/30'
                : 'bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed'
            )}
            title={`Draw 1 tile from pool (${poolCount} left) and pass turn`}
          >
            <Plus className="w-4 h-4 text-cyan-200" />
            <span>Draw Tile & Pass (+1)</span>
          </button>
        ) : canEndTurn ? (
          /* CASE 2A: Tiles added from hand & all melds valid -> Show End Turn (ENABLED) */
          <button
            onClick={onEndTurn}
            disabled={!isHumanTurn || isAiThinking}
            className={clsx(
              'px-7 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition border shadow-xl cursor-pointer transform hover:scale-105 active:scale-95 animate-pulse',
              isHumanTurn && !isAiThinking
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 border-emerald-300 shadow-emerald-500/50 ring-2 ring-emerald-400/60'
                : 'bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed'
            )}
            title="Submit turn and pass to opponent"
          >
            <Play className="w-4 h-4 fill-current text-slate-950" />
            <span>End Turn</span>
          </button>
        ) : (
          /* CASE 2B: Tiles added from hand but invalid melds or unmet initial meld -> Show Invalid Melds (DISABLED) */
          <button
            disabled={true}
            className="px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition border shadow-md bg-slate-800 text-rose-300 border-rose-600/60 cursor-not-allowed opacity-90"
            title="Return uncommitted tiles to your hand tray or arrange them into valid melds to enable End Turn"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{disabledReasonText}</span>
          </button>
        )}
      </div>
    </div>
  );
};
