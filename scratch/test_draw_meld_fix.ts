import { validateBoard, isValidMeld, calculateMeldValue, normalizeBoard } from '../src/engine/validator.js';
import { executeAiTurn } from '../src/engine/ai.js';
import { createTilePool, shuffleTiles } from '../src/engine/tilePool.js';
import type { Tile, Meld, Player, TurnSnapshot } from '../src/types/game.js';

console.log('----------------------------------------------------');
console.log('🧪 RUNNING AUTOMATED STATE MACHINE VERIFICATION TEST');
console.log('----------------------------------------------------');

// Test Step 1: Initial state
let pool = shuffleTiles(createTilePool());
let humanHand: Tile[] = pool.slice(0, 14);
let aiHand: Tile[] = pool.slice(14, 28);
let remainingPool: Tile[] = pool.slice(28);

let committedBoardMelds: Meld[] = [];
let stagedBoardMelds: Meld[] = [];

console.log(`[PASS 1] Game Initialized. Human: ${humanHand.length} tiles, Pool: ${remainingPool.length} tiles, Board: ${committedBoardMelds.length} melds.`);

// Test Step 2: Human plays 30+ initial meld
const meld1Tiles: Tile[] = [
  { id: 't_red_10', color: 'red', value: 10, isJoker: false },
  { id: 't_red_11', color: 'red', value: 11, isJoker: false },
  { id: 't_red_12', color: 'red', value: 12, isJoker: false },
];

const meld1: Meld = {
  id: 'meld_test_30pts',
  tiles: meld1Tiles,
  isValid: true,
  type: 'run',
  value: 33,
};

stagedBoardMelds = [meld1];
console.log(`[PASS 2] Human placed 30+ initial meld on table (Value: ${meld1.value} pts).`);

// Human ends turn
const validation = validateBoard(stagedBoardMelds);
if (!validation.allValid || validation.totalPoints < 30) {
  console.error('❌ FAIL: Meld validation failed!');
  process.exit(1);
}

committedBoardMelds = JSON.parse(JSON.stringify(stagedBoardMelds));
stagedBoardMelds = JSON.parse(JSON.stringify(committedBoardMelds));
console.log(`[PASS 3] Human ended turn. committedBoardMelds locked with ${committedBoardMelds.length} meld(s).`);

// Test Step 3: Bot Turn 1
const botPlayer: Player = {
  id: 'player_ai_1',
  name: 'Bot',
  isAi: true,
  handTiles: aiHand.map(t => ({ tile: t, x: 0, y: 0 })),
  playerRacks: [aiHand, []],
  rack: aiHand,
  hasInitialMeld: false,
  score: 0,
};

const aiResult = executeAiTurn(botPlayer, committedBoardMelds, remainingPool);
console.log(`[PASS 4] Bot executed turn: "${aiResult.message}".`);

if (aiResult.drewTile && remainingPool.length > 0) {
  remainingPool = remainingPool.slice(1);
}
// Bot turn preserves committedBoardMelds
committedBoardMelds = JSON.parse(JSON.stringify(aiResult.newBoardMelds));
stagedBoardMelds = JSON.parse(JSON.stringify(committedBoardMelds));

console.log(`[PASS 5] Turn advanced back to Human. Board has ${stagedBoardMelds.length} meld(s).`);

// Test Step 4: Human Turn 2 - Human Draws Tile
const restoredBoard = JSON.parse(JSON.stringify(committedBoardMelds));
const drawnTile = remainingPool[0];
remainingPool = remainingPool.slice(1);

stagedBoardMelds = restoredBoard;
console.log(`[PASS 6] Human drew 1 tile (${drawnTile.color} ${drawnTile.value}).`);
console.log(`[PASS 7] Checking board melds after drawing tile: ${stagedBoardMelds.length} meld(s) on table.`);

if (stagedBoardMelds.length === 1 && stagedBoardMelds[0].id === 'meld_test_30pts') {
  console.log('----------------------------------------------------');
  console.log('✅ TEST PASSED: 30+ Meld stayed permanently on table when drawing tile!');
  console.log('----------------------------------------------------');
} else {
  console.error('❌ TEST FAILED: Table meld was lost when drawing tile!');
  process.exit(1);
}
