import { useState, useCallback, useEffect } from 'react';
import type { DragItem } from '../types/game';
import { soundEngine } from '../engine/audio';
import { findPossibleMoves, type HintResult } from '../engine/hintSolver';
import * as moveEngine from '../engine/moveEngine';

export interface NotificationState {
  message: string;
  type: 'info' | 'success' | 'error';
}

export function useGameState() {
  // Core single state object eliminating stale closures & useRef synchronization loops
  const [gameState, setGameState] = useState<moveEngine.CoreGameState>(() => moveEngine.initNewGame());

  // Simple UI-specific transient state
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [highlightedMeldIds, setHighlightedMeldIds] = useState<string[]>([]);
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rummikub_magnifier_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [hintResult, setHintResult] = useState<HintResult | null>(null);
  const [isHintOpen, setIsHintOpen] = useState(false);

  // Derived state helpers
  const humanPlayer = gameState.players[0] || null;
  const aiPlayer = gameState.players[1] || null;
  const activePlayer = gameState.players[gameState.activePlayerIndex] || null;
  const isHumanTurn = gameState.activePlayerIndex === 0 && gameState.gameStatus === 'playing';

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const clearMeldHighlights = useCallback(() => {
    setHighlightedMeldIds([]);
  }, []);

  const startNewGame = useCallback(() => {
    clearMeldHighlights();
    setSelectedTileIds([]);
    setDrawnTileId(null);
    setGameState(moveEngine.initNewGame());
    soundEngine.playSuccess();
    showToast('New game started! 14 tiles arranged in auto-sorted hand tray.', 'success');
  }, [clearMeldHighlights, showToast]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEngine.setEnabled(next);
      return next;
    });
  }, []);

  const toggleMagnifier = useCallback(() => {
    setIsMagnifierEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rummikub_magnifier_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleTileSelection = useCallback((tileId: string) => {
    setSelectedTileIds((prev) => {
      if (prev.includes(tileId)) {
        return prev.filter((id) => id !== tileId);
      }
      soundEngine.playTileSelect();
      return [...prev, tileId];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTileIds([]);
  }, []);

  // UI move handlers dispatching pure moveEngine state transformations
  const handleDropTile = useCallback(
    (
      item: DragItem,
      targetLocation: {
        type: 'board-new' | 'board-meld' | 'rack' | 'hand';
        meldId?: string;
        targetIndex?: number;
      }
    ) => {
      clearMeldHighlights();
      setSelectedTileIds((prev) => prev.filter((id) => id !== item.tileId));
      setGameState((prev) => {
        const result = moveEngine.executeDropTile(prev, item, targetLocation);
        if (result.soundEffect === 'drop') soundEngine.playTileDrop();
        return result.nextState;
      });
    },
    [clearMeldHighlights]
  );

  const handleDropTileCanvas = useCallback(
    (item: DragItem) => {
      handleDropTile(item, { type: 'hand' });
    },
    [handleDropTile]
  );

  const createMeldFromSelection = useCallback(() => {
    clearMeldHighlights();
    setGameState((prev) => {
      const result = moveEngine.executeCreateMeldFromSelection(prev, selectedTileIds);
      if (result.toastMessage) {
        showToast(result.toastMessage.text, result.toastMessage.type);
      }
      if (result.soundEffect === 'drop') soundEngine.playTileDrop();
      if (result.soundEffect === 'error') soundEngine.playError();
      if (result.selectedTileIds !== undefined) setSelectedTileIds(result.selectedTileIds);
      return result.nextState;
    });
  }, [clearMeldHighlights, selectedTileIds, showToast]);

  const splitMeldAt = useCallback(
    (meldId: string, splitIndex: number) => {
      clearMeldHighlights();
      setGameState((prev) => {
        const result = moveEngine.executeSplitMeldAt(prev, meldId, splitIndex);
        if (result.soundEffect === 'drop') soundEngine.playTileDrop();
        return result.nextState;
      });
    },
    [clearMeldHighlights]
  );

  const drawTile = useCallback(() => {
    clearMeldHighlights();
    setGameState((prev) => {
      const result = moveEngine.executeDrawTile(prev);
      if (result.toastMessage) {
        showToast(result.toastMessage.text, result.toastMessage.type);
      }
      if (result.soundEffect === 'draw') soundEngine.playDraw();
      if (result.drawnTileId) setDrawnTileId(result.drawnTileId);
      return result.nextState;
    });
  }, [clearMeldHighlights, showToast]);

  const endTurn = useCallback(() => {
    clearMeldHighlights();
    setGameState((prev) => {
      const result = moveEngine.executeEndTurn(prev);
      if (result.toastMessage) {
        showToast(result.toastMessage.text, result.toastMessage.type);
      }
      if (result.soundEffect === 'success') soundEngine.playSuccess();
      if (result.soundEffect === 'error') soundEngine.playError();
      if (result.soundEffect === 'win') soundEngine.playWin();
      return result.nextState;
    });
  }, [clearMeldHighlights, showToast]);

  const getHint = useCallback(() => {
    const moves = findPossibleMoves(
      humanPlayer?.hand || [],
      gameState.boardMelds,
      humanPlayer?.hasInitialMeld ?? false
    );
    setHintResult(moves);
    setIsHintOpen(true);
  }, [humanPlayer, gameState.boardMelds]);

  const closeHint = useCallback(() => {
    setIsHintOpen(false);
  }, []);

  const selectSuggestedTiles = useCallback(
    (tileIds: string[]) => {
      setSelectedTileIds(tileIds);
      soundEngine.playTileSelect();
      showToast(`Selected ${tileIds.length} suggested tile(s) in hand.`, 'info');
    },
    [showToast]
  );

  // Automated AI turn execution
  useEffect(() => {
    if (gameState.gameStatus !== 'playing' || gameState.activePlayerIndex === 0) return;

    setIsAiThinking(true);

    const timer = setTimeout(() => {
      setGameState((prev) => {
        const result = moveEngine.executeAiTurnStep(prev);
        if (result.toastMessage) {
          showToast(result.toastMessage.text, result.toastMessage.type);
        }
        if (result.soundEffect === 'error') soundEngine.playError();
        return result.nextState;
      });
      setIsAiThinking(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState.gameStatus, gameState.activePlayerIndex, showToast]);

  return {
    tilePool: gameState.tilePool,
    boardMelds: gameState.boardMelds,
    committedBoardMelds: gameState.committedBoardMelds,
    players: gameState.players,
    humanPlayer,
    aiPlayer,
    activePlayer,
    isHumanTurn,
    gameStatus: gameState.gameStatus,
    winner: gameState.winner,
    turnSnapshot: gameState.turnSnapshot,
    selectedTileIds,
    notification,
    isAiThinking,
    soundEnabled,
    highlightedMeldIds,
    drawnTileId,
    botLastMoveMessage: gameState.botLastMoveMessage,
    debugLog: gameState.debugLog,
    hintResult,
    isHintOpen,
    isMagnifierEnabled,
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
  };
}
