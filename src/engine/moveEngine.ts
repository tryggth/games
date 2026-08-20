import type { Tile, Meld, Player, TurnSnapshot, GameStatus, DragItem } from '../types/game';
import { generateTilePool, createTilePool, deepCopyTile, deepCopyMelds } from './tilePool';
import { isValidMeld, normalizeMeld, normalizeBoard, validateBoard } from './validator';
import { executeAiTurn } from './ai';

export interface CoreGameState {
  tilePool: Tile[];
  boardMelds: Meld[];
  committedBoardMelds: Meld[];
  players: Player[];
  activePlayerIndex: number;
  gameStatus: GameStatus;
  winner: Player | null;
  turnSnapshot: TurnSnapshot | null;
  autoSplitLinks: Array<{ fromId: string; toId: string }>;
  botLastMoveMessage: string | null;
  debugLog: string;
}

export interface MoveResult {
  nextState: CoreGameState;
  soundEffect?: 'draw' | 'drop' | 'success' | 'error' | 'win';
  toastMessage?: { text: string; type: 'info' | 'success' | 'error' };
  drawnTileId?: string;
  selectedTileIds?: string[];
}

export interface TileConservationCheck {
  valid: boolean;
  total: number;
  duplicates: string[];
  missingCount: number;
}

/**
 * Pure helper to sort hand tiles into logical groups/runs (by color, then value).
 */
export function createSortedHand(tiles: Tile[]): Tile[] {
  const colorOrder: Record<string, number> = { red: 0, blue: 1, black: 2, yellow: 3 };
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.color !== b.color) return colorOrder[a.color] - colorOrder[b.color];
    return a.value - b.value;
  });
}

/**
 * Verifies tile conservation: ensures all 106 canonical tiles exist exactly once across
 * the draw pool, player hands, and table board melds (2 of each color 1-13 + 2 Jokers).
 */
export function verifyTileConservation(state: CoreGameState): TileConservationCheck {
  const canonicalPool = createTilePool();
  const canonicalMap = new Map(canonicalPool.map((t) => [t.id, t]));

  const allActiveTiles: Tile[] = [
    ...state.tilePool,
    ...state.players.flatMap((p) => p.hand),
    ...state.boardMelds.flatMap((m) => m.tiles),
  ];

  const seenIds = new Map<string, number>();
  const duplicates: string[] = [];

  for (const t of allActiveTiles) {
    const count = (seenIds.get(t.id) || 0) + 1;
    seenIds.set(t.id, count);
    if (count === 2) {
      duplicates.push(t.id);
    }
  }

  let missingCount = 0;
  for (const canonicalId of canonicalMap.keys()) {
    if (!seenIds.has(canonicalId)) {
      missingCount++;
    }
  }

  return {
    valid: allActiveTiles.length === 106 && duplicates.length === 0 && missingCount === 0,
    total: allActiveTiles.length,
    duplicates,
    missingCount,
  };
}

/**
 * Authoritative Tile Conservation Guard & Sanitizer.
 * Enforces that no duplicates exist and no tiles are lost across state transitions.
 */
export function sanitizeTileConservation(state: CoreGameState): CoreGameState {
  const canonicalPool = createTilePool();
  const canonicalMap = new Map(canonicalPool.map((t) => [t.id, t]));
  const seenTileIds = new Set<string>();

  // 1. Sanitize table board melds (keep first occurrence of any tile ID)
  const cleanBoardMelds: Meld[] = state.boardMelds.map((m) => {
    const uniqueTiles: Tile[] = [];
    for (const t of m.tiles) {
      if (!seenTileIds.has(t.id) && canonicalMap.has(t.id)) {
        seenTileIds.add(t.id);
        uniqueTiles.push(deepCopyTile(t));
      }
    }
    const norm = normalizeMeld(uniqueTiles);
    const val = isValidMeld(norm);
    return {
      ...m,
      tiles: norm,
      isValid: val.isValid,
      type: val.type,
      value: val.value,
      errorReason: val.errorReason,
    };
  }).filter((m) => m.tiles.length > 0);

  // 2. Sanitize player hands (deduping any phantom duplicates)
  const cleanPlayers: Player[] = state.players.map((p) => {
    const uniqueHand: Tile[] = [];
    for (const t of p.hand) {
      if (!seenTileIds.has(t.id) && canonicalMap.has(t.id)) {
        seenTileIds.add(t.id);
        uniqueHand.push(deepCopyTile(t));
      }
    }
    return {
      ...p,
      hand: createSortedHand(uniqueHand),
    };
  });

  // 3. Sanitize draw pool (deduping against board and hands)
  const cleanPool: Tile[] = [];
  for (const t of state.tilePool) {
    if (!seenTileIds.has(t.id) && canonicalMap.has(t.id)) {
      seenTileIds.add(t.id);
      cleanPool.push(deepCopyTile(t));
    }
  }

  // 4. Return any missing canonical tiles back to the pool
  for (const [canonId, canonTile] of canonicalMap.entries()) {
    if (!seenTileIds.has(canonId)) {
      seenTileIds.add(canonId);
      cleanPool.push(deepCopyTile(canonTile));
    }
  }

  return {
    ...state,
    boardMelds: cleanBoardMelds,
    players: cleanPlayers,
    tilePool: cleanPool,
  };
}

