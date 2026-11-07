import { STATS } from './config';
import { finishedOf, type Session } from './sessionReducer';

export interface Row { id: string; name: string; games: number; wins: number; winPct: number; adjusted: number; ranked: boolean }

function tally(sessions: Session[]) {
  const t = new Map<string, Row>();
  for (const s of sessions) {
    for (const m of finishedOf(s)) {
      if (!m.winnerTeam) continue;
      [m.team1, m.team2].forEach((team, i) => team.forEach(id => {
        const name = s.players.find(p => p.id === id)?.name ?? id;
        const r = t.get(id) ?? { id, name, games: 0, wins: 0, winPct: 0, adjusted: 0, ranked: false };
        r.games++; if (m.winnerTeam === i + 1) r.wins++;
        t.set(id, r);
      }));
    }
  }
  return t;
}

// Leaderboard over the sessions passed in (past ones plus the live one); deleting a session removes its games because nothing is stored separately.
export function leaderboard(sessions: Session[], sortBy: 'adjusted' | 'wins' = 'adjusted', range: { from?: number; to?: number } = {}): Row[] {
  // a session still running (no endedAt) counts as "now"
  const at = (s: Session) => s.endedAt ?? Number.MAX_SAFE_INTEGER;
  const inRange = sessions.filter(s => (range.from == null || at(s) >= range.from) && (range.to == null || at(s) <= range.to));
  const rows = [...tally(inRange).values()].map(r => ({
    ...r,
    winPct: r.wins / r.games,
    adjusted: (r.wins + STATS.ADJUST_PRIOR_GAMES * 0.5) / (r.games + STATS.ADJUST_PRIOR_GAMES),
    ranked: r.games >= STATS.MIN_GAMES_TO_RANK,
  }));
  return rows.sort((a, b) => Number(b.ranked) - Number(a.ranked) || b[sortBy === 'wins' ? 'wins' : 'adjusted'] - a[sortBy === 'wins' ? 'wins' : 'adjusted'] || b.games - a.games);
}

// Standings for one session using its ranking rule.
// shortcut: point differential tie-break skipped (games have no scores yet), add it when score entry exists.
export function sessionStandings(s: Session): (Row & { strength: number })[] {
  const t = tally([s]);
  const pct = (id: string) => { const r = t.get(id); return r ? r.wins / r.games : 0; };
  const faced = new Map<string, string[]>();
  for (const m of finishedOf(s)) {
    m.team1.forEach(id => faced.set(id, [...(faced.get(id) ?? []), ...m.team2]));
    m.team2.forEach(id => faced.set(id, [...(faced.get(id) ?? []), ...m.team1]));
  }
  const rows = [...t.values()].map(r => {
    const opp = faced.get(r.id) ?? [];
    return {
      ...r, winPct: r.wins / r.games, adjusted: r.wins / r.games,
      strength: opp.length ? opp.reduce((n, id) => n + pct(id), 0) / opp.length : 0,
      ranked: r.games >= STATS.MIN_GAMES_TO_RANK,
    };
  });
  const key = s.settings.rankingBy === 'wins' ? 'wins' : 'winPct';
  return rows.sort((a, b) => Number(b.ranked) - Number(a.ranked) || b[key] - a[key] || b.winPct - a.winPct || b.strength - a.strength);
}
