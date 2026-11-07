import { MATCHING as M } from './config';
import type { FormedMatch, MatchSettings, PlayedMatch, QueuePlayer, Warning } from './types';

const rating = (p: QueuePlayer) => p.rating ?? M.UNRATED_RATING;

// Arrival order; on identical arrival time the player with fewer games goes first. Sort is stable.
export const sortQueue = (queue: QueuePlayer[]) =>
  [...queue].sort((a, b) => a.queueEnteredAt - b.queueEnteredAt || a.gamesPlayed - b.gamesPlayed);

function* combos<T>(arr: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) { yield [...acc]; return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    yield* combos(arr, k, i + 1, acc);
    acc.pop();
  }
}

// The last HISTORY_WINDOW games that player x was in.
function recent(x: string, history: PlayedMatch[]) {
  const out: PlayedMatch[] = [];
  for (let i = history.length - 1; i >= 0 && out.length < M.HISTORY_WINDOW; i--) {
    if (history[i].team1.includes(x) || history[i].team2.includes(x)) out.push(history[i]);
  }
  return out;
}
const together = (x: string, y: string, h: PlayedMatch[]) =>
  recent(x, h).filter(m => [m.team1, m.team2].some(t => t.includes(x) && t.includes(y))).length;
const against = (x: string, y: string, h: PlayedMatch[]) =>
  recent(x, h).filter(m => (m.team1.includes(x) && m.team2.includes(y)) || (m.team2.includes(x) && m.team1.includes(y))).length;

const pairs = (t: string[]) => t.flatMap((x, i) => t.slice(i + 1).map(y => [x, y] as const));

function repeatScore(t1: string[], t2: string[], h: PlayedMatch[], linked: (a: string, b: string) => boolean) {
  let s = 0;
  for (const [x, y] of [...pairs(t1), ...pairs(t2)]) {
    if (!linked(x, y)) s += M.PARTNER_REPEAT_WEIGHT * (together(x, y, h) + together(y, x, h));
  }
  for (const x of t1) for (const y of t2) s += M.OPPONENT_REPEAT_WEIGHT * (against(x, y, h) + against(y, x, h));
  return s;
}

// Heads-up messages for a match. Warns only; never blocks.
export function matchWarnings(
  t1: string[], t2: string[], history: PlayedMatch[],
  nameOf: (id: string) => string, linked: (a: string, b: string) => boolean = () => false,
): Warning[] {
  const out: Warning[] = [];
  const same = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
  const all = [...t1, ...t2];
  const recentAll = all.flatMap(x => recent(x, history));
  if (recentAll.some(m => (same(m.team1, t1) && same(m.team2, t2)) || (same(m.team1, t2) && same(m.team2, t1)))) {
    out.push({ kind: 'full', message: 'These players just played this exact matchup.' });
  }
  for (const [x, y] of [...pairs(t1), ...pairs(t2)]) {
    if (!linked(x, y) && together(x, y, history) + together(y, x, history) > 0) {
      out.push({ kind: 'partner', message: `${nameOf(x)} and ${nameOf(y)} just played together.` });
    }
  }
  if (t1.some(x => t2.some(y => against(x, y, history) + against(y, x, history) > 0))) {
    out.push({ kind: 'opponent', message: 'Some opponents faced each other recently.' });
  }
  return out;
}