/**
 * Initializes a new game state.
 */
export function initNewGame(): CoreGameState {
  const fullPool = generateTilePool();
  const humanHand = createSortedHand(fullPool.slice(0, 14).map(deepCopyTile));
  const aiHand = createSortedHand(fullPool.slice(14, 28).map(deepCopyTile));
  const remainingPool = fullPool.slice(28).map(deepCopyTile);

  const humanPlayer: Player = {
    id: 'player_human',
    name: 'Player',
    isAi: false,
    hand: humanHand,
    hasInitialMeld: false,
    score: 0,
  };

  const aiPlayer: Player = {
    id: 'player_ai_1',
    name: 'Rummikub Bot',
    isAi: true,
    hand: aiHand,
    hasInitialMeld: false,
    score: 0,
  };

  const initialPlayers = [humanPlayer, aiPlayer];

  const snapshot: TurnSnapshot = {
    boardMelds: [],
    hand: humanHand.map(deepCopyTile),
    hasInitialMeld: false,
    poolCount: remainingPool.length,
  };

  return {
    tilePool: remainingPool,
    boardMelds: [],
    committedBoardMelds: [],
    players: initialPlayers,
    activePlayerIndex: 0,
    gameStatus: 'playing',
    winner: null,
    turnSnapshot: snapshot,
    autoSplitLinks: [],
    botLastMoveMessage: null,
    debugLog: 'Game started. 14 tiles dealt to each player.',
  };
}

/**
 * Pure turn advancement engine function.
 */
export function advanceTurn(
  state: CoreGameState,
  newBoard: Meld[],
  newPlayers: Player[],
  nextPool: Tile[],
  isCommittedSubmit: boolean = false
): CoreGameState {
  const cleanBoard = deepCopyMelds(newBoard).map((m) =>
    isCommittedSubmit && m.isValid ? { ...m, isCommitted: true } : m
  );

  const cleanPlayers = newPlayers.map((p) => ({
    ...p,
    hand: createSortedHand(p.hand.map(deepCopyTile)),
  }));

  const nextCommittedBoard = isCommittedSubmit ? deepCopyMelds(cleanBoard) : state.committedBoardMelds;

  const nextIndex = (state.activePlayerIndex + 1) % cleanPlayers.length;
  const nextPlayer = cleanPlayers[nextIndex];

  const newSnapshot: TurnSnapshot = {
    boardMelds: deepCopyMelds(cleanBoard),
    hand: nextPlayer.hand.map(deepCopyTile),
    hasInitialMeld: nextPlayer.hasInitialMeld,
    poolCount: nextPool.length,
  };

  const logMsg = `Advanced turn to ${nextPlayer.name} (Index: ${nextIndex}). Board Melds: ${cleanBoard.length}.`;

  const rawNextState: CoreGameState = {
    ...state,
    tilePool: nextPool.map(deepCopyTile),
    boardMelds: cleanBoard,
    committedBoardMelds: nextCommittedBoard,
    players: cleanPlayers,
    activePlayerIndex: nextIndex,
    turnSnapshot: newSnapshot,
    autoSplitLinks: [],
    debugLog: logMsg,
  };

  return sanitizeTileConservation(rawNextState);
}

/**
 * Pure handler for tile drop operations.
 */
