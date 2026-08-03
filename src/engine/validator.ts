import type { Tile, TileColor, MeldValidationResult, Meld } from '../types/game';

/**
 * Validates if a set of tiles forms a valid Rummikub Group.
 * Group rules:
 * - 3 or 4 tiles.
 * - Same number value (1-13).
 * - Different colors for each non-joker tile.
 */
export function isValidGroup(tiles: Tile[]): MeldValidationResult {
  if (tiles.length < 3 || tiles.length > 4) {
    return { isValid: false, type: 'invalid', value: 0, errorReason: 'Groups must contain 3 or 4 tiles' };
  }

  const nonJokers = tiles.filter((t) => !t.isJoker);
  const jokers = tiles.filter((t) => t.isJoker);

  // All jokers is a valid group (e.g. representing 13s)
  if (nonJokers.length === 0) {
    const groupVal = 13;
    return {
      isValid: true,
      type: 'group',
      value: groupVal * tiles.length,
    };
  }

  // All non-jokers must have the exact same value
  const targetValue = nonJokers[0].value;
  const hasSameValue = nonJokers.every((t) => t.value === targetValue);
  if (!hasSameValue) {
    return { isValid: false, type: 'invalid', value: 0, errorReason: 'Group tiles must have the same number' };
  }

  // All non-jokers must have unique colors
  const colorsUsed = new Set<TileColor>();
  for (const t of nonJokers) {
    if (colorsUsed.has(t.color)) {
      return { isValid: false, type: 'invalid', value: 0, errorReason: 'Group tiles cannot have duplicate colors' };
    }
    colorsUsed.add(t.color);
  }

  // Check total colors available (max 4)
  if (colorsUsed.size + jokers.length > 4) {
    return { isValid: false, type: 'invalid', value: 0, errorReason: 'Group cannot exceed 4 distinct colors' };
  }

  // Calculate total value (each tile including joker is worth targetValue)
  const totalValue = targetValue * tiles.length;

  return {
    isValid: true,
    type: 'group',
    value: totalValue,
  };
}

/**
 * Validates if a set of tiles forms a valid Rummikub Run.
 * Run rules:
 * - 3 or more tiles (up to 13).
 * - Same color for all non-joker tiles.
 * - Consecutive sequence of numbers (1 to 13). No wrapping.
 */
export function isValidRun(tiles: Tile[]): MeldValidationResult {
  if (tiles.length < 3 || tiles.length > 13) {
    return { isValid: false, type: 'invalid', value: 0, errorReason: 'Runs must contain between 3 and 13 tiles' };
  }

  const nonJokers = tiles.filter((t) => !t.isJoker);
  const N = tiles.length;

  if (nonJokers.length === 0) {
    // All jokers, valid run starting at 1
    const value = (N * (N + 1)) / 2;
    return { isValid: true, type: 'run', value };
  }

  // All non-jokers must have the exact same color
  const runColor = nonJokers[0].color;
  const sameColor = nonJokers.every((t) => t.color === runColor);
  if (!sameColor) {
    return { isValid: false, type: 'invalid', value: 0, errorReason: 'Run tiles must be the same color' };
  }

  // Deduces contextual sequence startValue considering Jokers in array positions
  let startValue: number | null = null;
  const firstNonJokerIndex = tiles.findIndex((t) => !t.isJoker);

  if (firstNonJokerIndex !== -1) {
    const candidateStart = tiles[firstNonJokerIndex].value - firstNonJokerIndex;
    let isPositionalMatch = true;

    for (let i = 0; i < N; i++) {
      if (!tiles[i].isJoker) {
        if (tiles[i].value !== candidateStart + i) {
          isPositionalMatch = false;
          break;
        }
      }
    }

    if (isPositionalMatch && candidateStart >= 1 && candidateStart + N - 1 <= 13) {
      startValue = candidateStart;
    }
  }

  // Fallback for non-positional / sorted non-jokers
  if (startValue === null) {
    const sortedNonJokers = [...nonJokers].sort((a, b) => a.value - b.value);

    // Check for duplicates in non-jokers
    for (let i = 0; i < sortedNonJokers.length - 1; i++) {
      if (sortedNonJokers[i].value === sortedNonJokers[i + 1].value) {
        return { isValid: false, type: 'invalid', value: 0, errorReason: 'Run tiles cannot have duplicate numbers' };
      }
    }

    const minVal = sortedNonJokers[0].value;
    const maxVal = sortedNonJokers[sortedNonJokers.length - 1].value;
    const span = maxVal - minVal + 1;

    if (span > N) {
      return { isValid: false, type: 'invalid', value: 0, errorReason: 'Numbers are not consecutive' };
    }

    const minPossibleStart = Math.max(1, maxVal - N + 1);
    const maxPossibleStart = Math.min(13 - N + 1, minVal);

    if (minPossibleStart > maxPossibleStart) {
      return { isValid: false, type: 'invalid', value: 0, errorReason: 'Run sequence exceeds bounds (1-13)' };
    }

    startValue = minPossibleStart;
  }

  const totalValue = (N * (2 * startValue + N - 1)) / 2;

  return {
    isValid: true,
    type: 'run',
    value: totalValue,
  };
}

/**
 * Validates if tiles form a valid group OR valid run.
 */
export function isValidMeld(tiles: Tile[]): MeldValidationResult {
  const groupRes = isValidGroup(tiles);
  if (groupRes.isValid) return groupRes;

  const runRes = isValidRun(tiles);
  if (runRes.isValid) return runRes;

  return {
    isValid: false,
    type: 'invalid',
    value: 0,
    errorReason: groupRes.errorReason || runRes.errorReason || 'Invalid tile combination',
  };
}

