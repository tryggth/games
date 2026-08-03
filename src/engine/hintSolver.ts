import type { Tile, Meld } from '../types/game';
import { isValidMeld, getEffectiveMeldPointValue, normalizeMeld } from './validator';

export interface HintMove {
  id: string;
  type: 'new-meld' | 'extend-meld' | 'split-recombine';
  title: string;
  description: string;
  suggestedTileIds: string[];
  targetMeldId?: string;
  pointValue?: number;
}

export interface HintResult {
  hasMoves: boolean;
  moves: HintMove[];
}

/**
 * Validates that every resulting meld fragment contains at least 3 tiles and forms a valid Group or Run.
 */
function validateResultingMelds(resultingMelds: Tile[][]): boolean {
  return resultingMelds.every(
    (tiles) => tiles.length >= 3 && isValidMeld(tiles).isValid
  );
}

/**
 * Searches for all possible valid moves using the player's current hand tiles and table board melds.
 * Rules:
 * 1. If hasInitialMeld is false: ONLY search for new melds formed exclusively from hand tiles (>= 30 pts).
 * 2. If hasInitialMeld is true: Search new hand melds, table extensions, and table splits/recombinations.
 * 3. Point values for table moves reflect ONLY the net contributed points played from hand.
 */
export function findPossibleMoves(
  handTiles: Tile[],
  boardMelds: Meld[],
  hasInitialMeld: boolean
): HintResult {
  const moves: HintMove[] = [];
  const moveDescriptions = new Set<string>();

  const n = handTiles.length;

  // 1. Search for New Melds from Hand (subsets of length 3..6)
  if (n >= 3) {
    for (let len = 3; len <= Math.min(n, 6); len++) {
      const subsets = getSubsetsOfLength(handTiles, len);
      for (const subset of subsets) {
        const valRes = isValidMeld(subset);
        if (valRes.isValid) {
          const points = getEffectiveMeldPointValue(subset);
          // If initial meld not yet achieved, ONLY accept melds with points >= 30
          if (hasInitialMeld || points >= 30) {
            const norm = normalizeMeld(subset);
            const title = valRes.type === 'run' ? 'Play Run from Hand' : 'Play Group from Hand';
            const desc =
              valRes.type === 'run'
                ? `Form a Run of ${norm[0].color.toUpperCase()} (${norm[0].value}–${norm[norm.length - 1].value}) [${points} pts]`
                : `Form a Group of ${norm[0].value}s [${points} pts]`;

            if (!moveDescriptions.has(desc)) {
              moveDescriptions.add(desc);
              moves.push({
                id: `hint_new_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                type: 'new-meld',
                title,
                description: desc,
                suggestedTileIds: subset.map((t) => t.id),
                pointValue: points,
              });
            }
          }
        }
      }
    }
  }

  // ENFORCE INITIAL MELD RULE: If initial meld is NOT done, stop here!
  // Do NOT evaluate or suggest table extensions or table splits/recombinations.
  if (!hasInitialMeld) {
    moves.sort((a, b) => (b.pointValue || 0) - (a.pointValue || 0));
    return {
      hasMoves: moves.length > 0,
      moves: moves.slice(0, 6),
    };
  }

  // 2. Search for Table Extensions (ONLY when hasInitialMeld is true)
  for (const meld of boardMelds) {
    if (!meld.isValid) continue;

    const baseMeldValue = getEffectiveMeldPointValue(meld.tiles);

    for (const ht of handTiles) {
      // Test prepending to meld
      const prependSet = [ht, ...meld.tiles];
      if (isValidMeld(prependSet).isValid) {
        const netPoints = getEffectiveMeldPointValue(prependSet) - baseMeldValue;
        const desc = `Attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} to start of table meld (+${netPoints} pts)`;
        if (!moveDescriptions.has(desc)) {
          moveDescriptions.add(desc);
          moves.push({
            id: `hint_ext_pre_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            type: 'extend-meld',
            title: 'Extend Table Meld',
            description: desc,
            suggestedTileIds: [ht.id],
            targetMeldId: meld.id,
            pointValue: netPoints,
          });
        }
      }

      // Test appending to meld
      const appendSet = [...meld.tiles, ht];
      if (isValidMeld(appendSet).isValid) {
        const netPoints = getEffectiveMeldPointValue(appendSet) - baseMeldValue;
        const desc = `Attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} to end of table meld (+${netPoints} pts)`;
        if (!moveDescriptions.has(desc)) {
          moveDescriptions.add(desc);
          moves.push({
            id: `hint_ext_app_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            type: 'extend-meld',
            title: 'Extend Table Meld',
            description: desc,
            suggestedTileIds: [ht.id],
            targetMeldId: meld.id,
            pointValue: netPoints,
          });
        }
      }
    }
  }

  // 3. Search for Table Splits / Recombinations (ONLY when hasInitialMeld is true)
  for (const meld of boardMelds) {
    if (!meld.isValid || meld.tiles.length < 4) continue;

    for (let i = 1; i < meld.tiles.length; i++) {
      const left = meld.tiles.slice(0, i);
      const right = meld.tiles.slice(i);
      const baseLeftValue = getEffectiveMeldPointValue(left);
      const baseRightValue = getEffectiveMeldPointValue(right);

      for (const ht of handTiles) {
        // Case A: Attach hand tile to left fragment
        const leftPrepend = [ht, ...left];
        const leftAppend = [...left, ht];

        if (validateResultingMelds([leftPrepend, right])) {
          const netPoints = getEffectiveMeldPointValue(leftPrepend) - baseLeftValue;
          const desc = `Split table meld and attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} from hand (+${netPoints} pts)`;
          if (!moveDescriptions.has(desc)) {
            moveDescriptions.add(desc);
            moves.push({
              id: `hint_split_lp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'split-recombine',
              title: 'Split & Recombine Meld',
              description: desc,
              suggestedTileIds: [ht.id],
              targetMeldId: meld.id,
              pointValue: netPoints,
            });
          }
        }

        if (validateResultingMelds([leftAppend, right])) {
          const netPoints = getEffectiveMeldPointValue(leftAppend) - baseLeftValue;
          const desc = `Split table meld and attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} from hand (+${netPoints} pts)`;
          if (!moveDescriptions.has(desc)) {
            moveDescriptions.add(desc);
            moves.push({
              id: `hint_split_la_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'split-recombine',
              title: 'Split & Recombine Meld',
              description: desc,
              suggestedTileIds: [ht.id],
              targetMeldId: meld.id,
              pointValue: netPoints,
            });
          }
        }

        // Case B: Attach hand tile to right fragment
        const rightPrepend = [ht, ...right];
        const rightAppend = [...right, ht];

        if (validateResultingMelds([left, rightPrepend])) {
          const netPoints = getEffectiveMeldPointValue(rightPrepend) - baseRightValue;
          const desc = `Split table meld and attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} from hand (+${netPoints} pts)`;
          if (!moveDescriptions.has(desc)) {
            moveDescriptions.add(desc);
            moves.push({
              id: `hint_split_rp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'split-recombine',
              title: 'Split & Recombine Meld',
              description: desc,
              suggestedTileIds: [ht.id],
              targetMeldId: meld.id,
              pointValue: netPoints,
            });
          }
        }

        if (validateResultingMelds([left, rightAppend])) {
          const netPoints = getEffectiveMeldPointValue(rightAppend) - baseRightValue;
          const desc = `Split table meld and attach ${ht.color.toUpperCase()} ${ht.isJoker ? 'Joker' : ht.value} from hand (+${netPoints} pts)`;
          if (!moveDescriptions.has(desc)) {
            moveDescriptions.add(desc);
            moves.push({
              id: `hint_split_ra_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'split-recombine',
              title: 'Split & Recombine Meld',
              description: desc,
              suggestedTileIds: [ht.id],
              targetMeldId: meld.id,
              pointValue: netPoints,
            });
          }
        }
      }
    }
  }

  // Sort moves prioritizing highest net point values first
  moves.sort((a, b) => (b.pointValue || 0) - (a.pointValue || 0));

  return {
    hasMoves: moves.length > 0,
    moves: moves.slice(0, 6),
  };
}

function getSubsetsOfLength<T>(arr: T[], len: number): T[][] {
  const results: T[][] = [];
  function helper(start: number, current: T[]) {
    if (current.length === len) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return results;
}
