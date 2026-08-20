import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Tile, TileColor, DragItem } from '../types/game';
import { Sparkles, Bot } from 'lucide-react';
import { clsx } from 'clsx';

interface TileComponentProps {
  tile: Tile;
  isSelected?: boolean;
  isRecentlyPlaced?: boolean;
  isDrawnTile?: boolean;
  isMagnifierEnabled?: boolean;
  onClick?: () => void;
  source: 'rack' | 'board';
  sourceMeldId?: string;
  sourceIndex?: number;
  size?: 'sm' | 'md' | 'lg';
  onDropOnTile?: (e: React.DragEvent) => void;
}

const colorStyles: Record<TileColor, { text: string; bg: string; border: string }> = {
  red: {
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  black: {
    text: 'text-slate-900 font-extrabold',
    bg: 'bg-slate-900/10',
    border: 'border-slate-800/30',
  },
  yellow: {
    text: 'text-orange-500 font-black',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
};

export const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  isSelected = false,
  isRecentlyPlaced = false,
  isDrawnTile = false,
  isMagnifierEnabled = false,
  onClick,
  source,
  sourceMeldId,
  sourceIndex,
  size = 'md',
  onDropOnTile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    setHoverPos(null);
    const item: DragItem = {
      tileId: tile.id,
      source,
      sourceMeldId,
      sourceIndex,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

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
    setIsDragOver(false);
    if (onDropOnTile) {
      onDropOnTile(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMagnifierEnabled) {
      setHoverPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  // sm is 2/3 of md (31px x 44px vs 46px x 66px)
  const sizeClasses = {
    sm: 'w-[31px] h-[44px] text-base rounded-md p-0.5',
    md: 'w-11.5 h-16.5 text-2xl rounded-lg p-1',
    lg: 'w-14.5 h-20.5 text-3xl rounded-xl p-1.5',
  }[size];

  const colorConfig = colorStyles[tile.color];

  // Render floating magnifier portal attached directly to document.body to avoid transform/overflow trapping
  const renderMagnifierPortal = () => {
    if (!isMagnifierEnabled || !hoverPos || typeof document === 'undefined') return null;

    const popupWidth = 100;
    const popupHeight = 140;
    const padding = 16;

    let x = hoverPos.x + 24;
    let y = hoverPos.y + 24;

    // Viewport edge detection and flipping
    if (x + popupWidth > window.innerWidth - padding) {
      x = hoverPos.x - popupWidth - 16;
    }
    if (y + popupHeight > window.innerHeight - padding) {
      y = hoverPos.y - popupHeight - 16;
    }

    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return createPortal(
      <div
        style={{
          position: 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          zIndex: 9999,
        }}
        className={clsx(
          'w-24 h-34 rounded-2xl p-2.5 bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 border-2 border-amber-400 shadow-2xl ring-4 ring-amber-400/70 flex flex-col items-center justify-between pointer-events-none animate-fade-in',
          colorConfig.text
        )}
      >
        <div className="w-full flex items-center justify-between px-1">
          <span
            className={clsx(
              'w-3.5 h-3.5 rounded-full shadow-sm',
              tile.color === 'red' && 'bg-red-500',
              tile.color === 'blue' && 'bg-blue-500',
              tile.color === 'black' && 'bg-slate-900',
              tile.color === 'yellow' && 'bg-orange-500'
            )}
          />
          <span
            className={clsx(
              'w-3.5 h-3.5 rounded-full shadow-sm opacity-30',
              tile.color === 'red' && 'bg-red-500',
              tile.color === 'blue' && 'bg-blue-500',
              tile.color === 'black' && 'bg-slate-900',
              tile.color === 'yellow' && 'bg-orange-500'
            )}
          />
        </div>

        <div className="flex-1 flex items-center justify-center font-extrabold text-4xl">
          {tile.isJoker ? (
            <div className="flex flex-col items-center text-amber-600">
              <Sparkles className="w-8 h-8" />
              <span className="text-xs font-bold uppercase tracking-wider mt-1">JOKER</span>
            </div>
          ) : (
            <span className="drop-shadow-md">{tile.value}</span>
          )}
        </div>

        <div className="w-full h-1.5 rounded-full opacity-30 bg-slate-900" />
      </div>,
      document.body
    );
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        className={clsx(
          'relative select-none flex flex-col items-center justify-between cursor-grab active:cursor-grabbing',
          'bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 border border-amber-300/80',
          'tile-shadow tile-hover transition-all duration-150 transform',
          sizeClasses,
          isSelected &&
            (source === 'rack'
              ? 'tile-selected -translate-y-2 ring-2 ring-amber-400 z-10'
              : 'ring-2 ring-amber-400 z-10'),
          isDrawnTile &&
            'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105 z-20 shadow-xl shadow-amber-500/50 animate-pulse',
          isRecentlyPlaced &&
            'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse scale-105 z-20 shadow-xl shadow-cyan-500/60',
          isDragOver && 'ring-4 ring-amber-500 scale-105 z-20 shadow-amber-500/50',
          colorConfig.text
        )}
      >
        {/* Drawn Tile Highlight "NEW" Badge */}
        {isDrawnTile && (
          <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-extrabold px-1.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce z-30">
            NEW
          </span>
        )}

        {/* Bot Placement Highlight Badge */}
        {isRecentlyPlaced && (
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 text-slate-950 rounded-full font-bold text-[11px] flex items-center justify-center shadow-lg animate-bounce border border-cyan-300 z-30">
            <Bot className="w-2.5 h-2.5" />
          </span>
        )}

        {/* Visual Drop Insertion Line Indicator */}
        {isDragOver && (
          <div className="absolute -left-1 top-0 bottom-0 w-1 bg-amber-500 rounded-full animate-pulse z-30" />
        )}

        <div className="w-full flex items-center justify-between px-0.5 pt-0.5">
          <span
            className={clsx(
              size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
              'rounded-full',
              tile.color === 'red' && 'bg-red-500',
              tile.color === 'blue' && 'bg-blue-500',
              tile.color === 'black' && 'bg-slate-900',
              tile.color === 'yellow' && 'bg-orange-500'
            )}
          />
          <span
            className={clsx(
              size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
              'rounded-full opacity-25',
              tile.color === 'red' && 'bg-red-500',
              tile.color === 'blue' && 'bg-blue-500',
              tile.color === 'black' && 'bg-slate-900',
              tile.color === 'yellow' && 'bg-orange-500'
            )}
          />
        </div>

        <div className="flex-1 flex items-center justify-center font-black tracking-tight">
          {tile.isJoker ? (
            <div className="flex flex-col items-center text-amber-600 animate-pulse">
              <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-5 h-5'} />
              <span className={clsx(size === 'sm' ? 'text-[8px]' : 'text-sm', 'uppercase font-bold')}>Joker</span>
            </div>
          ) : (
            <span className="drop-shadow-sm">{tile.value}</span>
          )}
        </div>

        <div className={clsx(size === 'sm' ? 'h-0.5' : 'h-1', 'w-full rounded-full opacity-20 bg-slate-900 mb-0.5')} />
      </div>

      {/* 2x Magnifier Floating Portal Attached to Document Body */}
      {renderMagnifierPortal()}
    </>
  );
};
