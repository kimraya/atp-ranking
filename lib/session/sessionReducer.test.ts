import { describe, expect, it } from 'vitest';
import { courtMatch, initialState, queueOf, reducer, validSwaps, type Action, type AppState } from './sessionReducer';
import { leaderboard, sessionStandings } from './stats';

const run = (s: AppState, ...acts: Action[]) => acts.reduce(reducer, s);
const ids = (s: AppState, names: string) => names.split(' ').map(n => s.roster.find(r => r.name === n)!.id);

// live session: players added in order at t=1, courts as given
function live(names: string[], courts = 1, extra: Action[] = []) {
  let s = run(initialState(), { t: 'newSession' });
  for (const n of names) s = run(s, { t: 'addPlayer', name: n, rating: 3, checkIn: true, now: 1 });
  for (let i = 1; i < courts; i++) s = run(s, { t: 'addCourt' });
  return run(s, { t: 'start', now: 2 }, ...extra);
}
const queueNames = (s: AppState) => s.session!.players.filter(p => p.status === 'waiting').sort((a, b) => a.queueEnteredAt - b.queueEnteredAt).map(p => p.name);
const on = (s: AppState, i: number) => s.session!.matches.filter(m => !m.endedAt)[i];
const send = (s: AppState, court: number): AppState =>
  run(s, { t: 'sendToCourt', matchId: s.session!.upNext[0].id, courtId: s.session!.courts[court].id, now: 10 });

describe('session flow', () => {
  it('start needs 4 checked in (2 for singles)', () => {
    let s = run(initialState(), { t: 'newSession' }, { t: 'addPlayer', name: 'A', checkIn: true, now: 1 }, { t: 'start', now: 2 });
    expect(s.session!.status).toBe('setup');
    s = run(s, { t: 'setSettings', patch: { gameType: 'singles' } }, { t: 'addPlayer', name: 'B', checkIn: true, now: 1 }, { t: 'start', now: 2 });
    expect(s.session!.status).toBe('live');
  });

  it('4. finishers rejoin behind everyone already waiting, walk-ins included', () => {
    let s = live(['a1', 'a2', 'a3', 'a4', 'a5'], 1);
    s = send(s, 0);
    s = run(s, { t: 'addPlayer', name: 'w1', checkIn: true, now: 20 });
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 });
    expect(queueNames(s)).toEqual(['a5', 'w1', 'a1', 'a2', 'a3', 'a4']);
  });

  it('5. walk-ins added while eight are on court play before the eight finishers', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], 2);
    s = send(s, 0); s = send(s, 1);
    for (const n of ['w1', 'w2', 'w3', 'w4']) s = run(s, { t: 'addPlayer', name: n, checkIn: true, now: 20 });
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 });
    const first = s.session!.upNext[0];
    expect([...first.team1, ...first.team2].sort()).toEqual(ids(s, 'w1 w2 w3 w4').sort());
  });

  it('10. a hand-edited Up Next match survives rebuilds and other results', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], 2);
    const m = s.session!.upNext[1];
    s = run(s, { t: 'switchTeams', matchId: m.id, a: m.team1[0], b: m.team2[0] });
    const edited = s.session!.upNext.find(x => x.id === m.id)!;
    expect(edited.source).toBe('manual');
    const teams = JSON.stringify([edited.team1, edited.team2]);
    s = send(s, 0);
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 2, now: 30 }, { t: 'rebuild' });
    const after = s.session!.upNext.find(x => x.id === m.id)!;
    expect(JSON.stringify([after.team1, after.team2])).toBe(teams);
  });

  it('11. undo puts players back on court, reverts stats and keeps queue order', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 1);
    s = send(s, 0);
    const before = JSON.stringify(s.session);
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 });
    expect(courtMatch(s.session!, s.session!.courts[0].id)).toBeNull();
    s = run(s, { t: 'undo' });
    expect(JSON.stringify(s.session)).toBe(before);
    expect(courtMatch(s.session!, s.session!.courts[0].id)).not.toBeNull();
    expect(s.session!.players.every(p => p.gamesPlayed === 0)).toBe(true);
  });

  it('7. winning does not group winners: queue position depends on finish time only', () => {
    let s = live(['p1', 'p2', 'p3', 'p4'], 1);
    s = send(s, 0);
    const m = on(s, 0);
    s = run(s, { t: 'recordResult', matchId: m.id, winner: 1, now: 30 });
    expect(s.session!.players.every(p => p.queueEnteredAt === 30)).toBe(true);
  });

  it('skips players who hit the games limit', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5'], 1, [{ t: 'setSettings', patch: { gamesLimit: 1 } }]);
    s = send(s, 0);
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 });
    expect(s.session!.upNext).toHaveLength(0); // only p5 is eligible
  });
});

describe('12. deleting a session removes its leaderboard contribution', () => {
  it('reverses stats', () => {
    const play = (winner: 1 | 2) => {
      let s = live(['p1', 'p2', 'p3', 'p4'], 1);
      s = send(s, 0);
      return run(s, { t: 'recordResult', matchId: on(s, 0).id, winner, now: 30 }, { t: 'endSession', now: 40 });
    };
    const a = play(1);
    const sessions = [a.past[0], { ...play(2).past[0], id: 'other' }];
    const before = leaderboard(sessions);
    expect(before.every(r => r.games === 2)).toBe(true);
    const after = leaderboard(sessions.filter(x => x.id !== 'other'));
    expect(after.every(r => r.games === 1)).toBe(true);
    const merged = reducer({ ...a, past: sessions }, { t: 'deleteSession', id: 'other' });
    expect(merged.past).toHaveLength(1);
  });
});

