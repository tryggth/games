import 'global-jsdom/register';
import React, { act } from 'react';
(globalThis as any).React = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(window as any).matchMedia = (window as any).matchMedia || function() {
  return { matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} };
};
Element.prototype.scrollTo = Element.prototype.scrollTo || function() {};

import { createRoot } from 'react-dom/client';
import App from '../src/App.tsx';

// Mock canvas-confetti
(globalThis as any).confetti = () => {};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testUserExactRepro() {
  console.log('====================================================');
  console.log('🧪 TESTING USER REPRO: PLAY 30+ MELD THEN DRAW ON NEXT TURN');
  console.log('====================================================');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(App));
  });

  function getStatus() {
    const debugText = document.querySelector('.bg-slate-900\\/90 span.text-amber-300')?.textContent || '';
    const boardTitle = document.querySelector('h2')?.textContent || '';
    return { debugText, boardTitle };
  }

  console.log('[INITIAL BOARD]', getStatus());

  // Access human hand tiles from DOM
  const tileElements = Array.from(document.querySelectorAll('[data-tile-id]'));
  console.log(`Found ${tileElements.length} tiles in DOM.`);

  // Click 3 tiles in hand to select them
  // Let's click first 3 tiles
  if (tileElements.length >= 3) {
    await act(async () => {
      (tileElements[0] as HTMLElement).click();
      (tileElements[1] as HTMLElement).click();
      (tileElements[2] as HTMLElement).click();
    });
  }

  // Find buttons
  const buttons = Array.from(document.querySelectorAll('button'));
  console.log('Buttons found:', buttons.map(b => b.textContent?.trim()));

  const drawBtn = buttons.find(b => b.textContent?.includes('Draw Tile & Pass'));
  const endTurnBtn = buttons.find(b => b.textContent?.includes('End Turn'));

  console.log('Draw Button disabled?', drawBtn?.hasAttribute('disabled'));
  console.log('End Turn Button exists?', !!endTurnBtn);
}

testUserExactRepro().catch(console.error);
