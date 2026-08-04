import 'global-jsdom/register';
import React, { act } from 'react';
(globalThis as any).React = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(window as any).matchMedia = (window as any).matchMedia || function() {
  return { matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} };
};

import { createRoot } from 'react-dom/client';
import { useGameState } from '../src/hooks/useGameState.js';
import type { Tile, Meld } from '../src/types/game.js';

let latestState: ReturnType<typeof useGameState> | null = null;

function TestComponent() {
  const state = useGameState();
  latestState = state;
  return null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHookTest() {
  console.log('====================================================');
  console.log('🧪 EXACT HOOK STATE TRACE TEST (VALID 30+ MELD)');
  console.log('====================================================');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(TestComponent));
  });

  console.log(`[STATE 1 - START] Board Melds: ${latestState!.boardMelds.length}, Committed Melds: ${latestState!.committedBoardMelds.length}`);

  // Modify human hand tiles to have a valid 30+ point run: Red 10, Red 11, Red 12
  const humanHand = latestState!.humanPlayer!.handTiles.map(ht => ht.tile);
  humanHand[0].color = 'red'; humanHand[0].value = 10; humanHand[0].isJoker = false;
  humanHand[1].color = 'red'; humanHand[1].value = 11; humanHand[1].isJoker = false;
  humanHand[2].color = 'red'; humanHand[2].value = 12; humanHand[2].isJoker = false;

  // Select the 3 tiles in hand
  await act(async () => {
    latestState!.toggleTileSelection(humanHand[0].id);
    latestState!.toggleTileSelection(humanHand[1].id);
    latestState!.toggleTileSelection(humanHand[2].id);
  });

  console.log(`[STATE 2 - SELECTED] Selected: ${latestState!.selectedTileIds.length}`);

  await act(async () => {
    latestState!.createMeldFromSelection();
  });

  console.log(`[STATE 3 - MELD CREATED] Board Melds: ${latestState!.boardMelds.length}, Meld isValid:`, latestState!.boardMelds[0]?.isValid, 'value:', latestState!.boardMelds[0]?.value);

  // Now Human ends turn
  await act(async () => {
    latestState!.endTurn();
  });

  console.log(`[STATE 4 - END TURN SUBMITTED] Active Player: ${latestState!.activePlayerIndex}, Board Melds: ${latestState!.boardMelds.length}, Committed Melds: ${latestState!.committedBoardMelds.length}`);

  // Wait for AI Bot turn timer (1200ms)
  await act(async () => {
    await sleep(1600);
  });

  console.log(`[STATE 5 - AFTER BOT TURN] Active Player: ${latestState!.activePlayerIndex}, Board Melds: ${latestState!.boardMelds.length}, Committed Melds: ${latestState!.committedBoardMelds.length}`);

  // NOW HUMAN TURN 2: Click "Draw Tile"
  console.log('>>> HUMAN DRAWING TILE ON NEXT TURN <<<');
  await act(async () => {
    latestState!.drawTile();
  });

  console.log(`[STATE 6 - AFTER DRAW TILE] Active Player: ${latestState!.activePlayerIndex}, Board Melds: ${latestState!.boardMelds.length}, Committed Melds: ${latestState!.committedBoardMelds.length}`);

  // Wait for AI Bot turn timer (1200ms)
  await act(async () => {
    await sleep(1600);
  });

  console.log(`[STATE 7 - FINAL BOARD AFTER BOT] Active Player: ${latestState!.activePlayerIndex}, Board Melds: ${latestState!.boardMelds.length}, Committed Melds: ${latestState!.committedBoardMelds.length}`);

  if (latestState!.boardMelds.length === 0) {
    console.error('❌ BUG REPRODUCED: Board Melds count dropped to 0!');
    process.exit(1);
  } else {
    console.log('✅ TEST PASSED: Board Melds count maintained!');
    process.exit(0);
  }
}

runHookTest().catch(console.error);
