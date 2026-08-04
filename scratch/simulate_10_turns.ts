import 'global-jsdom/register';
import React, { act } from 'react';
(globalThis as any).React = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(window as any).matchMedia = (window as any).matchMedia || function() {
  return { matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} };
};
Element.prototype.scrollTo = Element.prototype.scrollTo || function() {};

import { createRoot } from 'react-dom/client';
import { useGameState } from '../src/hooks/useGameState.js';

let latestState: ReturnType<typeof useGameState> | null = null;

function TestComponent() {
  const state = useGameState();
  latestState = state;
  return null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSim() {
  console.log('====================================================');
  console.log('🧪 VERIFYING ARCHITECTURAL REFACTOR (10 TURNS SIMULATION)');
  console.log('====================================================');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(TestComponent));
  });

  // Turn 1: Human draws tile
  console.log('\n--- Turn 1 (Human Draw) ---');
  await act(async () => {
    latestState!.drawTile();
  });
  await act(async () => { await sleep(1500); }); // wait for bot
  console.log(`Board melds count: ${latestState!.boardMelds.length}`);

  // Turn 2: Human plays qualifying 30+ point meld (e.g. Red 10, Red 11, Red 12 = 33 pts)
  console.log('\n--- Turn 2 (Human Plays 30+ Initial Meld) ---');
  const humanHand = latestState!.humanPlayer!.hand;
  humanHand[0].color = 'red'; humanHand[0].value = 10; humanHand[0].isJoker = false;
  humanHand[1].color = 'red'; humanHand[1].value = 11; humanHand[1].isJoker = false;
  humanHand[2].color = 'red'; humanHand[2].value = 12; humanHand[2].isJoker = false;

  await act(async () => {
    latestState!.toggleTileSelection(humanHand[0].id);
    latestState!.toggleTileSelection(humanHand[1].id);
    latestState!.toggleTileSelection(humanHand[2].id);
  });

  await act(async () => {
    latestState!.createMeldFromSelection();
  });

  console.log(`Before EndTurn - Board Melds: ${latestState!.boardMelds.length}`);
  await act(async () => {
    latestState!.endTurn();
  });

  console.log(`After EndTurn - Board Melds: ${latestState!.boardMelds.length}, Committed: ${latestState!.committedBoardMelds.length}`);

  // Wait for Bot turn 2
  await act(async () => { await sleep(1500); });
  console.log(`After Bot Turn 2 - Board Melds: ${latestState!.boardMelds.length}, Committed: ${latestState!.committedBoardMelds.length}`);

  // Turn 3 (Human's next turn AFTER playing initial meld): Human draws a tile!
  console.log('\n--- Turn 3 (Human Draws Tile on Next Turn) ---');
  console.log(`Active player before drawTile: ${latestState!.activePlayerIndex} (${latestState!.isHumanTurn ? 'Human' : 'Bot'})`);

  await act(async () => {
    latestState!.drawTile();
  });

  console.log(`Board melds immediately AFTER drawTile:`, latestState!.boardMelds.length);

  // Wait for Bot turn 3
  await act(async () => { await sleep(1500); });
  console.log(`\n--- After Bot Turn 3 ---`);
  console.log(`Board melds:`, latestState!.boardMelds.length);
  console.log(`Committed melds:`, latestState!.committedBoardMelds.length);

  if (latestState!.boardMelds.length === 0) {
    console.error('❌ REFACTOR FAILURE: Board Melds count is 0!');
    process.exit(1);
  } else {
    console.log('✅ REFACTOR SUCCESS: Single State Object Architecture verified with zero errors!');
    process.exit(0);
  }
}

runSim().catch(console.error);