export function executeDropTile(
  state: CoreGameState,
  item: DragItem,
  targetLocation: {
    type: 'board-new' | 'board-meld' | 'rack' | 'hand';
    meldId?: string;
    targetIndex?: number;
  }
): MoveResult {
  if (state.activePlayerIndex !== 0 || state.gameStatus === 'ended') {
    return { nextState: state };
  }

  const human = state.players[0];
  let currentHand = [...human.hand];
  let currentBoard = deepCopyMelds(state.boardMelds);
  let movedTile: Tile | null = null;

  // Step 1: Remove tile from source location
  if (item.source === 'rack' || item.source === ('hand' as any)) {
    const idx = currentHand.findIndex((t) => t.id === item.tileId);
    if (idx !== -1) {
      movedTile = currentHand[idx];
      currentHand.splice(idx, 1);
    }
  } else if (item.source === 'board' && item.sourceMeldId) {
    const sourceMeldIdx = currentBoard.findIndex((m) => m.id === item.sourceMeldId);
    if (sourceMeldIdx !== -1) {
      const sourceMeld = currentBoard[sourceMeldIdx];
      const tileIdx = sourceMeld.tiles.findIndex((t) => t.id === item.tileId);
      if (tileIdx !== -1) {
        movedTile = sourceMeld.tiles[tileIdx];

        // RULE: Once a tile is committed to the table from a previous turn, it can NEVER be moved to the private hand tray
        if (targetLocation.type === 'rack' || targetLocation.type === 'hand') {
          const turnStartHand = state.turnSnapshot ? state.turnSnapshot.hand : human.hand;
          const isFromTurnStartHand = turnStartHand.some((t) => t.id === item.tileId);
          if (!isFromTurnStartHand) {
            return {
              nextState: state,
              soundEffect: 'error',
              toastMessage: { text: 'Table tiles from previous turns cannot be returned to your hand tray.', type: 'error' },
            };
          }
        }

        sourceMeld.tiles.splice(tileIdx, 1);

        // Update validity of remaining source meld
        const valRes = isValidMeld(sourceMeld.tiles);
        sourceMeld.isValid = valRes.isValid;
        sourceMeld.type = valRes.type;
        sourceMeld.value = valRes.value;
        sourceMeld.errorReason = valRes.errorReason;
      }
    }
  }

  if (!movedTile) {
    return { nextState: state };
  }

  // Step 2: Add tile to target location
  if (targetLocation.type === 'board-new') {
    const newMeld: Meld = {
      id: `meld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tiles: [movedTile],
      isValid: false,
      type: 'invalid',
      value: 0,
      errorReason: 'A meld requires at least 3 tiles',
    };
    currentBoard.push(newMeld);
  } else if (targetLocation.type === 'board-meld' && targetLocation.meldId) {
    const targetMeldIdx = currentBoard.findIndex((m) => m.id === targetLocation.meldId);
    if (targetMeldIdx !== -1) {
      const targetMeld = currentBoard[targetMeldIdx];
      targetMeld.tiles.push(movedTile);
      targetMeld.tiles = normalizeMeld(targetMeld.tiles);
      const valRes = isValidMeld(targetMeld.tiles);
      targetMeld.isValid = valRes.isValid;
      targetMeld.type = valRes.type;
      targetMeld.value = valRes.value;
      targetMeld.errorReason = valRes.errorReason;
    } else {
      currentHand.push(movedTile);
    }
  } else if (targetLocation.type === 'rack' || targetLocation.type === 'hand') {
    currentHand.push(movedTile);
  }

  // Step 3: Cleanup empty melds from board
  currentBoard = currentBoard.filter((m) => m.tiles.length > 0);

  const updatedPlayers = state.players.map((p, idx) =>
    idx === 0 ? { ...p, hand: createSortedHand(currentHand) } : p
  );

  const sanitized = sanitizeTileConservation({
    ...state,
    boardMelds: currentBoard,
    players: updatedPlayers,
  });

  return {
    nextState: sanitized,
    soundEffect: 'drop',
  };
}

/**
 * Pure handler to create a new meld from selected tiles.
 */
export function executeCreateMeldFromSelection(
  state: CoreGameState,
  selectedTileIds: string[]
): MoveResult {
  if (selectedTileIds.length < 3) {
    return {
      nextState: state,
      soundEffect: 'error',
      toastMessage: { text: 'A meld requires at least 3 tiles.', type: 'error' },
    };
  }

  const human = state.players[0];
  let currentHand = [...human.hand];
  let currentBoard = deepCopyMelds(state.boardMelds);
  const selectedTiles: Tile[] = [];

  // Gather selected tiles from hand
  currentHand = currentHand.filter((t) => {
    if (selectedTileIds.includes(t.id)) {
      selectedTiles.push(t);
      return false;
    }
    return true;
  });

  // Gather selected tiles from board melds
  currentBoard.forEach((meld) => {
    meld.tiles = meld.tiles.filter((t) => {
      if (selectedTileIds.includes(t.id)) {
        selectedTiles.push(t);
        return false;
      }
      return true;
    });
  });

  // Clean up empty melds
  currentBoard = currentBoard.filter((m) => m.tiles.length > 0);

  // Validate the new meld
  const normTiles = normalizeMeld(selectedTiles);
  const valRes = isValidMeld(normTiles);
  const newMeld: Meld = {
    id: `meld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tiles: normTiles,
    isValid: valRes.isValid,
    type: valRes.type,
    value: valRes.value,
    errorReason: valRes.errorReason,
  };

  currentBoard.push(newMeld);

  const updatedPlayers = state.players.map((p, idx) =>
    idx === 0 ? { ...p, hand: createSortedHand(currentHand) } : p
  );

  const sanitized = sanitizeTileConservation({
    ...state,
    boardMelds: currentBoard,
    players: updatedPlayers,
  });

  return {
    nextState: sanitized,
    soundEffect: 'drop',
    selectedTileIds: [],
  };
}

/**
 * Pure handler to split an existing meld at a specific index.
 */
export function executeSplitMeldAt(
  state: CoreGameState,
  meldId: string,
  splitIndex: number
): MoveResult {
  const currentBoard = deepCopyMelds(state.boardMelds);
  const targetIdx = currentBoard.findIndex((m) => m.id === meldId);

  if (targetIdx === -1) return { nextState: state };

  const target = currentBoard[targetIdx];
  if (splitIndex <= 0 || splitIndex >= target.tiles.length) return { nextState: state };

  const leftTiles = target.tiles.slice(0, splitIndex);
  const rightTiles = target.tiles.slice(splitIndex);

  const leftVal = isValidMeld(leftTiles);
  const rightVal = isValidMeld(rightTiles);

  const leftMeld: Meld = {
    id: target.id,
    tiles: leftTiles,
    isValid: leftVal.isValid,
    type: leftVal.type,
    value: leftVal.value,
    errorReason: leftVal.errorReason,
  };

  const rightMeld: Meld = {
    id: `meld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tiles: rightTiles,
    isValid: rightVal.isValid,
    type: rightVal.type,
    value: rightVal.value,
    errorReason: rightVal.errorReason,
  };

  currentBoard.splice(targetIdx, 1, leftMeld, rightMeld);

  const sanitized = sanitizeTileConservation({
    ...state,
    boardMelds: currentBoard,
  });

  return {
    nextState: sanitized,
    soundEffect: 'drop',
  };
}

/**
 * Pure handler for player drawing a tile.
 * Restores board to committedBoardMelds, reverts hand to turn start snapshot, and adds 1 drawn tile.
 */
export function executeDrawTile(state: CoreGameState): MoveResult {
  if (state.activePlayerIndex !== 0 || state.gameStatus === 'ended') {
    return { nextState: state };
  }

  const human = state.players[0];
  const currentPool = state.tilePool;
  const committedBoard = state.committedBoardMelds;
  const snapshot = state.turnSnapshot;

  if (currentPool.length === 0) {
    const nextState = advanceTurn(state, state.boardMelds, state.players, currentPool, true);
    return {
      nextState,
      toastMessage: { text: 'Tile pool is empty! Passing turn.', type: 'info' },
    };
  }

  // Restore table board strictly to authoritative committedBoardMelds
  const restoredBoard = deepCopyMelds(committedBoard);

  // Restore human hand strictly to turn start snapshot hand
  const turnStartHand = snapshot ? snapshot.hand.map(deepCopyTile) : human.hand.map(deepCopyTile);

  // Draw 1 tile from pool
  const drawnTile = deepCopyTile(currentPool[0]);
  const remainingPool = currentPool.slice(1);
  const nextHand = [...turnStartHand, drawnTile];

  const updatedPlayers = state.players.map((p, idx) =>
    idx === 0 ? { ...p, hand: createSortedHand(nextHand) } : p
  );

  const tileName = drawnTile.isJoker ? 'Joker' : `${drawnTile.color} ${drawnTile.value}`;
  const nextState = advanceTurn(state, restoredBoard, updatedPlayers, remainingPool, true);

  return {
    nextState,
    soundEffect: 'draw',
    toastMessage: { text: `You drew a tile (${tileName}).`, type: 'info' },
    drawnTileId: drawnTile.id,
  };
}

/**
 * Pure handler for player submitting end turn.
 */
export function executeEndTurn(state: CoreGameState): MoveResult {
  if (state.activePlayerIndex !== 0 || state.gameStatus === 'ended') {
    return { nextState: state };
  }

  const human = state.players[0];
  const snapshot = state.turnSnapshot;
  const currentBoard = state.boardMelds;

  if (!snapshot) return { nextState: state };

  const boardValidation = validateBoard(currentBoard);
  if (!boardValidation.allValid) {
    return {
      nextState: state,
      soundEffect: 'error',
      toastMessage: {
        text: `Cannot end turn: There are invalid melds on the table (${boardValidation.invalidMeldIds.length} invalid).`,
        type: 'error',
      },
    };
  }

  const startHandCount = snapshot.hand.length;
  const currentHandCount = human.hand.length;
  const tilesPlayedCount = startHandCount - currentHandCount;

  if (tilesPlayedCount <= 0) {
    return {
      nextState: state,
      soundEffect: 'error',
      toastMessage: { text: 'You must play at least 1 tile or Draw a tile to end turn.', type: 'error' },
    };
  }

  if (!human.hasInitialMeld) {
    const snapshotPoints = snapshot.boardMelds.reduce((acc, m) => acc + (m.isValid ? m.value : 0), 0);
    const currentPoints = boardValidation.totalPoints;
    const turnPointsGained = currentPoints - snapshotPoints;

    if (turnPointsGained < 30) {
      return {
        nextState: state,
        soundEffect: 'error',
        toastMessage: {
          text: `Initial Meld Requirement: You need at least 30 points of new melds from your hand. (You achieved ${turnPointsGained} pts).`,
          type: 'error',
        },
      };
    }
  }

  const normalizedBoard = normalizeBoard(currentBoard);

  const updatedPlayers = state.players.map((p, idx) =>
    idx === 0
      ? {
          ...p,
          hand: createSortedHand(p.hand),
          hasInitialMeld: true,
        }
      : p
  );

  // Check win condition
  if (updatedPlayers[0].hand.length === 0) {
    const winState: CoreGameState = {
      ...state,
      gameStatus: 'ended',
      winner: { ...updatedPlayers[0], hasInitialMeld: true },
      boardMelds: normalizedBoard,
      players: updatedPlayers,
    };
    return {
      nextState: sanitizeTileConservation(winState),
      soundEffect: 'win',
      toastMessage: { text: '🎉 CONGRATULATIONS! You emptied your hand and won the game!', type: 'success' },
    };
  }

  const nextState = advanceTurn(state, normalizedBoard, updatedPlayers, state.tilePool, true);

  return {
    nextState,
    soundEffect: 'success',
    toastMessage: { text: 'Turn submitted successfully!', type: 'success' },
  };
}

/**
 * Pure handler for automated AI turn step.
 */
export function executeAiTurnStep(state: CoreGameState): MoveResult {
  const currentAiPlayer = state.players[state.activePlayerIndex];
  if (!currentAiPlayer || !currentAiPlayer.isAi) {
    return { nextState: state };
  }

  const aiResult = executeAiTurn(currentAiPlayer, state.boardMelds, state.tilePool);
  const normalizedAiBoard = normalizeBoard(aiResult.newBoardMelds);

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.activePlayerIndex) {
      const playedAny = aiResult.playedTilesCount > 0;
      return {
        ...p,
        hand: createSortedHand(aiResult.newAiHand),
        hasInitialMeld: p.hasInitialMeld || (playedAny && !aiResult.drewTile),
      };
    }
    return p;
  });

  const nextPool = aiResult.drewTile && state.tilePool.length > 0 ? state.tilePool.slice(1) : state.tilePool;

  // Check AI win condition
  if (aiResult.newAiHand.length === 0) {
    const winState: CoreGameState = {
      ...state,
      gameStatus: 'ended',
      winner: updatedPlayers[state.activePlayerIndex],
      boardMelds: normalizedAiBoard,
      players: updatedPlayers,
    };
    return {
      nextState: sanitizeTileConservation(winState),
      soundEffect: 'error',
      toastMessage: { text: `🤖 ${currentAiPlayer.name} has played all tiles and won!`, type: 'info' },
    };
  }

  const nextState = advanceTurn(state, normalizedAiBoard, updatedPlayers, nextPool, true);

  return {
    nextState: {
      ...nextState,
      botLastMoveMessage: aiResult.message,
    },
  };
}
