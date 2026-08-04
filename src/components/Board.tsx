import React, { useState, useRef, useEffect } from 'react';
import type { Meld, DragItem } from '../types/game';
import { TileComponent } from './TileComponent';
import { CheckCircle2, XCircle, PlusCircle, Bot, ChevronDown, Lock } from 'lucide-react';
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
      type: 'board-new' | 'board-meld' | 'rack-0' | 'rack-1' | 'rack';
      meldId?: string;
      targetIndex?: number;
    }
  ) => void;
  onSplitMeld: (meldId: string, splitIndex: number) => void;
  isHumanTurn: boolean;
}

/**
 * Single Unified Meld Container Component
 */
const MeldContainer: React.FC<{
  meld: Meld;
  selectedTileIds: string[];
  isHighlighted?: boolean;
  isMagnifierEnabled?: boolean;
  onToggleTileSelection: (tileId: string) => void;
  onDropTile: BoardProps['onDropTile'];
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
    if (!isHumanTurn) return;
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
    if (!isHumanTurn) return;
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
        'relative p-3 rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-lg flex flex-col gap-2.5 select-none cursor-pointer',
        isDragOver
          ? 'bg-amber-950/70 border-amber-400 ring-4 ring-amber-400/80 shadow-2xl shadow-amber-500/50 scale-102 z-30'
          : isHighlighted
          ? 'ring-2 ring-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/30 scale-101 border-amber-400/60 z-20'
          : meld.isValid
          ? 'bg-emerald-950/40 border-emerald-600/50 shadow-emerald-950/50 ring-1 ring-emerald-500/20'
          : 'bg-rose-950/50 border-rose-600/60 ring-1 ring-rose-500/40 shadow-rose-950/50'
      )}
      title="Drop tile anywhere on this meld to add and auto-sort into logical order"
    >
      {/* Compact Meld Status Badge & Bot Move Highlight Indicator */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-xs pointer-events-none">
        <div className="flex items-center gap-1.5">
          {meld.isValid ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>
                {meld.type.toUpperCase()} ({meld.value} pts)
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span className="max-w-[150px] truncate">{meld.errorReason || 'Invalid'}</span>
            </span>
          )}

          {meld.isCommitted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded-md border border-cyan-500/30">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>Locked Meld</span>
            </span>
          )}

          {isHighlighted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/40 animate-pulse">
              <Bot className="w-3 h-3 text-amber-400" />
              <span>Bot Move</span>
            </span>
          )}
        </div>
      </div>

      {/* Clean Tiles Row */}
      <div className="flex items-center gap-1.5 p-1 overflow-x-auto">
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
            size="md"
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
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hiddenMeldCount, setHiddenMeldCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Check scroll & overflow boundaries
  const checkOverflow = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isOverflowing = scrollHeight > clientHeight + 10;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 20;
    setIsScrolledUp(isOverflowing && !isBottom);

    // Approximate hidden meld count below fold
    if (isOverflowing && !isBottom) {
      const pixelsRemaining = scrollHeight - (scrollTop + clientHeight);
      const estCount = Math.max(1, Math.ceil(pixelsRemaining / 120));
      setHiddenMeldCount(estCount);
    } else {
      setHiddenMeldCount(0);
    }
  };

  useEffect(() => {
    checkOverflow();
  }, [melds]);

  // Auto-scroll container to bring newly added or modified melds into view
  useEffect(() => {
    if (scrollRef.current && melds.length > 0) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [melds.length, highlightedMeldIds]);

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsBoardDragOver(true);
  };

  const handleBoardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBoardDragOver(false);
  };

  const handleBoardDropOnNewZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBoardDragOver(false);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    try {
      const item: DragItem = JSON.parse(dataStr);
      onDropTile(item, { type: 'board-new' });
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
        isBoardDragOver ? 'border-amber-400/80 ring-2 ring-amber-400/30' : 'border-emerald-900/60'
      )}
    >
      {/* Background Ambient Radial Gradient */}
      <div className="absolute inset-0 bg-radial from-emerald-500/5 via-transparent to-black/40 pointer-events-none" />

      {/* Board Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40 z-10 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-200/90">
            Table Board ({melds.length} Melds)
          </h2>
        </div>
        <span className="text-xs text-emerald-300/60 font-mono hidden sm:inline">
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
          <div className="w-full h-56 rounded-xl border-2 border-dashed border-emerald-700/50 flex flex-col items-center justify-center text-emerald-300/60 transition-all hover:border-emerald-500/80 hover:bg-emerald-950/20 group">
            <PlusCircle className="w-10 h-10 mb-2 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-emerald-400" />
            <p className="text-sm font-medium">Table is currently empty</p>
            <p className="text-xs opacity-70 mt-1">
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
        <div className="absolute bottom-12 inset-x-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20" />
      )}

      {/* Floating Scroll Overflow Banner Indicator */}
      {isScrolledUp && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-1.5 animate-bounce pointer-events-none">
          <ChevronDown className="w-4 h-4 text-amber-400" />
          <span>{hiddenMeldCount} more meld(s) below — Scroll to view</span>
        </div>
      )}

      {/* Footer Drop Prompt Zone */}
      {melds.length > 0 && isHumanTurn && (
        <div
          onDragOver={handleBoardDragOver}
          onDrop={handleBoardDropOnNewZone}
          className={clsx(
            'mt-3 py-2.5 px-4 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer z-10',
            isBoardDragOver
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 scale-102 shadow-lg shadow-amber-500/30'
              : 'border-emerald-600/40 bg-emerald-950/30 text-emerald-300/80 hover:border-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-100'
          )}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Drop tile anywhere here to form a NEW table meld</span>
        </div>
      )}
    </div>
  );
};
