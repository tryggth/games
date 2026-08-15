import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Meld, DragItem } from '../types/game';
import { TileComponent } from './TileComponent';
import { XCircle, Bot, PlusCircle, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface BoardProps {
  melds: Meld[];
  selectedTileIds: string[];
  highlightedMeldIds?: string[];
  isMagnifierEnabled?: boolean;
  onToggleTileSelection: (tileId: string) => void;
  onDropTile: (
    item: DragItem,
    targetLocation: {
      type: 'board-new' | 'board-meld' | 'rack' | 'hand';
      meldId?: string;
      targetIndex?: number;
    }
  ) => void;
  onSplitMeld?: (meldId: string, splitIndex: number) => void;
  isHumanTurn: boolean;
}

const MeldContainer: React.FC<{
  meld: Meld;
  selectedTileIds: string[];
  isHighlighted?: boolean;
  isMagnifierEnabled?: boolean;
  onToggleTileSelection: (tileId: string) => void;
  onDropTile: (
    item: DragItem,
    targetLocation: {
      type: 'board-new' | 'board-meld' | 'rack' | 'hand';
      meldId?: string;
      targetIndex?: number;
    }
  ) => void;
  isHumanTurn: boolean;
}> = ({
  meld,
  selectedTileIds,
  isHighlighted = false,
  isMagnifierEnabled = false,
  onToggleTileSelection,
  onDropTile,
  isHumanTurn,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const item: DragItem = JSON.parse(dataStr);
      onDropTile(item, {
        type: 'board-meld',
        meldId: meld.id,
      });
    } catch {
      // Ignore invalid JSON
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        'relative p-2 rounded-xl border transition-all duration-300 backdrop-blur-md shadow-md flex flex-col gap-1.5 select-none cursor-pointer',
        isDragOver
          ? 'bg-amber-950/70 border-amber-400 ring-4 ring-amber-400/80 shadow-2xl shadow-amber-500/50 scale-102 z-30'
          : isHighlighted
          ? 'ring-2 ring-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/30 scale-101 border-amber-400/70 z-20'
          : meld.isValid
          ? 'bg-emerald-950/40 border-emerald-600/40 hover:border-emerald-500/70'
          : 'bg-rose-950/60 border-rose-500/70 ring-1 ring-rose-500/50 shadow-rose-950/50'
      )}
      title="Drop tile anywhere on this meld to add and auto-sort into logical order"
    >
      {/* Show only Invalid error or Bot Move highlight indicators */}
      {(!meld.isValid || isHighlighted) && (
        <div className="flex items-center gap-1.5 pb-1 border-b border-white/10 text-xs pointer-events-none">
          {!meld.isValid && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-100 bg-rose-500/25 px-2 py-0.5 rounded-md border border-rose-400/50 shadow-sm">
              <XCircle className="w-3.5 h-3.5 text-rose-300" />
              <span className="max-w-[180px] truncate">{meld.errorReason || 'Invalid'}</span>
            </span>
          )}

          {isHighlighted && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-100 bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-400/60 animate-pulse shadow-sm">
              <Bot className="w-3.5 h-3.5 text-amber-300" />
              <span>Bot Move</span>
            </span>
          )}
        </div>
      )}

      {/* Clean Tiles Row */}
      <div className="flex items-center gap-1.5 p-0.5 overflow-x-auto">
        {meld.tiles.map((tile, idx) => (
          <TileComponent
            key={`${meld.id}_${tile.id}_${idx}`}
            tile={tile}
            isSelected={selectedTileIds.includes(tile.id)}
            isMagnifierEnabled={isMagnifierEnabled}
            onClick={() => isHumanTurn && onToggleTileSelection(tile.id)}
            source="board"
            sourceMeldId={meld.id}
            sourceIndex={idx}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
};

export const Board: React.FC<BoardProps> = ({
  melds,
  selectedTileIds,
  highlightedMeldIds = [],
  isMagnifierEnabled = false,
  onToggleTileSelection,
  onDropTile,
  isHumanTurn,
}) => {
  const [isBoardDragOver, setIsBoardDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hiddenMeldCount, setHiddenMeldCount] = useState(0);

  // Check if board content overflows and user has content below
  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const hasScrollBelow = el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 20;
    setIsScrolledUp(hasScrollBelow);

    if (hasScrollBelow) {
      // Estimate hidden melds based on average container height
      const remainingHeight = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const estHidden = Math.max(1, Math.ceil(remainingHeight / 120));
      setHiddenMeldCount(estHidden);
    } else {
      setHiddenMeldCount(0);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [melds, checkOverflow]);

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsBoardDragOver(true);
  };

  const handleBoardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBoardDragOver(false);
  };

  const handleBoardDropOnNewZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBoardDragOver(false);

    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const item: DragItem = JSON.parse(dataStr);
      onDropTile(item, {
        type: 'board-new',
      });
    } catch {
      // Ignore invalid JSON
    }
  };

  return (
    <div
      onDragOver={handleBoardDragOver}
      onDragLeave={handleBoardDragLeave}
      onDrop={handleBoardDropOnNewZone}
      className={clsx(
        'w-full flex-1 min-h-0 bg-table-felt rounded-2xl border p-4 md:p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden transition-all',
        isBoardDragOver ? 'border-amber-400/80 ring-2 ring-amber-400/30' : 'border-emerald-800/80'
      )}
    >
      {/* Background Ambient Radial Gradient */}
      <div className="absolute inset-0 bg-radial from-emerald-500/5 via-transparent to-black/40 pointer-events-none" />

      {/* Board Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-700/60 z-10 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30" />
          <h2 className="text-base font-extrabold uppercase tracking-wider text-emerald-100">
            Table Board ({melds.length} Melds)
          </h2>
        </div>
        <span className="text-sm text-emerald-200 font-medium hidden sm:inline">
          Container-level drop targets • Instant auto-reordering into logical groups & runs
        </span>
      </div>

      {/* Dense Multi-Meld Flex-Wrap Grid Container with Scroll Feedback */}
      <div
        ref={scrollRef}
        onScroll={checkOverflow}
        className="flex-1 overflow-y-auto z-10 pr-1 pb-4 min-h-[260px] scroll-smooth"
      >
        {melds.length === 0 ? (
          <div className="w-full h-56 rounded-xl border-2 border-dashed border-emerald-600/70 flex flex-col items-center justify-center text-emerald-200 transition-all hover:border-emerald-400 hover:bg-emerald-950/30 group">
            <PlusCircle className="w-12 h-12 mb-2 text-emerald-300 group-hover:scale-110 transition-all" />
            <p className="text-base font-bold text-emerald-100">Table is currently empty</p>
            <p className="text-sm text-emerald-200 font-medium mt-1.5">
              {isHumanTurn ? 'Drag tiles anywhere on the table to start a new meld' : 'Waiting for opponent move...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start content-start">
            {melds.map((meld) => (
              <MeldContainer
                key={meld.id}
                meld={meld}
                selectedTileIds={selectedTileIds}
                isHighlighted={highlightedMeldIds.includes(meld.id)}
                isMagnifierEnabled={isMagnifierEnabled}
                onToggleTileSelection={onToggleTileSelection}
                onDropTile={onDropTile}
                isHumanTurn={isHumanTurn}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Gradient Fade Overlay for Overflow Indication */}
      {isScrolledUp && (
        <div className="absolute bottom-12 inset-x-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none z-20" />
      )}

      {/* Floating Scroll Overflow Banner Indicator */}
      {isScrolledUp && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-slate-900 border border-amber-400 text-amber-200 text-sm font-extrabold shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
          <ChevronDown className="w-4 h-4 text-amber-300" />
          <span>{hiddenMeldCount} more meld(s) below — Scroll to view</span>
        </div>
      )}

      {/* Footer Drop Prompt Zone */}
      {melds.length > 0 && isHumanTurn && (
        <div
          onDragOver={handleBoardDragOver}
          onDrop={handleBoardDropOnNewZone}
          className={clsx(
            'mt-3 py-3 px-4 rounded-xl border border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer z-10',
            isBoardDragOver
              ? 'border-amber-400 bg-amber-500/25 text-amber-100 scale-102 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/50'
              : 'border-emerald-500/60 bg-emerald-950/50 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-950/70 hover:text-white'
          )}
        >
          <PlusCircle className="w-5 h-5 text-emerald-300 animate-pulse" />
          <span>Drop tile anywhere here to form a NEW table meld</span>
        </div>
      )}
    </div>
  );
};
