import { describe, expect, it } from 'vitest';
import { formNextMatch, formUpNext, matchWarnings } from './formNextMatch';
import type { MatchSettings, QueuePlayer } from './types';

const dbl: MatchSettings = { gameType: 'doubles', unpairAfter: null };
const mk = (id: string, rating: number | null, order: number, extra: Partial<QueuePlayer> = {}): QueuePlayer => ({
  id, name: id, rating, checkedInAt: order, queueEnteredAt: order, gamesPlayed: 0,
  passedOverCount: 0, linkedPartnerId: null, linkedGamesTogether: 0, ...extra,
});
const ratings = { A: 1, B: 1, C: 6, D: 6, E: 1, F: 6, G: 6, H: 1 } as Record<string, number>;
const q = (ids: string) => ids.split('').map((id, i) => mk(id, ratings[id], i));
const sumOf = (t: string[]) => t.reduce((n, id) => n + ratings[id], 0);

describe('Balanced matching', () => {
  it('1. splits 1,1,6,6 into one 6 and one 1 per team', () => {
    const m = formNextMatch(q('ABCD'), [], dbl)!;
    expect(m.team1.map(id => ratings[id]).sort()).toEqual([1, 6]);
    expect(m.team2.map(id => ratings[id]).sort()).toEqual([1, 6]);
  });

  it('2. two courts, eight players: first four then next four, both balanced', () => {
    const [m1, m2] = formUpNext(q('ABCDEFGH'), [], dbl, 2);
    expect([...m1.team1, ...m1.team2].sort()).toEqual(['A', 'B', 'C', 'D']);
    expect([...m2.team1, ...m2.team2].sort()).toEqual(['E', 'F', 'G', 'H']);
    for (const m of [m1, m2]) expect(sumOf(m.team1)).toBe(sumOf(m.team2));
  });

  it('3. partner rotation: same four get new partners, still balanced', () => {
    const m = formNextMatch(q('ABCD'), [{ team1: ['C', 'B'], team2: ['D', 'A'] }], dbl)!;
    const has = (a: string, b: string) => [m.team1, m.team2].some(t => t.includes(a) && t.includes(b));
    expect(has('C', 'B')).toBe(false);
    expect(has('D', 'A')).toBe(false);
    expect(sumOf(m.team1)).toBe(sumOf(m.team2));
  });

  it('6. a full repeat is warned about but still returned', () => {
    const queue = [mk('A', 1, 0, { linkedPartnerId: 'B' }), mk('B', 1, 1, { linkedPartnerId: 'A' }),
      mk('C', 6, 2, { linkedPartnerId: 'D' }), mk('D', 6, 3, { linkedPartnerId: 'C' })];
    const m = formNextMatch(queue, [{ team1: ['A', 'B'], team2: ['C', 'D'] }], dbl)!;
    expect(m).not.toBeNull();
    expect(m.warnings.map(w => w.kind)).toContain('full');
    expect(matchWarnings(['A', 'C'], ['B', 'D'], [{ team1: ['A', 'C'], team2: ['B', 'D'] }], id => id).map(w => w.kind))
      .toEqual(expect.arrayContaining(['full', 'partner', 'opponent']));
  });

  it('7. results do not change pairings', () => {
    const base = { team1: ['C', 'B'], team2: ['D', 'A'] };
    const a = formNextMatch(q('ABCD'), [{ ...base, winner: 1 } as never], dbl);
    const b = formNextMatch(q('ABCD'), [{ ...base, winner: 2 } as never], dbl);
    expect(a).toEqual(b);
  });

  it('8. nobody is passed over more than twice, even in a big mixed queue', () => {
    let queue = Array.from({ length: 22 }, (_, i) => mk(`P${i}`, (i * 5) % 6 + 1, i));
    const history: { team1: string[]; team2: string[] }[] = [];
    for (let round = 0; round < 60; round++) {
      const m = formNextMatch(queue, history, dbl)!;
      const used = new Set([...m.team1, ...m.team2]);
      history.push({ team1: m.team1, team2: m.team2 });
      queue = queue.map(p => used.has(p.id)
        ? { ...p, passedOverCount: 0, gamesPlayed: p.gamesPlayed + 1, queueEnteredAt: 1000 + round * 10 + [...used].indexOf(p.id) }
        : { ...p, passedOverCount: p.passedOverCount + (m.passedOver.includes(p.id) ? 1 : 0) });
      expect(Math.max(...queue.map(p => p.passedOverCount))).toBeLessThanOrEqual(2);
    }
  });

  it('9. linked pair always shares a team until the unpair limit, then plays normally', () => {
    const linkedQ = (games: number) => [
      mk('A', 6, 0, { linkedPartnerId: 'B', linkedGamesTogether: games }),
      mk('B', 6, 1, { linkedPartnerId: 'A', linkedGamesTogether: games }), mk('C', 1, 2), mk('D', 1, 3)];
    const together = (m: ReturnType<typeof formNextMatch>) =>
      [m!.team1, m!.team2].some(t => t.includes('A') && t.includes('B'));
    expect(together(formNextMatch(linkedQ(0), [], dbl))).toBe(true);
    expect(together(formNextMatch(linkedQ(2), [], { ...dbl, unpairAfter: 3 }))).toBe(true);
    expect(together(formNextMatch(linkedQ(3), [], { ...dbl, unpairAfter: 3 }))).toBe(false);
  });

  it('tie-break: identical arrival time puts the player with fewer games first', () => {
    const queue = [mk('X', 3, 0, { gamesPlayed: 5 }), mk('Y', 3, 0, { gamesPlayed: 0 }), mk('Z', 3, 0), mk('W', 3, 0), mk('V', 3, 0)];
    const m = formNextMatch(queue, [], dbl)!;
    expect([...m.team1, ...m.team2]).not.toContain('X');
  });

  it('singles: pairs the closest rating and returns null when too few wait', () => {
    const queue = [mk('A', 1, 0), mk('B', 5, 1), mk('C', 2, 2)];
    const s: MatchSettings = { gameType: 'singles', unpairAfter: null };
    expect(formNextMatch(queue, [], s)!.team1.concat(formNextMatch(queue, [], s)!.team2).sort()).toEqual(['A', 'B']);
    expect(formNextMatch(queue.slice(0, 1), [], s)).toBeNull();
  });
});
