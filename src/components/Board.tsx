import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Meld, DragItem } from '../types/game';
import { TileComponent } from './TileComponent';
import { XCircle, Bot, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

interface BoardProps {
  melds: Meld[];
  selectedTileIds: string[];
  highlightedMeldIds?: string[];
  recentlyPlacedTileIds?: string[];
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
  recentlyPlacedTileIds?: string[];
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
  recentlyPlacedTileIds = [],
  isMagnifierEnabled = true,
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
          ? 'ring-4 ring-cyan-400 bg-cyan-950/80 shadow-2xl shadow-cyan-500/60 scale-102 border-cyan-300 z-20'
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
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-950 bg-cyan-400 px-2.5 py-0.5 rounded-md border border-cyan-200 shadow-md animate-pulse">
              <Bot className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
              <span>BOT LAST PLAY</span>
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
            isRecentlyPlaced={recentlyPlacedTileIds.includes(tile.id)}
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
  recentlyPlacedTileIds = [],
  isMagnifierEnabled = true,
  onToggleTileSelection,
  onDropTile,
  isHumanTurn,
}) => {
  const [isBoardDragOver, setIsBoardDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Real-time DOM scroll and overflow boundary calculation
  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const overflows = el.scrollHeight > el.clientHeight + 4;
    const scrollUpAvailable = el.scrollTop > 4;
    const scrollDownAvailable = el.scrollTop + el.clientHeight < el.scrollHeight - 4;

    setHasOverflow(overflows);
    setCanScrollUp(scrollUpAvailable);
    setCanScrollDown(scrollDownAvailable);
  }, []);

  // Use ResizeObserver and animation frames to ensure instant, accurate measurement after any reflow
  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkOverflow);
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Also observe the inner container if present
    const inner = el.firstElementChild;
    if (inner) {
      ro.observe(inner);
    }

    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [melds, checkOverflow]);

  const handleScrollUp = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -140, behavior: 'smooth' });
    }
  }, []);

  const handleScrollDown = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 140, behavior: 'smooth' });
    }
  }, []);

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

  // Show scroll controls whenever there are multiple melds or content overflows
  const showScrollControls = melds.length >= 2 || hasOverflow;

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

      {/* Main Board Content Row (Melds Grid + Dedicated Right-Side Scroll Arrows) */}
      <div className="flex-1 min-h-0 flex gap-3 relative z-10 overflow-hidden">
        {/* Dense Multi-Meld Flex-Wrap Grid Container with Smooth Scrolling */}
        <div
          ref={scrollRef}
          onScroll={checkOverflow}
          className="flex-1 overflow-y-auto pr-1 pb-4 min-h-[260px] scroll-smooth"
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
            <div className="flex flex-wrap gap-3.5 items-start content-start">
              {melds.map((meld) => (
                <MeldContainer
                  key={meld.id}
                  meld={meld}
                  selectedTileIds={selectedTileIds}
                  isHighlighted={highlightedMeldIds.includes(meld.id)}
                  recentlyPlacedTileIds={recentlyPlacedTileIds}
                  isMagnifierEnabled={isMagnifierEnabled}
                  onToggleTileSelection={onToggleTileSelection}
                  onDropTile={onDropTile}
                  isHumanTurn={isHumanTurn}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dedicated Right-Side Scroll Arrow Column */}
        {showScrollControls && (
          <div className="flex flex-col justify-center gap-3 flex-none z-20 select-none py-2">
            <button
              onClick={handleScrollUp}
              disabled={!canScrollUp}
              className={clsx(
                'w-12 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xl',
                canScrollUp
                  ? 'bg-slate-900 border-amber-400 text-amber-300 hover:bg-slate-800 hover:scale-105 active:scale-95 cursor-pointer shadow-amber-500/30 ring-2 ring-amber-400/40'
                  : 'bg-slate-900/40 border-slate-700 text-slate-600 cursor-not-allowed opacity-35'
              )}
              title="Scroll Up (▲)"
            >
              <ChevronUp className="w-7 h-7 stroke-[3]" />
              <span className="text-[10px] font-black uppercase tracking-wider">UP</span>
            </button>

            <button
              onClick={handleScrollDown}
              disabled={!canScrollDown}
              className={clsx(
                'w-12 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xl',
                canScrollDown
                  ? 'bg-slate-900 border-amber-400 text-amber-300 hover:bg-slate-800 hover:scale-105 active:scale-95 cursor-pointer shadow-amber-500/30 ring-2 ring-amber-400/40'
                  : 'bg-slate-900/40 border-slate-700 text-slate-600 cursor-not-allowed opacity-35'
              )}
              title="Scroll Down (▼)"
            >
              <span className="text-[10px] font-black uppercase tracking-wider">DOWN</span>
              <ChevronDown className="w-7 h-7 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
