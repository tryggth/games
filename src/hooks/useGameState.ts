import { useState, useCallback, useEffect } from 'react';
import type { Tile, Meld, Player, TurnSnapshot, GameStatus, SortMode, DragItem, HandTile } from '../types/game';
import { createTilePool, shuffleTiles, sortHandColorThenNumber } from '../engine/tilePool';
import { validateBoard, isValidMeld, calculateMeldValue, normalizeMeld, normalizeBoard } from '../engine/validator';
import { executeAiTurn } from '../engine/ai';
import { findPossibleMoves, type HintResult } from '../engine/hintSolver';
import { soundEngine } from '../engine/audio';
import confetti from 'canvas-confetti';

export interface AutoSplitLink {
  id: string;
  autoTileId: string;
  splitMeldAId: string;
  splitMeldBId: string;
  originalRackIndex: number;
}

interface CompletionResult {
  pulledTiles: Tile[];
  completedMeldTiles: Tile[];
}

function deepCopyTile(tile: Tile): Tile {
  return { ...tile };
}

function deepCopyHandTile(ht: HandTile): HandTile {
  return { tile: deepCopyTile(ht.tile), x: ht.x, y: ht.y };
}

function deepCopyMelds(melds: Meld[]): Meld[] {
  return melds.map((meld) => ({
    ...meld,
    tiles: meld.tiles.map(deepCopyTile),
  }));
}

/**
 * Ensures tiles in hand are strictly auto-sorted by color then number
 */
function createSortedHandTiles(tiles: Tile[]): HandTile[] {
  const sorted = sortHandColorThenNumber(tiles);
  return sorted.map((tile, idx) => ({
    tile: deepCopyTile(tile),
    x: idx * 48,
    y: 0,
  }));
}

function findCompletingTilesForFragment(
  fragment: Tile[],
  handTiles: HandTile[]
): CompletionResult | null {
  if (fragment.length >= 3 && isValidMeld(fragment).isValid) {
    return { pulledTiles: [], completedMeldTiles: normalizeMeld(fragment) };
  }

  const allHandTiles = handTiles.map((ht) => ht.tile);

  // Try 1-tile completions first
  for (let i = 0; i < allHandTiles.length; i++) {
    const cand = allHandTiles[i];
    const candidateSet = [...fragment, cand];
    if (isValidMeld(candidateSet).isValid) {
      return {
        pulledTiles: [cand],
        completedMeldTiles: normalizeMeld(candidateSet),
      };
    }
  }

  // Try 2-tile completions second
  for (let i = 0; i < allHandTiles.length; i++) {
    for (let j = i + 1; j < allHandTiles.length; j++) {
      const cand1 = allHandTiles[i];
      const cand2 = allHandTiles[j];
      const candidateSet = [...fragment, cand1, cand2];
      if (isValidMeld(candidateSet).isValid) {
        return {
          pulledTiles: [cand1, cand2],
          completedMeldTiles: normalizeMeld(candidateSet),
        };
      }
    }
  }

  // Try 3-tile completions third
  for (let i = 0; i < allHandTiles.length; i++) {
    for (let j = i + 1; j < allHandTiles.length; j++) {
      for (let k = j + 1; k < allHandTiles.length; k++) {
        const cand1 = allHandTiles[i];
        const cand2 = allHandTiles[j];
        const cand3 = allHandTiles[k];
        const candidateSet = [...fragment, cand1, cand2, cand3];
        if (isValidMeld(candidateSet).isValid) {
          return {
            pulledTiles: [cand1, cand2, cand3],
            completedMeldTiles: normalizeMeld(candidateSet),
          };
        }
      }
    }
  }

  return null;
}

