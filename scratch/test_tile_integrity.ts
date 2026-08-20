import * as moveEngine from '../src/engine/moveEngine.js';
import type { Tile, DragItem } from '../src/types/game.js';

console.log('----------------------------------------------------');
console.log('🧪 TESTING TILE CONSERVATION & BOARD-TO-HAND BUG');
console.log('----------------------------------------------------');

function checkTileIntegrity(state: moveEngine.CoreGameState): { valid: boolean; total: number; duplicates: string[] } {
  const allTiles: Tile[] = [
    ...state.tilePool,
    ...state.players.flatMap((p) => p.hand),
    ...state.boardMelds.flatMap((m) => m.tiles),
  ];

  const seenIds = new Map<string, number>();
  const duplicates: string[] = [];

  for (const t of allTiles) {
    const count = (seenIds.get(t.id) || 0) + 1;
    seenIds.set(t.id, count);
    if (count === 2) {
      duplicates.push(t.id);
    }
  }

  return {
    valid: allTiles.length === 106 && duplicates.length === 0,
    total: allTiles.length,
    duplicates,
  };
}

let state = moveEngine.initNewGame();
console.log('Initial state integrity:', checkTileIntegrity(state));

// Simulate: Human plays a meld of 3 tiles and ends turn
const meld3 = state.players[0].hand.slice(0, 3);
const moveMeld = moveEngine.executeCreateMeldFromSelection(state, meld3.map(t => t.id));
state = moveMeld.nextState;

// End human turn (committed)
const endRes = moveEngine.executeEndTurn({ ...state, boardMelds: state.boardMelds.map(m => ({ ...m, isValid: true })) });
state = endRes.nextState;
console.log('After human played meld & ended turn:', checkTileIntegrity(state));

// Bot turn
const botRes = moveEngine.executeAiTurnStep(state);
state = botRes.nextState;
console.log('After bot turn:', checkTileIntegrity(state));

// Now human turn: Table has a meld.
const tableMeld = state.boardMelds[0];
const tableTile = tableMeld.tiles[0];

console.log(`Human attempting to drag tile ${tableTile.id} from table meld to hand...`);
const dropRes = moveEngine.executeDropTile(state, {
  tileId: tableTile.id,
  source: 'board',
  sourceMeldId: tableMeld.id,
}, { type: 'hand' });

state = dropRes.nextState;

console.log('After dragging table tile to hand:', checkTileIntegrity(state));

console.log('Human now draws a tile...');
const drawRes = moveEngine.executeDrawTile(state);
state = drawRes.nextState;

const finalCheck = checkTileIntegrity(state);
console.log('After drawing tile integrity:', finalCheck);

if (!finalCheck.valid) {
  console.log('❌ BUG REPRODUCED: Duplicates found:', finalCheck.duplicates, 'Total tiles:', finalCheck.total);
} else {
  console.log('✅ Integrity maintained!');
}
