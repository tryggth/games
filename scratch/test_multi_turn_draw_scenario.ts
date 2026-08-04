import { validateBoard, isValidMeld, calculateMeldValue, normalizeMeld, normalizeBoard } from '../src/engine/validator.js';
import { executeAiTurn } from '../src/engine/ai.js';
import { createTilePool, shuffleTiles } from '../src/engine/tilePool.js';
import type { Tile, Meld, Player, TurnSnapshot } from '../src/types/game.js';

console.log('----------------------------------------------------');
console.log('🧪 MULTI-TURN EXACT USER SCENARIO SIMULATOR');
console.log('----------------------------------------------------');

class MultiTurnSim {
  tilePool: Tile[] = [];
  committedBoardMelds: Meld[] = [];
  boardMelds: Meld[] = [];
  players: Player[] = [];
  activePlayerIndex: number = 0;
  turnSnapshot: TurnSnapshot | null = null;

  // Refs simulation
  boardMeldsRef: Meld[] = [];
  committedBoardMeldsRef: Meld[] = [];
  tilePoolRef: Tile[] = [];
  playersRef: Player[] = [];
  activePlayerIndexRef: number = 0;
  turnSnapshotRef: TurnSnapshot | null = null;

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

    this.syncRefs();
    this.takeSnapshot();
  }

  syncRefs() {
    this.boardMeldsRef = JSON.parse(JSON.stringify(this.boardMelds));
    this.committedBoardMeldsRef = JSON.parse(JSON.stringify(this.committedBoardMelds));
    this.tilePoolRef = JSON.parse(JSON.stringify(this.tilePool));
    this.playersRef = JSON.parse(JSON.stringify(this.players));
    this.activePlayerIndexRef = this.activePlayerIndex;
    this.turnSnapshotRef = JSON.parse(JSON.stringify(this.turnSnapshot));
  }

  takeSnapshot() {
    const p = this.players[this.activePlayerIndex];
    this.turnSnapshot = {
      boardMelds: JSON.parse(JSON.stringify(this.boardMelds)),
      handTiles: JSON.parse(JSON.stringify(p.handTiles)),
      playerRacks: [p.handTiles.map(ht => ht.tile), []],
      playerRack: p.handTiles.map(ht => ht.tile),
      hasInitialMeld: p.hasInitialMeld,
      poolCount: this.tilePool.length,
    };
    this.turnSnapshotRef = JSON.parse(JSON.stringify(this.turnSnapshot));
  }

  advanceTurn(newBoard: Meld[], newPlayers: Player[], nextPool: Tile[], isCommittedSubmit: boolean) {
    if (isCommittedSubmit) {
      this.committedBoardMelds = JSON.parse(JSON.stringify(newBoard));
    }
    this.boardMelds = JSON.parse(JSON.stringify(newBoard));
    this.players = JSON.parse(JSON.stringify(newPlayers));
    this.tilePool = JSON.parse(JSON.stringify(nextPool));

    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.syncRefs();
    this.takeSnapshot();

    console.log(`[ADVANCE TURN] Active: ${this.players[this.activePlayerIndex].name}. Board Melds: ${this.boardMelds.length}, Committed Melds: ${this.committedBoardMelds.length}`);
  }

  humanDrawTile() {
    console.log(`[HUMAN DRAW] Human drawing tile...`);
    const currentCommittedBoard = JSON.parse(JSON.stringify(this.committedBoardMeldsRef));
    const drawnTile = this.tilePoolRef[0];
    const remainingPool = this.tilePoolRef.slice(1);

    const updatedPlayers = JSON.parse(JSON.stringify(this.playersRef));
    updatedPlayers[0].rack.push(drawnTile);
    updatedPlayers[0].handTiles.push({ tile: drawnTile, x: 0, y: 0 });

    this.advanceTurn(currentCommittedBoard, updatedPlayers, remainingPool, false);
  }

  botTurn() {
    console.log(`[BOT TURN] Bot executing turn...`);
    const latestBoard = this.boardMeldsRef;
    const latestPool = this.tilePoolRef;
    const latestPlayers = this.playersRef;
    const latestAiIndex = this.activePlayerIndexRef;
    const latestAiPlayer = latestPlayers[latestAiIndex];

    const aiResult = executeAiTurn(latestAiPlayer, latestBoard, latestPool);
    const normAiBoard = normalizeBoard(aiResult.newBoardMelds);

    const updatedPlayers = JSON.parse(JSON.stringify(latestPlayers));
    updatedPlayers[latestAiIndex].rack = aiResult.newAiRack;
    updatedPlayers[latestAiIndex].handTiles = aiResult.newAiRack.map((t, i) => ({ tile: t, x: i * 48, y: 0 }));

    const nextPool = aiResult.drewTile && latestPool.length > 0 ? latestPool.slice(1) : latestPool;
    this.advanceTurn(normAiBoard, updatedPlayers, nextPool, true);
  }

  humanPlayMeldAndEndTurn() {
    console.log(`[HUMAN MELD] Human playing 30+ meld...`);
    const meldTiles: Tile[] = [
      { id: 'red_10', color: 'red', value: 10, isJoker: false },
      { id: 'red_11', color: 'red', value: 11, isJoker: false },
      { id: 'red_12', color: 'red', value: 12, isJoker: false },
    ];
    const meld: Meld = {
      id: 'human_30pts_meld',
      tiles: meldTiles,
      isValid: true,
      type: 'run',
      value: 33,
    };

    const currentBoard = JSON.parse(JSON.stringify(this.boardMeldsRef));
    currentBoard.push(meld);
    this.boardMelds = currentBoard;
    this.boardMeldsRef = currentBoard;

    const normBoard = normalizeBoard(currentBoard);
    const updatedPlayers = JSON.parse(JSON.stringify(this.playersRef));
    updatedPlayers[0].hasInitialMeld = true;

    console.log(`[HUMAN END TURN] Submitting 30+ meld turn...`);
    this.advanceTurn(normBoard, updatedPlayers, this.tilePoolRef, true);
  }
}

const sim = new MultiTurnSim();

// Turn 1
sim.humanDrawTile();
sim.botTurn();

// Turn 2
sim.humanDrawTile();
sim.botTurn();

// Turn 3: Human plays 30+ meld & ends turn
sim.humanPlayMeldAndEndTurn();

// Turn 3: Bot takes turn
sim.botTurn();

// Turn 4: Human draws tile on the very next turn after playing meld!
sim.humanDrawTile();

console.log('----------------------------------------------------');
console.log(`RESULT: Board Melds = ${sim.boardMelds.length}, Committed Melds = ${sim.committedBoardMelds.length}`);
if (sim.boardMelds.length === 1 && sim.boardMelds[0].id === 'human_30pts_meld') {
  console.log('✅ TEST PASSED in simulation!');
} else {
  console.log('❌ TEST FAILED in simulation!');
}
console.log('----------------------------------------------------');
