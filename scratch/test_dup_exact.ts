import * as moveEngine from '../src/engine/moveEngine.js';

let state = moveEngine.initNewGame();
console.log('Initial tile conservation check:', moveEngine.verifyTileConservation(state));

// Give human 30+ initial meld: red 10, red 11, red 12 (33 pts)
state.players[0].hand = [
  { id: 'tile_red_10_set1', color: 'red', value: 10, isJoker: false },
  { id: 'tile_red_11_set1', color: 'red', value: 11, isJoker: false },
  { id: 'tile_red_12_set1', color: 'red', value: 12, isJoker: false },
  ...state.players[0].hand.slice(3)
];
state.turnSnapshot!.hand = [...state.players[0].hand];

// Human creates meld
const createRes = moveEngine.executeCreateMeldFromSelection(state, ['tile_red_10_set1', 'tile_red_11_set1', 'tile_red_12_set1']);
state = createRes.nextState;

// Human ends turn
const endRes = moveEngine.executeEndTurn(state);
state = endRes.nextState;
console.log('After human End Turn committed board melds:', state.committedBoardMelds.length);

// Bot plays (draws tile)
const botRes = moveEngine.executeAiTurnStep(state);
state = botRes.nextState;

// Human turn 2: Table has the committed meld (red 10, 11, 12).
// Human attempts to drag tile_red_10_set1 from board to hand:
console.log('Human attempts to drag tile_red_10_set1 from table to hand:');
const dropRes = moveEngine.executeDropTile(state, {
  tileId: 'tile_red_10_set1',
  source: 'board',
  sourceMeldId: state.boardMelds[0].id,
}, { type: 'hand' });

console.log('Drop result toast:', dropRes.toastMessage);
state = dropRes.nextState;

// Now human draws a tile!
console.log('Human draws a tile...');
const drawRes = moveEngine.executeDrawTile(state);
state = drawRes.nextState;

const integrity = moveEngine.verifyTileConservation(state);
console.log('Final tile conservation check:', integrity);

const allTiles = [
  ...state.tilePool,
  ...state.players.flatMap(p => p.hand),
  ...state.boardMelds.flatMap(m => m.tiles),
];
const red10Count = allTiles.filter(t => t.id === 'tile_red_10_set1').length;
console.log('TOTAL COUNT OF tile_red_10_set1 IN GAME:', red10Count);

if (integrity.valid && red10Count === 1) {
  console.log('🎉 SUCCESS: Exact 1 copy of tile_red_10_set1 preserved! No duplicates!');
} else {
  console.log('❌ FAILED: Duplicate detected!');
}
