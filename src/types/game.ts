export type TileColor = 'red' | 'blue' | 'black' | 'yellow';

export interface Tile {
  id: string;
  color: TileColor;
  value: number; // 1-13 (0 for joker)
  isJoker: boolean;
}

export interface HandTile {
  tile: Tile;
  x: number; // x coordinate in px relative to hand canvas
  y: number; // y coordinate in px relative to hand canvas
}

export type MeldType = 'group' | 'run' | 'invalid';

export interface MeldValidationResult {
  isValid: boolean;
  type: MeldType;
  value: number;
  errorReason?: string;
  jokerRepresentations?: Array<{ tileId: string; color: TileColor; value: number }>;
}

export interface Meld {
  id: string;
  tiles: Tile[];
  isValid: boolean;
  type: MeldType;
  value: number;
  errorReason?: string;
}

export interface Player {
  id: string;
  name: string;
  isAi: boolean;
  handTiles: HandTile[]; // Free 2D canvas tile positions
  playerRacks: [Tile[], Tile[]]; // Legacy rack support for compatibility
  rack: Tile[]; // Flattened view of all tiles in hand
  hasInitialMeld: boolean;
  score: number;
}

export interface TurnSnapshot {
  boardMelds: Meld[];
  handTiles: HandTile[];
  playerRacks: [Tile[], Tile[]];
  playerRack: Tile[];
  hasInitialMeld: boolean;
  poolCount: number;
}

export type GameStatus = 'playing' | 'ended';

export type SortMode = 'number' | 'color' | 'group' | 'none';

export interface DragItem {
  tileId: string;
  source: 'rack' | 'board';
  sourceRackIndex?: number;
  sourceMeldId?: string;
  sourceIndex?: number;
  offsetX?: number;
  offsetY?: number;
}
