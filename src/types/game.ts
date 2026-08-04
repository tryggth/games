export type TileColor = 'red' | 'blue' | 'black' | 'yellow';

export interface Tile {
  id: string;
  color: TileColor;
  value: number; // 1-13 (0 for joker)
  isJoker: boolean;
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
  isCommitted?: boolean;
}

export interface Player {
  id: string;
  name: string;
  isAi: boolean;
  hand: Tile[];
  hasInitialMeld: boolean;
  score: number;
}

export interface TurnSnapshot {
  boardMelds: Meld[];
  hand: Tile[];
  hasInitialMeld: boolean;
  poolCount: number;
}

export type GameStatus = 'playing' | 'ended';

export type SortMode = 'number' | 'color' | 'group' | 'none';

export interface DragItem {
  tileId: string;
  source: 'rack' | 'board';
  sourceMeldId?: string;
  sourceIndex?: number;
}
