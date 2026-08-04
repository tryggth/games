import { validateBoard, isValidMeld, calculateMeldValue, normalizeMeld, normalizeBoard } from '../src/engine/validator.js';
import { executeAiTurn } from '../src/engine/ai.js';
import { createTilePool, shuffleTiles } from '../src/engine/tilePool.js';
import type { Tile, Meld, Player, TurnSnapshot } from '../src/types/game.js';

console.log('----------------------------------------------------');
console.log('🧪 SIMULATING EXACT USER BROWSER UI ACTIONS');
console.log('----------------------------------------------------');

// State Container simulating useGameState
class GameSimulator {
  tilePool: Tile[] = [];
  committedBoardMelds: Meld[] = [];
  boardMelds: Meld[] = [];
  players: Player[] = [];
  activePlayerIndex: number = 0;
  turnSnapshot: TurnSnapshot | null = null;

  constructor() {
    const freshPool = shuffleTiles(createTilePool());
    const humanHand = freshPool.slice(0, 14);
    const aiHand = freshPool.slice(14, 28);
    this.tilePool = freshPool.slice(28);

    this.players = [
      {
        id: 'player_human',
        name: 'Player',
        isAi: false,
        handTiles: humanHand.map((t, idx) => ({ tile: t, x: idx * 48, y: 0 })),
        playerRacks: [humanHand, []],
        rack: humanHand,
        hasInitialMeld: false,
        score: 0,
      },
      {
        id: 'player_ai_1',
        name: 'Bot',
        isAi: true,
        handTiles: aiHand.map((t, idx) => ({ tile: t, x: idx * 48, y: 0 })),
        playerRacks: [aiHand, []],
        rack: aiHand,
        hasInitialMeld: false,
        score: 0,
      },
    ];

    this.committedBoardMelds = [];
    this.boardMelds = [];
    this.activePlayerIndex = 0;
    this.takeTurnSnapshot();
  }

  takeTurnSnapshot() {
    const p = this.players[this.activePlayerIndex];
    this.turnSnapshot = {
      boardMelds: JSON.parse(JSON.stringify(this.boardMelds)),
      handTiles: JSON.parse(JSON.stringify(p.handTiles)),
      playerRacks: [p.handTiles.map(ht => ht.tile), []],
      playerRack: p.handTiles.map(ht => ht.tile),
      hasInitialMeld: p.hasInitialMeld,
      poolCount: this.tilePool.length,
    };
  }

  advanceTurn(newBoard: Meld[], newPlayers: Player[], nextPool: Tile[], isCommittedSubmit: boolean) {
    if (isCommittedSubmit) {
      this.committedBoardMelds = JSON.parse(JSON.stringify(newBoard));
    }
    this.boardMelds = JSON.parse(JSON.stringify(newBoard));
    this.players = JSON.parse(JSON.stringify(newPlayers));
    this.tilePool = JSON.parse(JSON.stringify(nextPool));

    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.takeTurnSnapshot();
    console.log(`[STATE UPDATE] Turn advanced to ${this.players[this.activePlayerIndex].name} (Index ${this.activePlayerIndex}). Board Melds: ${this.boardMelds.length}, Committed Melds: ${this.committedBoardMelds.length}`);
  }

  // Action 1: Player places 30+ meld on board
  playHumanMeld(meldTiles: Tile[]) {
    const norm = normalizeMeld(meldTiles);
    const meld: Meld = {
      id: 'human_meld_1',
      tiles: norm,
      isValid: true,
      type: 'run',
      value: calculateMeldValue(norm),
    };
    this.boardMelds.push(meld);

    // Remove from human hand
    const tileIds = new Set(meldTiles.map(t => t.id));
    this.players[0].handTiles = this.players[0].handTiles.filter(ht => !tileIds.has(ht.tile.id));
    console.log(`[ACTION] Human staged meld on board (${meld.value} pts). Board has ${this.boardMelds.length} melds.`);
  }

  // Action 2: Human clicks End Turn
  endTurn() {
    const human = this.players[0];
    const val = validateBoard(this.boardMelds);
    const normBoard = normalizeBoard(this.boardMelds);
    const updatedPlayers = JSON.parse(JSON.stringify(this.players));
    updatedPlayers[0].hasInitialMeld = true;

    console.log(`[ACTION] Human clicked End Turn.`);
    this.advanceTurn(normBoard, updatedPlayers, this.tilePool, true);
  }

  // Action 3: Bot takes turn (FORCE DRAW)
  runBotTurn() {
    console.log(`[ACTION] Bot executing turn (forcing DRAW tile)...`);
    const aiPlayer = this.players[1];
    const drawnTile = this.tilePool[0];
    const nextPool = this.tilePool.slice(1);

    const updatedPlayers = JSON.parse(JSON.stringify(this.players));
    updatedPlayers[1].rack.push(drawnTile);
    updatedPlayers[1].handTiles.push({ tile: drawnTile, x: 0, y: 0 });

    this.advanceTurn(this.boardMelds, updatedPlayers, nextPool, true);
  }

  // Action 4: Human draws tile on Turn 2
  humanDrawTile() {
    console.log(`[ACTION] Human clicked Draw Tile & Pass.`);
    const restoredBoard = JSON.parse(JSON.stringify(this.committedBoardMelds));
    const drawnTile = this.tilePool[0];
    const nextPool = this.tilePool.slice(1);

    const updatedPlayers = JSON.parse(JSON.stringify(this.players));
    updatedPlayers[0].rack.push(drawnTile);
    updatedPlayers[0].handTiles.push({ tile: drawnTile, x: 0, y: 0 });

    this.advanceTurn(restoredBoard, updatedPlayers, nextPool, false);
  }
}

const sim = new GameSimulator();

// Step 1: Human plays 30+ meld
const meldTiles: Tile[] = [
  { id: 'red_10', color: 'red', value: 10, isJoker: false },
  { id: 'red_11', color: 'red', value: 11, isJoker: false },
  { id: 'red_12', color: 'red', value: 12, isJoker: false },
];
sim.playHumanMeld(meldTiles);

// Step 2: Human ends turn
sim.endTurn();

// Step 3: Bot takes turn
sim.runBotTurn();

// Step 4: Human draws tile on Turn 2
sim.humanDrawTile();

console.log('----------------------------------------------------');
console.log(`FINAL BOARD MELD COUNT: ${sim.boardMelds.length}`);
console.log(`FINAL COMMITTED MELD COUNT: ${sim.committedBoardMelds.length}`);
console.log('----------------------------------------------------');
