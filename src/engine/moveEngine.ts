import type { Tile, Meld, Player, TurnSnapshot, GameStatus, DragItem } from '../types/game';
import { generateTilePool, deepCopyTile, deepCopyMelds } from './tilePool';
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

  return {
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

  return {
    nextState: {
      ...state,
      boardMelds: currentBoard,
      players: updatedPlayers,
    },
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

  return {
    nextState: {
      ...state,
      boardMelds: currentBoard,
      players: updatedPlayers,
    },
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

  return {
    nextState: {
      ...state,
      boardMelds: currentBoard,
    },
    soundEffect: 'drop',
  };
}

/**
 * Pure handler for player drawing a tile.
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

  // Restore board to authoritative committedBoardMelds (or valid melds if committed is empty)
  const effectiveCommitted =
    committedBoard.length > 0
      ? committedBoard
      : (human.hasInitialMeld ? state.boardMelds.filter((m) => m.isValid) : []);
  const restoredBoard = deepCopyMelds(effectiveCommitted);

  // Return any uncommitted staged tiles from board back into human hand
  const turnStartHand = snapshot ? snapshot.hand : human.hand;
  const committedTileIds = new Set(effectiveCommitted.flatMap((m) => m.tiles.map((t) => t.id)));

  let currentHand = [...human.hand];
  const currentHandTileIds = new Set(currentHand.map((t) => t.id));

  const uncommittedHandTiles = turnStartHand.filter(
    (t) => !currentHandTileIds.has(t.id) && !committedTileIds.has(t.id)
  );

  currentHand = [...currentHand, ...uncommittedHandTiles];

  // Draw 1 tile from pool
  const drawnTile = deepCopyTile(currentPool[0]);
  const remainingPool = currentPool.slice(1);
  currentHand.push(drawnTile);

  const updatedPlayers = state.players.map((p, idx) =>
    idx === 0 ? { ...p, hand: createSortedHand(currentHand) } : p
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
      nextState: winState,
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
      nextState: winState,
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