describe('reducer rules the matcher cannot see', () => {
  it('toast undo is ignored once a later action has changed the stack', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 1);
    s = send(s, 0);
    const res = { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 } as const;
    const at = reducer(s, res).undo.length;
    s = run(s, res, { t: 'addPlayer', name: 'w1', checkIn: true, now: 31 }); // a later action
    const after = JSON.stringify(s.session);
    expect(JSON.stringify(run(s, { t: 'undo', expect: at }).session)).toBe(after); // stale: nothing happens
    expect(JSON.stringify(run(s, { t: 'undo', expect: at + 1 }).session)).not.toBe(after);
  });

  it('sending an auto game to court passes over the players it skipped', () => {
    let s = run(initialState(), { t: 'newSession' });
    for (let i = 0; i < 20; i++) s = run(s, { t: 'addPlayer', name: `p${i}`, rating: ((i * 5) % 6) + 1, checkIn: true, now: 1 });
    s = run(s, { t: 'start', now: 2 });
    const m = s.session!.upNext[0];
    const q = queueOf(s.session!);
    const inM = new Set([...m.team1, ...m.team2]);
    const last = Math.max(...q.map((p, i) => (inM.has(p.id) ? i : -1)));
    const skipped = q.slice(0, last).filter(p => !inM.has(p.id)).map(p => p.id);
    expect(skipped.length).toBeGreaterThan(0); // the scenario really skips someone
    s = send(s, 0);
    const counts = (id: string) => s.session!.players.find(p => p.id === id)!.passedOverCount;
    expect(skipped.every(id => counts(id) === 1)).toBe(true);
    expect([...inM].every(id => counts(id) === 0)).toBe(true);
  });

  it('linked pair: games together are counted, and deleting the game takes them back', () => {
    let s = live(['a', 'b', 'c', 'd'], 1);
    const [a, b] = ids(s, 'a b');
    s = run(s, { t: 'link', a, b }, { t: 'rebuild' });
    s = send(s, 0);
    const m = on(s, 0);
    s = run(s, { t: 'recordResult', matchId: m.id, winner: 1, now: 30 });
    const together = () => s.session!.players.filter(p => p.id === a || p.id === b).map(p => p.linkedGamesTogether);
    expect(together()).toEqual([1, 1]);
    s = run(s, { t: 'deleteMatch', matchId: m.id });
    expect(together()).toEqual([0, 0]);
    expect(s.session!.players.every(p => p.gamesPlayed === 0)).toBe(true);
  });

  it('switch teams: never splits a linked pair, but swaps freely otherwise', () => {
    let s = live(['a', 'b', 'c', 'd'], 1);
    const [a, b, c] = ids(s, 'a b c');
    const m0 = s.session!.upNext[0];
    expect(validSwaps(s.session!, m0, a).length).toBe(2); // no link yet: both opponents are fine
    s = run(s, { t: 'link', a, b }, { t: 'rebuild' });
    const m = s.session!.upNext[0];
    expect(m.team1.includes(a) === m.team1.includes(b)).toBe(true); // pair on the same team
    expect(validSwaps(s.session!, m, a)).toEqual([]);
    const before = JSON.stringify(m);
    s = run(s, { t: 'switchTeams', matchId: m.id, a, b: c });
    expect(JSON.stringify(s.session!.upNext[0])).toBe(before); // rejected
  });
});

describe('session standings', () => {
  it('ranks by total wins and only ranks players with enough games', () => {
    let s = run(initialState(), { t: 'newSession' }, { t: 'setSettings', patch: { gameType: 'singles' } });
    for (const n of ['a', 'b', 'c']) s = run(s, { t: 'addPlayer', name: n, checkIn: true, now: 1 });
    s = run(s, { t: 'start', now: 2 });
    const [a, b, c] = ids(s, 'a b c');
    const game = (w: string, l: string) => {
      s = run(s, { t: 'choosePlayers', courtId: s.session!.courts[0].id, team1: [w], team2: [l], now: 10 });
      s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 20 });
    };
    game(a, b); game(a, c); game(b, c);
    s = run(s, { t: 'endSession', now: 99 });
    const rows = sessionStandings(s.past[0]);
    expect(rows.map(r => r.id)).toEqual([a, b, c]);
    expect(rows.every(r => r.ranked)).toBe(true); // everyone played 2
    expect(leaderboard(s.past).every(r => r.ranked)).toBe(true); // any number of games shows on the board
  });
});

describe('page refresh', () => {
  it('a saved and reloaded state is identical, including a game in progress and the undo stack', () => {
    let s = live(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 1);
    s = send(s, 0);
    const saved = JSON.stringify(s); // what PickleballApp writes to localStorage
    const back = reducer(initialState(), { t: 'load', state: JSON.parse(saved) });
    expect(JSON.stringify(back)).toBe(saved);
    expect(courtMatch(back.session!, back.session!.courts[0].id)?.startedAt).toBe(10); // timer keeps its start time
    expect(JSON.stringify(run(back, { t: 'undo' }).session)).toBe(JSON.stringify(run(s, { t: 'undo' }).session));
  });
});

describe('current leaderboard', () => {
  it('shows a player after one game, counting the session still being played', () => {
    let s = live(['p1', 'p2', 'p3', 'p4'], 1);
    s = send(s, 0);
    expect(leaderboard([s.session!])).toHaveLength(0); // nothing finished yet
    s = run(s, { t: 'recordResult', matchId: on(s, 0).id, winner: 1, now: 30 });
    const rows = leaderboard([...s.past, s.session!]);
    expect(rows).toHaveLength(4);
    expect(rows.every(r => r.games === 1 && r.ranked)).toBe(true);
    expect(rows.slice(0, 2).every(r => r.wins === 1)).toBe(true); // winners first
    expect(leaderboard([s.session!], 'adjusted', { from: 1 })).toHaveLength(4); // live session passes a date filter
  });
});
