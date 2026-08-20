import React from 'react';
import type { Player, DragItem, Tile } from '../types/game';
import { TileComponent } from './TileComponent';
import { Sparkles, X } from 'lucide-react';

interface HandProps {
  humanPlayer: Player | null;
  selectedTileIds: string[];
  drawnTileId?: string | null;
  isMagnifierEnabled?: boolean;
  onToggleTileSelection: (tileId: string) => void;
  onClearSelection: () => void;
  onCreateMeldFromSelection: () => void;
  onDropTileCanvas: (item: DragItem) => void;
  isHumanTurn: boolean;
}

export const Hand: React.FC<HandProps> = ({
  humanPlayer,
  selectedTileIds,
  drawnTileId,
  isMagnifierEnabled = true,
  onToggleTileSelection,
  onClearSelection,
  onCreateMeldFromSelection,
  onDropTileCanvas,
  isHumanTurn,
}) => {
  const hand: Tile[] = humanPlayer?.hand || [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const item: DragItem = JSON.parse(dataStr);
      onDropTileCanvas(item);
    } catch {
      // Ignore invalid JSON
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleCanvasDrop}
      className="w-full flex-none h-auto bg-rack-wood rounded-2xl border border-amber-900/80 shadow-2xl relative overflow-hidden select-none flex flex-col justify-between p-3.5 md:p-4 transition-all duration-200"
    >
      {/* Wood Finish Accent Line */}
      <div className="absolute inset-x-4 top-2 h-0.5 bg-amber-950/90 rounded pointer-events-none" />

      {/* Header Controls Overlay Bar */}
      <div className="w-full flex items-center justify-between pb-2.5 border-b border-amber-900/60 z-20">
        <div className="flex items-center gap-3">
          <span className="text-base font-extrabold text-amber-100 uppercase tracking-wide flex items-center gap-2">
            Player Hand Tray{' '}
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/80 font-mono font-bold">
              {hand.length} tiles (Auto-Sorted)
            </span>
          </span>

          {selectedTileIds.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/25 px-3 py-1 rounded-md border border-amber-400 text-sm font-bold text-amber-100 shadow-sm">
              <span>{selectedTileIds.length} selected</span>
              <button
                onClick={onClearSelection}
                className="hover:text-white p-0.5 rounded hover:bg-amber-500/40 transition cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {selectedTileIds.length >= 3 && isHumanTurn && (
            <button
              onClick={onCreateMeldFromSelection}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Meld ({selectedTileIds.length})</span>
            </button>
          )}

          <span className="text-xs text-amber-200 font-semibold font-mono hidden md:inline">
            ★ Always sorted by Color & Number
          </span>
        </div>
      </div>

      {/* Auto-Sorted Flex Wrap Hand Tiles Container */}
      <div className="w-full min-h-[76px] max-h-44 md:max-h-52 overflow-y-auto pt-3 pb-1 pr-1 z-10 flex flex-wrap gap-2.5 items-start content-start">
        {hand.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-amber-300/80 text-sm font-bold font-mono">
            [Your hand tray is empty! You played all your tiles.]
          </div>
        ) : (
          hand.map((tile, idx) => {
            const prevTile = idx > 0 ? hand[idx - 1] : null;
            const getGroupKey = (t: Tile) => (t.isJoker ? 'joker' : t.color);
            const isNewGroup = prevTile !== null && getGroupKey(tile) !== getGroupKey(prevTile);

            return (
              <React.Fragment key={tile.id}>
                {isNewGroup && (
                  <div
                    key={`spacer-${tile.id}`}
                    className="w-11 h-16 pointer-events-none flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                <TileComponent
                  tile={tile}
                  isSelected={selectedTileIds.includes(tile.id)}
                  isDrawnTile={tile.id === drawnTileId}
                  isMagnifierEnabled={isMagnifierEnabled}
                  onClick={() => isHumanTurn && onToggleTileSelection(tile.id)}
                  source="rack"
                  size="md"
                />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