// Form the next game from the waiting queue. Pure: results never affect pairings.
export function formNextMatch(queue: QueuePlayer[], history: PlayedMatch[], settings: MatchSettings): FormedMatch | null {
  const singles = settings.gameType === 'singles';
  const need = singles ? 2 : 4;
  const sorted = sortQueue(queue);
  if (sorted.length < need) return null;

  const byId = new Map(sorted.map(p => [p.id, p]));
  // Linked partner is "active" only while both wait and the unpair limit is not reached.
  const partnerOf = (p: QueuePlayer) =>
    !singles && p.linkedPartnerId && byId.has(p.linkedPartnerId) &&
    (settings.unpairAfter == null || p.linkedGamesTogether < settings.unpairAfter)
      ? p.linkedPartnerId : null;
  const linked = (a: string, b: string) => {
    const pa = byId.get(a), pb = byId.get(b);
    return !!pa && !!pb && (partnerOf(pa) === b || partnerOf(pb) === a);
  };

  // Skip limit: the first player already passed over MAX_SKIPS times must be included, and nobody behind them may be.
  const reqIdx = sorted.findIndex(p => p.passedOverCount >= M.MAX_SKIPS);
  const reach = sorted.length > M.LARGE_QUEUE_THRESHOLD ? M.LOOKAHEAD_LARGE : need;
  const pool = sorted.slice(0, reqIdx >= 0 ? Math.max(need, reqIdx + 1) : reach);
  const mustHave = reqIdx >= 0 ? sorted[reqIdx] : singles ? sorted[0] : null;

  const splits = (g: QueuePlayer[], respectLinks: boolean) => {
    const raw = singles ? [[[0], [1]]] : [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
    return raw
      .map(([a, b]) => [a.map(i => g[i]), b.map(i => g[i])])
      .filter(([a, b]) => !respectLinks || g.every(p => {
        const q = partnerOf(p);
        const mine = a.includes(p) ? a : b;
        return !q || !g.some(x => x.id === q) || mine.some(x => x.id === q);
      }));
  };

  const evaluate = (groups: Iterable<QueuePlayer[]>, strict: boolean) => {
    const cands: { t1: QueuePlayer[]; t2: QueuePlayer[]; cost: number; rep: number; idx: number }[] = [];
    for (const g of groups) {
      if (strict) {
        if (mustHave && !g.includes(mustHave)) continue;
        if (g.some(p => { const q = partnerOf(p); return q && !g.some(x => x.id === q); })) continue;
      }
      const idx = g.reduce((n, p) => n + sorted.indexOf(p), 0);
      for (const [t1, t2] of splits(g, strict)) {
        const gap = (t: QueuePlayer[]) => (t.length === 2 ? Math.abs(rating(t[0]) - rating(t[1])) : 0);
        const sum = (t: QueuePlayer[]) => t.reduce((n, p) => n + rating(p), 0);
        const cost = Math.abs(sum(t1) - sum(t2)) + M.SPREAD_PENALTY * (gap(t1) + gap(t2));
        const ids = (t: QueuePlayer[]) => t.map(p => p.id);
        cands.push({ t1, t2, cost, idx, rep: repeatScore(ids(t1), ids(t2), history, linked) });
      }
    }
    if (!cands.length) return null;
    const best = Math.min(...cands.map(c => c.cost));
    // Balance first; among similarly balanced options prefer fresh partners, then queue order.
    return cands
      .filter(c => c.cost <= best + M.BALANCE_TOLERANCE)
      .sort((a, b) => a.rep - b.rep || a.idx - b.idx || a.cost - b.cost)[0];
  };

  // Fallback: straight queue order if nothing in the pool satisfies the constraints.
  const pick = evaluate(combos(pool, need), true) ?? evaluate([sorted.slice(0, need)], false)!;
  const team1 = pick.t1.map(p => p.id);
  const team2 = pick.t2.map(p => p.id);
  const chosen = new Set([...team1, ...team2]);
  const last = Math.max(...[...chosen].map(id => sorted.findIndex(p => p.id === id)));
  return {
    team1,
    team2,
    warnings: matchWarnings(team1, team2, history, id => byId.get(id)!.name, linked),
    passedOver: sorted.slice(0, last).filter(p => !chosen.has(p.id)).map(p => p.id),
  };
}

// Form up to `count` upcoming games in a row from the same queue. Skip counts carry between them.
export function formUpNext(queue: QueuePlayer[], history: PlayedMatch[], settings: MatchSettings, count: number): FormedMatch[] {
  let left = queue.map(p => ({ ...p }));
  const out: FormedMatch[] = [];
  while (out.length < count) {
    const m = formNextMatch(left, history, settings);
    if (!m) break;
    out.push(m);
    const used = new Set([...m.team1, ...m.team2]);
    left = left.filter(p => !used.has(p.id)).map(p => (m.passedOver.includes(p.id) ? { ...p, passedOverCount: p.passedOverCount + 1 } : p));
  }
  return out;
}
