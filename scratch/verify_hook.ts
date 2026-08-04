import 'global-jsdom/register';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useGameState } from '../src/hooks/useGameState.js';
import type { Tile, Meld } from '../src/types/game.js';

let latestState: ReturnType<typeof useGameState> | null = null;

function TestComponent() {
  const state = useGameState();
  latestState = state;
  return null;
}

async function runTest() {
  console.log('--- STARTING HOOK INTEGRATION TEST ---');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(TestComponent));
  });

  console.log(`Initial Board Melds: ${latestState!.boardMelds.length}`);
  console.log(`Initial Human Hand: ${latestState!.humanPlayer?.handTiles.length}`);
  console.log(`Initial hasInitialMeld: ${latestState!.humanPlayer?.hasInitialMeld}`);

  // Step 1: Draw tiles until human has a qualifying meld (or inject a 30+ point meld into hand)
  // Let's create a 30+ point meld: Red 10, Red 11, Red 12 (33 pts)
  const meldTiles: Tile[] = [
    { id: 'test_red_10', color: 'red', value: 10, isJoker: false },
    { id: 'test_red_11', color: 'red', value: 11, isJoker: false },
    { id: 'test_red_12', color: 'red', value: 12, isJoker: false },
  ];

  // Force human hand to contain these tiles
  const currentHand = latestState!.humanPlayer!.handTiles.map(ht => ht.tile);
  const newHand = [...currentHand, ...meldTiles];

  // Select the 3 meld tiles
  await act(async () => {
    latestState!.toggleTileSelection('test_red_10');
    latestState!.toggleTileSelection('test_red_11');
    latestState!.toggleTileSelection('test_red_12');
  });

  // Wait! Toggle selection on hand tiles: let's select existing tiles in hand that form a valid meld, or call createMeldFromSelection
  console.log(`Selected tiles: ${latestState!.selectedTileIds.length}`);

  // Step 2: Human plays qualifying meld (30+ points)
  // Let's test calling endTurn after playing a meld!
}

runTest().catch(console.error);
