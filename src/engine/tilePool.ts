import type { Tile, TileColor } from '../types/game';

export const COLORS: TileColor[] = ['red', 'blue', 'black', 'yellow'];

/**
 * Creates a standard full pool of 106 Rummikub tiles.
 * - 2 sets of 4 colors x values 1-13 (104 tiles)
 * - 2 Jokers (2 tiles)
 */
export function createTilePool(): Tile[] {
  const pool: Tile[] = [];

  // Generate 2 sets of 4 colors x 1-13
  for (let set = 1; set <= 2; set++) {
    for (const color of COLORS) {
      for (let value = 1; value <= 13; value++) {
        pool.push({
          id: `tile_${color}_${value}_set${set}`,
          color,
          value,
          isJoker: false,
        });
      }
    }
  }

  // Generate 2 Jokers
  pool.push({
    id: 'tile_joker_1',
    color: 'red', // Default visual accent for joker 1
    value: 0,
    isJoker: true,
  });

  pool.push({
    id: 'tile_joker_2',
    color: 'black', // Default visual accent for joker 2
    value: 0,
    isJoker: true,
  });

  return pool;
}

/**
 * Shuffles an array of tiles in-place using Fisher-Yates algorithm.
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const array = [...tiles];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Sorts tiles by value (1-13), then by color.
 */
export function sortTilesByValue(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.value !== b.value) return a.value - b.value;
    return COLORS.indexOf(a.color) - COLORS.indexOf(b.color);
  });
}

/**
 * Sorts tiles by color, then by value (1-13).
 */
export function sortTilesByColor(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.color !== b.color) {
      return COLORS.indexOf(a.color) - COLORS.indexOf(b.color);
    }
    return a.value - b.value;
  });
}

const COLOR_ORDER: TileColor[] = ['red', 'blue', 'black', 'yellow'];

/**
 * Sorts hand tiles by color hierarchy ('red' -> 'blue' -> 'black' -> 'yellow'),
 * then ascending numerical value (1-13), placing Jokers at the end.
 */
export function sortHandColorThenNumber(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // 1. Jokers always go to the end
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    // 2. Sort by color order
    const colorIndexA = COLOR_ORDER.indexOf(a.color);
    const colorIndexB = COLOR_ORDER.indexOf(b.color);

    if (colorIndexA !== colorIndexB) {
      return colorIndexA - colorIndexB;
    }

    // 3. Within same color, sort ascending by numerical value
    return a.value - b.value;
  });
}
