import React from 'react';
import type { Player, DragItem, HandTile } from '../types/game';
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
  isMagnifierEnabled = false,
  onToggleTileSelection,
  onClearSelection,
  onCreateMeldFromSelection,
  onDropTileCanvas,
  isHumanTurn,
}) => {
  const handTiles: HandTile[] = humanPlayer?.handTiles || [];

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
      className="w-full flex-none h-52 md:h-60 bg-rack-wood rounded-2xl border border-amber-900/60 shadow-2xl relative overflow-hidden select-none flex flex-col justify-between p-4"
    >
      {/* Wood Finish Accent Line */}
      <div className="absolute inset-x-4 top-2 h-0.5 bg-amber-950/80 rounded pointer-events-none" />

      {/* Header Controls Overlay Bar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-amber-900/40 z-20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-amber-200 uppercase tracking-wide flex items-center gap-2">
            Player Hand Tray{' '}
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/40 font-mono">
              {handTiles.length} tiles (Auto-Sorted)
            </span>
          </span>

          {selectedTileIds.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/40 text-xs text-amber-300">
              <span className="font-semibold">{selectedTileIds.length} selected</span>
              <button
                onClick={onClearSelection}
                className="hover:text-white p-0.5 rounded hover:bg-amber-500/30 transition cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedTileIds.length >= 3 && isHumanTurn && (
            <button
              onClick={onCreateMeldFromSelection}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Meld ({selectedTileIds.length})</span>
            </button>
          )}

          <span className="text-[11px] text-amber-400/80 font-mono italic hidden md:inline">
            ★ Always sorted by Color & Number
          </span>
        </div>
      </div>

      {/* Auto-Sorted Flex Wrap Hand Tiles Container */}
      <div className="w-full flex-1 overflow-y-auto pt-3 pb-1 pr-1 z-10 flex flex-wrap gap-2.5 items-start content-start">
        {handTiles.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-amber-500/30 text-xs font-mono">
            [Your hand tray is empty! You played all your tiles.]
          </div>
        ) : (
          handTiles.map((ht) => (
            <TileComponent
              key={ht.tile.id}
              tile={ht.tile}
              isSelected={selectedTileIds.includes(ht.tile.id)}
              isDrawnTile={ht.tile.id === drawnTileId}
              isMagnifierEnabled={isMagnifierEnabled}
              onClick={() => isHumanTurn && onToggleTileSelection(ht.tile.id)}
              source="rack"
              size="md"
            />
          ))
        )}
      </div>
    </div>
  );
};
