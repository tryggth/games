import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { usePwaInstall } from './hooks/usePwaInstall';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
import { TurnControls } from './components/TurnControls';
import { RulesModal } from './components/RulesModal';
import { WinnerModal } from './components/WinnerModal';
import { HintModal } from './components/HintModal';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { clsx } from 'clsx';

export function App() {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const { installPwa } = usePwaInstall();

  const {
    tilePool,
    boardMelds,
    humanPlayer,
    aiPlayer,
    activePlayer,
    isHumanTurn,
    winner,
    selectedTileIds,
    notification,
    isAiThinking,
    soundEnabled,
    highlightedMeldIds,
    drawnTileId,
    botLastMoveMessage,
    debugLog,
    hintResult,
    isHintOpen,
    isMagnifierEnabled,
    turnSnapshot,
    startNewGame,
    toggleSound,
    toggleMagnifier,
    toggleTileSelection,
    clearSelection,
    createMeldFromSelection,
    handleDropTile,
    handleDropTileCanvas,
    splitMeldAt,
    drawTile,
    endTurn,
    getHint,
    closeHint,
    selectSuggestedTiles,
  } = useGameState();

  const tilesPlayedCount = turnSnapshot
    ? turnSnapshot.hand.length - (humanPlayer?.hand?.length || 0)
    : 0;

  const isBoardValid = boardMelds.every((m) => m.isValid);

  const snapshotPoints = turnSnapshot
    ? turnSnapshot.boardMelds.reduce((acc, m) => acc + (m.isValid ? m.value : 0), 0)
    : 0;

  const currentPoints = boardMelds.reduce((acc, m) => acc + (m.isValid ? m.value : 0), 0);
  const turnPointsGained = currentPoints - snapshotPoints;

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={clsx(
            'fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 transition-all animate-bounce',
            notification.type === 'error' && 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-950/50',
            notification.type === 'success' && 'bg-emerald-950/90 border-emerald-600 text-emerald-200 shadow-emerald-950/50',
            notification.type === 'info' && 'bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-slate-950/50'
          )}
        >
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-amber-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Bar (fixed-none) */}
      <Header
        poolCount={tilePool.length}
        activePlayer={activePlayer}
        humanPlayer={humanPlayer}
        aiPlayer={aiPlayer}
        isHumanTurn={isHumanTurn}
        soundEnabled={soundEnabled}
        isMagnifierEnabled={isMagnifierEnabled}
        botLastMoveMessage={botLastMoveMessage}
        onToggleSound={toggleSound}
        onToggleMagnifier={toggleMagnifier}
        onOpenRules={() => setIsRulesOpen(true)}
        onRestartGame={startNewGame}
        onGetHint={getHint}
        onInstallApp={installPwa}
      />

      {/* Main Responsive Viewport Workspace (No Window Scrollbars) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-2.5 md:p-4 flex flex-col gap-2.5 md:gap-3 overflow-hidden">
        {/* Table Board Area (flex-1 dynamically takes remaining height) */}
        <Board
          melds={boardMelds}
          selectedTileIds={selectedTileIds}
          highlightedMeldIds={highlightedMeldIds}
          isMagnifierEnabled={isMagnifierEnabled}
          onToggleTileSelection={toggleTileSelection}
          onDropTile={handleDropTile}
          onSplitMeld={splitMeldAt}
          isHumanTurn={isHumanTurn}
        />

        {/* Always Auto-Sorted Player Hand Tray */}
        <Hand
          humanPlayer={humanPlayer}
          selectedTileIds={selectedTileIds}
          drawnTileId={drawnTileId}
          isMagnifierEnabled={isMagnifierEnabled}
          onToggleTileSelection={toggleTileSelection}
          onClearSelection={clearSelection}
          onCreateMeldFromSelection={createMeldFromSelection}
          onDropTileCanvas={handleDropTileCanvas}
          isHumanTurn={isHumanTurn}
        />

        {/* Turn Action Bar */}
        <TurnControls
          isHumanTurn={isHumanTurn}
          isAiThinking={isAiThinking}
          tilesPlayedCount={tilesPlayedCount}
          isBoardValid={isBoardValid}
          turnPointsGained={turnPointsGained}
          hasInitialMeld={humanPlayer?.hasInitialMeld ?? false}
          onEndTurn={endTurn}
          onDrawTile={drawTile}
          poolCount={tilePool.length}
        />
      </main>

      {/* Debug Diagnostic Status Bar */}
      <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-1 flex items-center justify-between text-[11px] font-mono text-slate-400 z-40">
        <span className="truncate max-w-[70%]">🔍 {debugLog}</span>
        <span className="text-amber-300">Board Melds: {boardMelds.length} | Hand: {humanPlayer?.hand?.length || 0} tiles</span>
      </div>

      {/* Move Suggestions Hint Modal */}
      <HintModal
        isOpen={isHintOpen}
        onClose={closeHint}
        hintResult={hintResult}
        onSelectSuggestedTiles={selectSuggestedTiles}
      />

      {/* Interactive Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Celebration Winner Modal */}
      <WinnerModal winner={winner} onPlayAgain={startNewGame} />
    </div>
  );
}

export default App;