export function useGameState() {
  const [tilePool, setTilePool] = useState<Tile[]>([]);
  const [boardMelds, setBoardMelds] = useState<Meld[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [winner, setWinner] = useState<Player | null>(null);

  const [turnSnapshot, setTurnSnapshot] = useState<TurnSnapshot | null>(null);
  const [autoSplitLinks, setAutoSplitLinks] = useState<AutoSplitLink[]>([]);

  // Event-driven bot move meld highlights state
  const [highlightedMeldIds, setHighlightedMeldIds] = useState<string[]>([]);

  // State tracking for newly drawn tile in hand
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);

  // Hint engine state
  const [hintResult, setHintResult] = useState<HintResult | null>(null);
  const [isHintOpen, setIsHintOpen] = useState<boolean>(false);

  // Toggleable Tile Magnifier Preview State
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useState<boolean>(false);

  const toggleMagnifier = useCallback(() => {
    setIsMagnifierEnabled((prev) => !prev);
  }, []);

  const clearMeldHighlights = useCallback(() => {
    setHighlightedMeldIds((prev) => (prev.length > 0 ? [] : prev));
    setDrawnTileId((prev) => (prev !== null ? null : prev));
  }, []);

  // Global mousedown event listener for immediate dismissal of bot meld highlights and drawn tile highlight
  useEffect(() => {
    if (highlightedMeldIds.length === 0 && drawnTileId === null) return;

    const handleGlobalMouseDown = () => {
      clearMeldHighlights();
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, { capture: true });
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, { capture: true });
    };
  }, [highlightedMeldIds, drawnTileId, clearMeldHighlights]);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const toggleSound = useCallback(() => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundEngine.setEnabled(nextState);
  }, [soundEnabled]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setNotification({ message, type });
    if (type === 'error') {
      soundEngine.playError();
    }
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const setHumanHandTiles = useCallback((updater: (prev: HandTile[]) => HandTile[]) => {
    setPlayers((prevPlayers) => {
      const copy = [...prevPlayers];
      if (copy[0]) {
        const nextRawHand = updater(copy[0].handTiles || []);
        const tilesOnly = nextRawHand.map((ht) => ht.tile);
        const sortedHand = createSortedHandTiles(tilesOnly);

        copy[0] = {
          ...copy[0],
          handTiles: sortedHand,
          playerRacks: [sortedHand.map((ht) => ht.tile), []],
          rack: sortedHand.map((ht) => ht.tile),
        };
      }
      return copy;
    });
  }, []);

  const startNewGame = useCallback(() => {
    clearMeldHighlights();
    const freshPool = shuffleTiles(createTilePool());

    const humanHand = freshPool.slice(0, 14);
    const aiHand = freshPool.slice(14, 28);
    const remainingPool = freshPool.slice(28);

    const initialHumanHandTiles = createSortedHandTiles(humanHand);
    const initialAiHandTiles = createSortedHandTiles(aiHand);

    const initialPlayers: Player[] = [
      {
        id: 'player_human',
        name: 'Player',
        isAi: false,
        handTiles: initialHumanHandTiles,
        playerRacks: [initialHumanHandTiles.map((ht) => ht.tile), []],
        rack: initialHumanHandTiles.map((ht) => ht.tile),
        hasInitialMeld: false,
        score: 0,
      },
      {
        id: 'player_ai_1',
        name: 'Rummikub Bot',
        isAi: true,
        handTiles: initialAiHandTiles,
        playerRacks: [initialAiHandTiles.map((ht) => ht.tile), []],
        rack: initialAiHandTiles.map((ht) => ht.tile),
        hasInitialMeld: false,
        score: 0,
      },
    ];

    setTilePool(remainingPool.map(deepCopyTile));
    setBoardMelds([]);
    setPlayers(initialPlayers);
    setActivePlayerIndex(0);
    setGameStatus('playing');
    setWinner(null);
    setSelectedTileIds([]);
    setSortMode('none');
    setAutoSplitLinks([]);
    setHighlightedMeldIds([]);
    setDrawnTileId(null);
    setHintResult(null);
    setIsHintOpen(false);

    setTurnSnapshot({
      boardMelds: [],
      handTiles: initialHumanHandTiles.map(deepCopyHandTile),
      playerRacks: [initialHumanHandTiles.map((ht) => ht.tile), []],
      playerRack: initialHumanHandTiles.map((ht) => ht.tile),
      hasInitialMeld: false,
      poolCount: remainingPool.length,
    });

    showToast('New game started! 14 tiles arranged in auto-sorted hand tray.', 'info');
  }, [showToast, clearMeldHighlights]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const activePlayer = players[activePlayerIndex] || null;
  const humanPlayer = players[0] || null;
  const isHumanTurn = activePlayer ? !activePlayer.isAi : false;

  const refreshBoardMelds = useCallback((melds: Meld[]): Meld[] => {
    return melds.map((meld) => {
      const valRes = isValidMeld(meld.tiles);
      return {
        ...meld,
        isValid: valRes.isValid,
        type: valRes.type,
        value: valRes.value,
        errorReason: valRes.errorReason,
      };
    });
  }, []);

  const toggleTileSelection = useCallback((tileId: string) => {
    clearMeldHighlights();
    soundEngine.playTileSelect();
    setSelectedTileIds((prev) =>
      prev.includes(tileId) ? prev.filter((id) => id !== tileId) : [...prev, tileId]
    );
  }, [clearMeldHighlights]);

  const clearSelection = useCallback(() => {
    setSelectedTileIds([]);
  }, []);

  const sortRack = useCallback(
    () => {
      clearMeldHighlights();
      if (!humanPlayer) return;
      const tiles = humanPlayer.handTiles.map((ht) => ht.tile);
      const sorted = createSortedHandTiles(tiles);
      setHumanHandTiles(() => sorted);
      soundEngine.playTileSelect();
    },
    [humanPlayer, setHumanHandTiles, clearMeldHighlights]
  );

  const clearToRack1 = useCallback(() => {
    sortRack();
  }, [sortRack]);

  const resetTurn = useCallback(() => {
    if (!turnSnapshot || !isHumanTurn) return;
    clearMeldHighlights();

    setBoardMelds(deepCopyMelds(turnSnapshot.boardMelds));
    setHumanHandTiles(() => turnSnapshot.handTiles.map(deepCopyHandTile));
    setSelectedTileIds([]);
    setAutoSplitLinks([]);
    soundEngine.playTileDrop();
    showToast('Turn reset to start snapshot.', 'info');
  }, [turnSnapshot, isHumanTurn, setHumanHandTiles, showToast, clearMeldHighlights]);

  const createMeldFromSelection = useCallback(() => {
    clearMeldHighlights();
    if (selectedTileIds.length < 3) {
      showToast('A meld requires at least 3 tiles.', 'error');
      return;
    }

    if (!humanPlayer) return;

    const tilesToMeld: Tile[] = [];
    humanPlayer.handTiles.forEach((ht) => {
      if (selectedTileIds.includes(ht.tile.id)) {
        tilesToMeld.push(ht.tile);
      }
    });

    boardMelds.forEach((meld) => {
      meld.tiles.forEach((t) => {
        if (selectedTileIds.includes(t.id)) {
          tilesToMeld.push(t);
        }
      });
    });

    if (tilesToMeld.length !== selectedTileIds.length) {
      showToast('Could not locate all selected tiles.', 'error');
      return;
    }

    const valRes = isValidMeld(tilesToMeld);

    setHumanHandTiles((prev) => prev.filter((ht) => !selectedTileIds.includes(ht.tile.id)));

    const updatedBoardMelds = boardMelds
      .map((meld) => ({
        ...meld,
        tiles: meld.tiles.filter((t) => !selectedTileIds.includes(t.id)),
      }))
      .filter((meld) => meld.tiles.length > 0);

    const normTiles = normalizeMeld(tilesToMeld);
    const newMeld: Meld = {
      id: `meld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tiles: normTiles,
      isValid: valRes.isValid,
      type: valRes.type,
      value: valRes.value,
      errorReason: valRes.errorReason,
    };

    setBoardMelds(refreshBoardMelds([...updatedBoardMelds, newMeld]));
    setSelectedTileIds([]);
    soundEngine.playTileDrop();

    if (!valRes.isValid) {
      showToast(`Warning: Formed meld is invalid (${valRes.errorReason}).`, 'error');
    }
  }, [selectedTileIds, humanPlayer, boardMelds, setHumanHandTiles, refreshBoardMelds, showToast, clearMeldHighlights]);

  // Drop onto Hand Tray (returns tile to auto-sorted hand)
  const handleDropTileCanvas = useCallback(
    (item: DragItem) => {
      if (!humanPlayer || !isHumanTurn) return;
      clearMeldHighlights();

      if (item.source === 'board') {
        const turnStartHandTileIds = new Set(turnSnapshot?.handTiles.map((ht) => ht.tile.id));
        const autoLink = autoSplitLinks.find((l) => l.autoTileId === item.tileId);

        if (!turnStartHandTileIds.has(item.tileId) && !autoLink) {
          soundEngine.playError();
          showToast('Cannot return board tiles to hand.', 'error');
          return;
        }

        if (autoLink) {
          const splitLinks = autoSplitLinks.filter(
            (l) => l.splitMeldAId === autoLink.splitMeldAId && l.splitMeldBId === autoLink.splitMeldBId
          );
          const autoTileIdsForThisSplit = new Set(splitLinks.map((l) => l.autoTileId));

          const autoTilesToReturn: Tile[] = [];
          boardMelds.forEach((m) => {
            if (m.id === autoLink.splitMeldAId || m.id === autoLink.splitMeldBId) {
              m.tiles.forEach((t) => {
                if (autoTileIdsForThisSplit.has(t.id) && t.id !== item.tileId) {
                  autoTilesToReturn.push(t);
                }
              });
            }
          });

          if (autoTilesToReturn.length > 0) {
            setHumanHandTiles((prev) => {
              const currentHandTiles = prev.map((ht) => ht.tile);
              return createSortedHandTiles([...currentHandTiles, ...autoTilesToReturn]);
            });
          }

          setAutoSplitLinks((prev) =>
            prev.filter((l) => !(l.splitMeldAId === autoLink.splitMeldAId && l.splitMeldBId === autoLink.splitMeldBId))
          );

          const meldA = boardMelds.find((m) => m.id === autoLink.splitMeldAId);
          const meldB = boardMelds.find((m) => m.id === autoLink.splitMeldBId);

          if (meldA || meldB) {
            const tilesA = meldA ? meldA.tiles.filter((t) => !autoTileIdsForThisSplit.has(t.id)) : [];
            const tilesB = meldB ? meldB.tiles.filter((t) => !autoTileIdsForThisSplit.has(t.id)) : [];

            const mergedTiles = normalizeMeld([...tilesA, ...tilesB]);

            if (mergedTiles.length > 0) {
              const mergedMeld: Meld = {
                id: `meld_remerged_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                tiles: mergedTiles,
                isValid: isValidMeld(mergedTiles).isValid,
                type: isValidMeld(mergedTiles).type,
                value: calculateMeldValue(mergedTiles),
              };

              const nextMelds = boardMelds
                .filter((m) => m.id !== autoLink.splitMeldAId && m.id !== autoLink.splitMeldBId)
                .concat(mergedMeld);

              setBoardMelds(refreshBoardMelds(nextMelds));
              showToast('Re-merged split melds back into single set upon returning auto-attached tile.', 'info');
            }
          }
        }
      }

      // Find tile to move
      let tileToMove: Tile | null = null;
      if (item.source === 'rack') {
        const foundHt = humanPlayer.handTiles.find((ht) => ht.tile.id === item.tileId);
        tileToMove = foundHt ? foundHt.tile : null;
      } else if (item.source === 'board' && item.sourceMeldId) {
        const sourceMeld = boardMelds.find((m) => m.id === item.sourceMeldId);
        tileToMove = sourceMeld?.tiles.find((t) => t.id === item.tileId) || null;
      }

      if (!tileToMove) return;

      if (item.source === 'board' && item.sourceMeldId) {
        const nextBoardMelds = boardMelds
          .map((m) => (m.id === item.sourceMeldId ? { ...m, tiles: m.tiles.filter((t) => t.id !== item.tileId) } : m))
          .filter((m) => m.tiles.length > 0);
        setBoardMelds(refreshBoardMelds(nextBoardMelds));
      }

      setHumanHandTiles((prev) => {
        const existing = prev.filter((ht) => ht.tile.id !== tileToMove!.id).map((ht) => ht.tile);
        return createSortedHandTiles([...existing, tileToMove!]);
      });

      soundEngine.playTileDrop();
      setSelectedTileIds([]);
    },
    [humanPlayer, isHumanTurn, boardMelds, turnSnapshot, autoSplitLinks, setHumanHandTiles, refreshBoardMelds, showToast, clearMeldHighlights]
  );

  // Drop onto board melds or new melds
  const handleDropTile = useCallback(
    (
      item: DragItem,
      targetLocation: {
        type: 'board-new' | 'board-meld' | 'rack-0' | 'rack-1' | 'rack';
        meldId?: string;
        targetIndex?: number;
      }
    ) => {
      if (!humanPlayer || !isHumanTurn) return;
      clearMeldHighlights();

      let tileToMove: Tile | null = null;

      if (item.source === 'rack') {
        const foundHt = humanPlayer.handTiles.find((ht) => ht.tile.id === item.tileId);
        tileToMove = foundHt ? foundHt.tile : null;
      } else if (item.source === 'board' && item.sourceMeldId) {
        const sourceMeld = boardMelds.find((m) => m.id === item.sourceMeldId);
        tileToMove = sourceMeld?.tiles.find((t) => t.id === item.tileId) || null;
      }

      if (!tileToMove) return;

      // Dynamic Drag Splitting & Multi-Tile Auto-Assist Engine
      if (targetLocation.type === 'board-new' && item.source === 'board' && item.sourceMeldId) {
        const sourceMeld = boardMelds.find((m) => m.id === item.sourceMeldId);
        const sourceIdx = item.sourceIndex ?? 0;

        if (sourceMeld && sourceMeld.tiles.length > 1 && sourceIdx > 0) {
          let leftPiece = sourceMeld.tiles.slice(0, sourceIdx);
          let rightPiece = sourceMeld.tiles.slice(sourceIdx);

          let currentHand = humanPlayer.handTiles.map(deepCopyHandTile);
          let newAutoLinks: AutoSplitLink[] = [];

          const leftMeldId = `meld_split_left_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const rightMeldId = `meld_split_right_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

          const completionA = findCompletingTilesForFragment(leftPiece, currentHand);
          if (!completionA) {
            soundEngine.playError();
            showToast('Invalid Split: Inadequate meld cannot be completed with tiles from hand.', 'error');
            return;
          }

          leftPiece = completionA.completedMeldTiles;
          for (const pulled of completionA.pulledTiles) {
            currentHand = currentHand.filter((ht) => ht.tile.id !== pulled.id);
            newAutoLinks.push({
              id: `link_${Date.now()}_A_${pulled.id}`,
              autoTileId: pulled.id,
              splitMeldAId: leftMeldId,
              splitMeldBId: rightMeldId,
              originalRackIndex: 0,
            });
          }

          const completionB = findCompletingTilesForFragment(rightPiece, currentHand);
          if (!completionB) {
            soundEngine.playError();
            showToast('Invalid Split: Inadequate meld cannot be completed with tiles from hand.', 'error');
            return;
          }

          rightPiece = completionB.completedMeldTiles;
          for (const pulled of completionB.pulledTiles) {
            currentHand = currentHand.filter((ht) => ht.tile.id !== pulled.id);
            newAutoLinks.push({
              id: `link_${Date.now()}_B_${pulled.id}`,
              autoTileId: pulled.id,
              splitMeldAId: leftMeldId,
              splitMeldBId: rightMeldId,
              originalRackIndex: 0,
            });
          }

          if (newAutoLinks.length > 0) {
            setHumanHandTiles(() => currentHand);
            setAutoSplitLinks((prev) => [...prev, ...newAutoLinks]);
          }

          const meld1: Meld = {
            id: leftMeldId,
            tiles: leftPiece,
            isValid: isValidMeld(leftPiece).isValid,
            type: isValidMeld(leftPiece).type,
            value: calculateMeldValue(leftPiece),
          };

          const meld2: Meld = {
            id: rightMeldId,
            tiles: rightPiece,
            isValid: isValidMeld(rightPiece).isValid,
            type: isValidMeld(rightPiece).type,
            value: calculateMeldValue(rightPiece),
          };

          const updatedBoardMelds = boardMelds
            .flatMap((m) => (m.id === item.sourceMeldId ? [meld1, meld2] : [m]))
            .filter((m) => m.tiles.length > 0);

          setBoardMelds(refreshBoardMelds(updatedBoardMelds));
          soundEngine.playTileDrop();
          setSelectedTileIds([]);

          if (newAutoLinks.length > 0) {
            showToast(
              `Auto-assisted split! Moved ${newAutoLinks.length} matching tile(s) from hand to complete 3-tile meld(s).`,
              'success'
            );
          }
          return;
        }
      }

      soundEngine.playTileDrop();

      if (targetLocation.type === 'board-new') {
        if (item.source === 'rack') {
          setHumanHandTiles((prev) => prev.filter((ht) => ht.tile.id !== tileToMove!.id));
        }

        const cleanedMelds = boardMelds
          .map((m) => (m.id === item.sourceMeldId ? { ...m, tiles: m.tiles.filter((t) => t.id !== item.tileId) } : m))
          .filter((m) => m.tiles.length > 0);

        const newMeld: Meld = {
          id: `meld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tiles: [tileToMove],
          isValid: false,
          type: 'invalid',
          value: 0,
          errorReason: 'Needs at least 3 tiles to be valid',
        };

        setBoardMelds(refreshBoardMelds([...cleanedMelds, newMeld]));
      } else if (targetLocation.type === 'board-meld' && targetLocation.meldId) {
        if (item.source === 'rack') {
          setHumanHandTiles((prev) => prev.filter((ht) => ht.tile.id !== tileToMove!.id));
        }

        const nextMelds = boardMelds
          .map((m) => {
            let tiles = m.tiles;
            if (m.id === item.sourceMeldId) {
              tiles = tiles.filter((t) => t.id !== item.tileId);
            }

            if (m.id === targetLocation.meldId) {
              const rawTiles = [...tiles, tileToMove!];
              tiles = normalizeMeld(rawTiles);
            }

            return { ...m, tiles };
          })
          .filter((m) => m.tiles.length > 0);

        setBoardMelds(refreshBoardMelds(nextMelds));
      }

      setSelectedTileIds([]);
    },
    [humanPlayer, isHumanTurn, boardMelds, turnSnapshot, autoSplitLinks, setHumanHandTiles, refreshBoardMelds, showToast, clearMeldHighlights]
  );

  const splitMeldAt = useCallback(
    (meldId: string, splitIndex: number) => {
      clearMeldHighlights();
      const targetMeld = boardMelds.find((m) => m.id === meldId);
      if (!targetMeld || splitIndex <= 0 || splitIndex >= targetMeld.tiles.length) return;

      const firstHalf = normalizeMeld(targetMeld.tiles.slice(0, splitIndex));
      const secondHalf = normalizeMeld(targetMeld.tiles.slice(splitIndex));

      const meld1: Meld = {
        id: `meld_split_1_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        tiles: firstHalf,
        isValid: isValidMeld(firstHalf).isValid,
        type: isValidMeld(firstHalf).type,
        value: calculateMeldValue(firstHalf),
      };

      const meld2: Meld = {
        id: `meld_split_2_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        tiles: secondHalf,
        isValid: isValidMeld(secondHalf).isValid,
        type: isValidMeld(secondHalf).type,
        value: calculateMeldValue(secondHalf),
      };

      const updatedMelds = boardMelds
        .flatMap((m) => (m.id === meldId ? [meld1, meld2] : [m]))
        .filter((m) => m.tiles.length > 0);

      setBoardMelds(refreshBoardMelds(updatedMelds));
      soundEngine.playTileDrop();
      showToast('Split meld into two sets.', 'info');
    },
    [boardMelds, refreshBoardMelds, showToast, clearMeldHighlights]
  );

  const getHint = useCallback(() => {
    if (!isHumanTurn || !humanPlayer) return;
    const handTiles = humanPlayer.handTiles.map((ht) => ht.tile);
    const result = findPossibleMoves(handTiles, boardMelds, humanPlayer.hasInitialMeld);
    setHintResult(result);
    setIsHintOpen(true);
    soundEngine.playTileSelect();
  }, [isHumanTurn, humanPlayer, boardMelds]);

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

  const advanceTurn = useCallback(
    (newBoard: Meld[], newPlayers: Player[], nextPool: Tile[]) => {
      const cleanBoard = deepCopyMelds(newBoard);
      const cleanPlayers = newPlayers.map((p) => ({
        ...p,
        handTiles: createSortedHandTiles(p.handTiles.map((ht) => ht.tile)),
        playerRacks: [p.handTiles.map((ht) => ht.tile), []] as [Tile[], Tile[]],
        rack: p.handTiles.map((ht) => ht.tile),
      }));

      setBoardMelds(cleanBoard);
      setPlayers(cleanPlayers);
      setTilePool(nextPool.map(deepCopyTile));
      setAutoSplitLinks([]);

      const nextIndex = (activePlayerIndex + 1) % cleanPlayers.length;
      setActivePlayerIndex(nextIndex);

      const nextPlayer = cleanPlayers[nextIndex];

      setTurnSnapshot({
        boardMelds: deepCopyMelds(cleanBoard),
        handTiles: nextPlayer.handTiles.map(deepCopyHandTile),
        playerRacks: [nextPlayer.handTiles.map((ht) => ht.tile), []],
        playerRack: nextPlayer.handTiles.map((ht) => ht.tile),
        hasInitialMeld: nextPlayer.hasInitialMeld,
        poolCount: nextPool.length,
      });

      setSelectedTileIds([]);
    },
    [activePlayerIndex]
  );

  const drawTile = useCallback(() => {
    if (!isHumanTurn || gameStatus === 'ended') return;
    clearMeldHighlights();

    if (tilePool.length === 0) {
      showToast('Tile pool is empty! Passing turn.', 'info');
      advanceTurn(turnSnapshot?.boardMelds || boardMelds, players, tilePool);
      return;
    }

    let currentHand = humanPlayer ? humanPlayer.handTiles.map((ht) => ht.tile) : [];

    const turnStartHand = turnSnapshot ? turnSnapshot.handTiles.map((ht) => ht.tile) : [];
    const currentHandTileIds = new Set(currentHand.map((t) => t.id));
    const uncommittedHandTiles = turnStartHand.filter((t) => !currentHandTileIds.has(t.id));

    currentHand = [...currentHand, ...uncommittedHandTiles];

    const drawnTile = deepCopyTile(tilePool[0]);
    const remainingPool = tilePool.slice(1);
    currentHand.push(drawnTile);

    // Track drawn tile ID for visual highlight ring and "NEW" badge
    setDrawnTileId(drawnTile.id);

    const autoArrangedHand = createSortedHandTiles(currentHand);

    const restoredBoard = turnSnapshot ? deepCopyMelds(turnSnapshot.boardMelds) : deepCopyMelds(boardMelds);

    const updatedPlayers = players.map((p, idx) =>
      idx === 0
        ? {
            ...p,
            handTiles: autoArrangedHand,
            playerRacks: [autoArrangedHand.map((ht) => ht.tile), []] as [Tile[], Tile[]],
            rack: autoArrangedHand.map((ht) => ht.tile),
          }
        : p
    );

    setAutoSplitLinks([]);
    soundEngine.playDraw();
    showToast(`You drew a tile (${drawnTile.isJoker ? 'Joker' : `${drawnTile.color} ${drawnTile.value}`}).`, 'info');

    advanceTurn(restoredBoard, updatedPlayers, remainingPool);
  }, [isHumanTurn, gameStatus, tilePool, turnSnapshot, boardMelds, players, showToast, advanceTurn, clearMeldHighlights, humanPlayer]);

  const endTurn = useCallback(() => {
    if (!isHumanTurn || !turnSnapshot || gameStatus === 'ended') return;
    clearMeldHighlights();

    const human = players[0];

    const boardValidation = validateBoard(boardMelds);
    if (!boardValidation.allValid) {
      showToast(
        `Cannot end turn: There are invalid melds on the table (${boardValidation.invalidMeldIds.length} invalid).`,
        'error'
      );
      return;
    }

    const startHandCount = turnSnapshot.handTiles.length;
    const currentHandCount = human.handTiles.length;
    const tilesPlayedCount = startHandCount - currentHandCount;

    if (tilesPlayedCount <= 0) {
      showToast('You must play at least 1 tile or Draw a tile to end turn.', 'error');
      return;
    }

    if (!human.hasInitialMeld) {
      const snapshotPoints = turnSnapshot.boardMelds.reduce((acc, m) => acc + (m.isValid ? m.value : 0), 0);
      const currentPoints = boardValidation.totalPoints;
      const turnPointsGained = currentPoints - snapshotPoints;

      if (turnPointsGained < 30) {
        showToast(
          `Initial Meld Requirement: You need at least 30 points of new melds from your rack. (You achieved ${turnPointsGained} pts).`,
          'error'
        );
        return;
      }
    }

    const normalizedBoard = normalizeBoard(boardMelds);

    const updatedPlayers = players.map((p, idx) =>
      idx === 0
        ? {
            ...p,
            handTiles: createSortedHandTiles(p.handTiles.map((ht) => ht.tile)),
            playerRacks: [p.handTiles.map((ht) => ht.tile), []] as [Tile[], Tile[]],
            rack: p.handTiles.map((ht) => ht.tile),
            hasInitialMeld: true,
          }
        : p
    );

    if (human.handTiles.length === 0) {
      setGameStatus('ended');
      setWinner({ ...human, hasInitialMeld: true });
      soundEngine.playWin();
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      showToast('🎉 CONGRATULATIONS! You emptied your hand and won the game!', 'success');
      return;
    }

    setAutoSplitLinks([]);
    soundEngine.playSuccess();
    showToast('Turn submitted successfully!', 'success');

    advanceTurn(normalizedBoard, updatedPlayers, tilePool);
  }, [isHumanTurn, turnSnapshot, gameStatus, players, boardMelds, showToast, advanceTurn, clearMeldHighlights]);

  // AI turn automation with automatic end-of-turn normalization pass & event-driven bot move meld highlights
  useEffect(() => {
    if (gameStatus !== 'playing' || isHumanTurn) return;

    const aiPlayerLocal = players[activePlayerIndex];
    if (!aiPlayerLocal || !aiPlayerLocal.isAi) return;

    setIsAiThinking(true);

    const timer = setTimeout(() => {
      const preBoardMeldMap = new Map(boardMelds.map((m) => [m.id, JSON.stringify(m.tiles.map((t) => t.id))]));

      const aiResult = executeAiTurn(aiPlayerLocal, boardMelds, tilePool);
      const normalizedAiBoard = normalizeBoard(aiResult.newBoardMelds);

      const botMeldIds: string[] = [];
      for (const meld of normalizedAiBoard) {
        const preSig = preBoardMeldMap.get(meld.id);
        const currentSig = JSON.stringify(meld.tiles.map((t) => t.id));
        if (!preSig || preSig !== currentSig) {
          botMeldIds.push(meld.id);
        }
      }

      if (botMeldIds.length > 0) {
        setHighlightedMeldIds(botMeldIds);
      }

      showToast(aiResult.message, 'info');

      const updatedPlayers = players.map((p, idx) => {
        if (idx === activePlayerIndex) {
          const playedAny = aiResult.playedTilesCount > 0;
          const aiHandTiles = createSortedHandTiles(aiResult.newAiRack);
          return {
            ...p,
            handTiles: aiHandTiles,
            playerRacks: [aiResult.newAiRack.map(deepCopyTile), []] as [Tile[], Tile[]],
            rack: aiResult.newAiRack.map(deepCopyTile),
            hasInitialMeld: p.hasInitialMeld || (playedAny && !aiResult.drewTile),
          };
        }
        return p;
      });

      const nextPool = aiResult.drewTile && tilePool.length > 0 ? tilePool.slice(1) : tilePool;

      if (aiResult.newAiRack.length === 0) {
        setGameStatus('ended');
        setWinner(updatedPlayers[activePlayerIndex]);
        soundEngine.playError();
        showToast(`🤖 ${aiPlayerLocal.name} has played all tiles and won!`, 'info');
        setIsAiThinking(false);
        return;
      }

      setIsAiThinking(false);
      advanceTurn(normalizedAiBoard, updatedPlayers, nextPool);
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameStatus, isHumanTurn, activePlayerIndex, players, boardMelds, tilePool, showToast, advanceTurn]);

  return {
    tilePool,
    boardMelds,
    players,
    humanPlayer: players[0] || null,
    aiPlayer: players[1] || null,
    activePlayer,
    activePlayerIndex,
    isHumanTurn,
    gameStatus,
    winner,
    selectedTileIds,
    notification,
    sortMode,
    isAiThinking,
    soundEnabled,
    turnSnapshot,
    autoSplitLinks,
    highlightedMeldIds,
    drawnTileId,
    hintResult,
    isHintOpen,
    isMagnifierEnabled,

    startNewGame,
    toggleSound,
    toggleMagnifier,
    toggleTileSelection,
    clearSelection,
    sortRack,
    clearToRack1,
    resetTurn,
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
