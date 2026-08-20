import type { Tile, Meld, Player } from '../types/game';
import { isValidMeld, calculateMeldValue } from './validator';

export interface AiMoveResult {
  newBoardMelds: Meld[];
  newAiHand: Tile[];
  drewTile: boolean;
  playedTilesCount: number;
  message: string;
  affectedMeldIds?: string[];
  recentlyPlacedTileIds?: string[];
}

/**
 * Searches for all possible valid melds from a set of tiles.
 */
export function findPossibleMeldsFromHand(hand: Tile[]): Tile[][] {
  const validMelds: Tile[][] = [];
  const n = hand.length;

  for (let len = 3; len <= Math.min(n, 6); len++) {
    const subsets = getSubsetsOfLength(hand, len);
    for (const subset of subsets) {
      const valRes = isValidMeld(subset);
      if (valRes.isValid) {
        validMelds.push(subset);
      }
    }
  }

  return validMelds;
}

/**
 * Helper to get subsets of fixed length
 */
function getSubsetsOfLength<T>(arr: T[], len: number): T[][] {
  const results: T[][] = [];
  function helper(start: number, current: T[]) {
    if (current.length === len) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return results;
}

/**
 * Performs an AI turn logic.
 */
export function executeAiTurn(
  aiPlayer: Player,
  boardMelds: Meld[],
  tilePool: Tile[]
): AiMoveResult {
  const hand = [...aiPlayer.hand];

  const possibleMelds = findPossibleMeldsFromHand(hand);

  if (!aiPlayer.hasInitialMeld) {
    for (const meldCandidate of possibleMelds) {
      const val = calculateMeldValue(meldCandidate);
      if (val >= 30) {
        const remainingHand = hand.filter((t) => !meldCandidate.some((mt) => mt.id === t.id));
        const newMeld: Meld = {
          id: `meld_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tiles: meldCandidate,
          isValid: true,
          type: isValidMeld(meldCandidate).type,
          value: val,
        };

        return {
          newBoardMelds: [...boardMelds, newMeld],
          newAiHand: remainingHand,
          drewTile: false,
          playedTilesCount: meldCandidate.length,
          message: `${aiPlayer.name} made initial meld with ${val} points!`,
          affectedMeldIds: [newMeld.id],
          recentlyPlacedTileIds: meldCandidate.map((t) => t.id),
        };
      }
    }

    return handleAiDraw(aiPlayer, boardMelds, tilePool);
  }

  if (possibleMelds.length > 0) {
    possibleMelds.sort((a, b) => calculateMeldValue(b) - calculateMeldValue(a));
    const bestMeld = possibleMelds[0];
    const remainingHand = hand.filter((t) => !bestMeld.some((mt) => mt.id === t.id));
    const val = calculateMeldValue(bestMeld);

    const newMeld: Meld = {
      id: `meld_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tiles: bestMeld,
      isValid: true,
      type: isValidMeld(bestMeld).type,
      value: val,
    };

    return {
      newBoardMelds: [...boardMelds, newMeld],
      newAiHand: remainingHand,
      drewTile: false,
      playedTilesCount: bestMeld.length,
      message: `${aiPlayer.name} played a meld of ${bestMeld.length} tiles!`,
      affectedMeldIds: [newMeld.id],
      recentlyPlacedTileIds: bestMeld.map((t) => t.id),
    };
  }

  for (let mIdx = 0; mIdx < boardMelds.length; mIdx++) {
    const targetMeld = boardMelds[mIdx];
    for (let rIdx = 0; rIdx < hand.length; rIdx++) {
      const tileToTry = hand[rIdx];
      const candidateAtStart = [tileToTry, ...targetMeld.tiles];
      if (isValidMeld(candidateAtStart).isValid) {
        const remainingHand = hand.filter((t) => t.id !== tileToTry.id);
        const updatedMelds = [...boardMelds];
        updatedMelds[mIdx] = {
          ...targetMeld,
          tiles: candidateAtStart,
          isValid: true,
          type: isValidMeld(candidateAtStart).type,
          value: calculateMeldValue(candidateAtStart),
        };
        return {
          newBoardMelds: updatedMelds,
          newAiHand: remainingHand,
          drewTile: false,
          playedTilesCount: 1,
          message: `${aiPlayer.name} added a tile to table meld!`,
          affectedMeldIds: [targetMeld.id],
          recentlyPlacedTileIds: [tileToTry.id],
        };
      }

      const candidateAtEnd = [...targetMeld.tiles, tileToTry];
      if (isValidMeld(candidateAtEnd).isValid) {
        const remainingHand = hand.filter((t) => t.id !== tileToTry.id);
        const updatedMelds = [...boardMelds];
        updatedMelds[mIdx] = {
          ...targetMeld,
          tiles: candidateAtEnd,
          isValid: true,
          type: isValidMeld(candidateAtEnd).type,
          value: calculateMeldValue(candidateAtEnd),
        };
        return {
          newBoardMelds: updatedMelds,
          newAiHand: remainingHand,
          drewTile: false,
          playedTilesCount: 1,
          message: `${aiPlayer.name} added a tile to table meld!`,
          affectedMeldIds: [targetMeld.id],
          recentlyPlacedTileIds: [tileToTry.id],
        };
      }
    }
  }

  return handleAiDraw(aiPlayer, boardMelds, tilePool);
}

function handleAiDraw(aiPlayer: Player, boardMelds: Meld[], tilePool: Tile[]): AiMoveResult {
  if (tilePool.length === 0) {
    return {
      newBoardMelds: boardMelds,
      newAiHand: aiPlayer.hand,
      drewTile: true,
      playedTilesCount: 0,
      message: `${aiPlayer.name} passed (pool empty).`,
      affectedMeldIds: [],
      recentlyPlacedTileIds: [],
    };
  }

  const drawnTile = tilePool[0];
  return {
    newBoardMelds: boardMelds,
    newAiHand: [...aiPlayer.hand, drawnTile],
    drewTile: true,
    playedTilesCount: 0,
    message: `${aiPlayer.name} drew 1 tile from the pool.`,
    affectedMeldIds: [],
    recentlyPlacedTileIds: [],
  };
}