/**
 * Calculates the contextual point value of a meld, resolving Joker point values dynamically.
 * - Group: Each tile (including Jokers) contributes the face value of the group's number.
 * - Run: Each tile (including Jokers) contributes its exact sequence position value (1-13).
 */
export function getEffectiveMeldPointValue(tiles: Tile[]): number {
  const validation = isValidMeld(tiles);
  return validation.isValid ? validation.value : 0;
}

/**
 * Calculates point value for a valid meld.
 */
export function calculateMeldValue(tiles: Tile[]): number {
  return getEffectiveMeldPointValue(tiles);
}

/**
 * Calculates total initial meld points across all melds played from hand during a turn.
 */
export function calculateInitialMeldPoints(playedMelds: Tile[][]): number {
  return playedMelds.reduce((sum, meld) => sum + getEffectiveMeldPointValue(meld), 0);
}

/**
 * Evaluates an entire table board state (array of melds).
 * Returns validity of all melds and total board points.
 */
export function validateBoard(melds: Meld[]): {
  allValid: boolean;
  invalidMeldIds: string[];
  totalPoints: number;
} {
  const invalidMeldIds: string[] = [];
  let totalPoints = 0;

  for (const meld of melds) {
    const res = isValidMeld(meld.tiles);
    if (!res.isValid) {
      invalidMeldIds.push(meld.id);
    } else {
      totalPoints += res.value;
    }
  }

  return {
    allValid: invalidMeldIds.length === 0,
    invalidMeldIds,
    totalPoints,
  };
}

/**
 * Deduces effective numerical value of every tile in a valid Run (including Jokers),
 * and returns the tiles sorted in strict ascending order (1-13).
 */
export function normalizeRun(tiles: Tile[]): Tile[] {
  const runRes = isValidRun(tiles);
  if (!runRes.isValid) return tiles;

  const N = tiles.length;
  const nonJokers = tiles.filter((t) => !t.isJoker);

  if (nonJokers.length === 0) {
    return tiles;
  }

  const sortedNonJokers = [...nonJokers].sort((a, b) => a.value - b.value);
  const minVal = sortedNonJokers[0].value;
  const maxVal = sortedNonJokers[sortedNonJokers.length - 1].value;

  const minPossibleStart = Math.max(1, maxVal - N + 1);
  const maxPossibleStart = Math.min(13 - N + 1, minVal);

  let startValue = minPossibleStart;
  if (minPossibleStart < maxPossibleStart) {
    const firstNonJokerIdx = tiles.findIndex((t) => !t.isJoker);
    const reversedTiles = [...tiles].reverse();
    const lastNonJokerIdxFromEnd = reversedTiles.findIndex((t) => !t.isJoker);
    const lastNonJokerIdx = tiles.length - 1 - lastNonJokerIdxFromEnd;

    const leadingJokersCount = firstNonJokerIdx;
    const trailingJokersCount = N - 1 - lastNonJokerIdx;

    if (leadingJokersCount > 0 && minVal - leadingJokersCount >= 1) {
      startValue = minVal - leadingJokersCount;
    } else if (trailingJokersCount > 0 && maxVal + trailingJokersCount <= 13) {
      startValue = maxVal - (N - 1) + trailingJokersCount;
    } else {
      startValue = minPossibleStart;
    }

    startValue = Math.max(minPossibleStart, Math.min(maxPossibleStart, startValue));
  }

  const assignedValues = Array.from({ length: N }, (_, i) => startValue + i);
  const assignedTileMap = new Map<string, number>();

  for (const t of nonJokers) {
    assignedTileMap.set(t.id, t.value);
  }

  const usedValues = new Set(nonJokers.map((t) => t.value));
  const remainingValues = assignedValues.filter((v) => !usedValues.has(v));

  const jokers = tiles.filter((t) => t.isJoker);
  jokers.forEach((jokerTile, idx) => {
    assignedTileMap.set(jokerTile.id, remainingValues[idx] ?? startValue);
  });

  return [...tiles].sort((a, b) => {
    const valA = assignedTileMap.get(a.id) ?? a.value;
    const valB = assignedTileMap.get(b.id) ?? b.value;
    return valA - valB;
  });
}

/**
 * Normalizes a Group meld by ordering tiles by color (red -> blue -> black -> yellow), then Jokers.
 */
export function normalizeGroup(tiles: Tile[]): Tile[] {
  const colorOrder: Record<TileColor, number> = {
    red: 0,
    blue: 1,
    black: 2,
    yellow: 3,
  };

  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    return colorOrder[a.color] - colorOrder[b.color];
  });
}

/**
 * Normalizes any valid meld (sorting Runs in ascending order and Groups by color order).
 */
export function normalizeMeld(tiles: Tile[]): Tile[] {
  if (isValidRun(tiles).isValid) {
    return normalizeRun(tiles);
  }
  if (isValidGroup(tiles).isValid) {
    return normalizeGroup(tiles);
  }
  return tiles;
}

/**
 * Applies the automatic end-of-turn normalization pass to all table melds.
 */
export function normalizeBoard(melds: Meld[]): Meld[] {
  return melds.map((meld) => {
    const normTiles = normalizeMeld(meld.tiles);
    const valRes = isValidMeld(normTiles);
    return {
      ...meld,
      tiles: normTiles,
      isValid: valRes.isValid,
      type: valRes.type,
      value: valRes.value,
      errorReason: valRes.errorReason,
    };
  });
}
