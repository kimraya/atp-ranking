import { formNextMatch, matchWarnings, sortQueue } from './formNextMatch';
import type { GameType, PlayedMatch, QueuePlayer, Warning } from './types';

export interface RosterPlayer { id: string; name: string; rating: number | null }
export type PlayerStatus = 'notHere' | 'waiting' | 'playing';
export interface SPlayer extends QueuePlayer { status: PlayerStatus }
export interface Match {
  id: string; team1: string[]; team2: string[]; source: 'auto' | 'manual';
  courtId: string | null; winnerTeam: 1 | 2 | null; startedAt: number | null; endedAt: number | null;
}
export interface Court { id: string; name: string }
export interface SessionSettings {
  gameType: GameType; gamesLimit: number | null; unpairAfter: number | null; showStandings: boolean;
  rankingBy: 'wins' | 'winPct';
}
export interface Session {
  id: string; name: string; courts: Court[]; settings: SessionSettings; status: 'setup' | 'live' | 'ended';
  players: SPlayer[]; upNext: Match[]; matches: Match[]; startedAt: number | null; endedAt: number | null;
}
export interface AppState { roster: RosterPlayer[]; session: Session | null; past: Session[]; undo: Session[]; seq: number; clock: number }

export type Action =
  | { t: 'load'; state: AppState }
  | { t: 'newSession' }
  | { t: 'setName'; name: string }
  | { t: 'setSettings'; patch: Partial<SessionSettings> }
  | { t: 'addCourt' } | { t: 'removeCourt'; id: string } | { t: 'renameCourt'; id: string; name: string }
  | { t: 'addPlayer'; name: string; rating?: number | null; checkIn?: boolean; now: number }
  | { t: 'importPlayers'; text: string }
  | { t: 'setRating'; id: string; rating: number | null } | { t: 'renamePlayer'; id: string; name: string }
  | { t: 'removePlayer'; id: string }
  | { t: 'checkIn'; id: string; now: number } | { t: 'checkInAll'; now: number }
  | { t: 'link'; a: string; b: string } | { t: 'unlink'; id: string }
  | { t: 'start'; now: number }
  | { t: 'sendToCourt'; matchId: string; courtId: string; now: number }
  | { t: 'choosePlayers'; courtId: string; team1: string[]; team2: string[]; now: number }
  | { t: 'recordResult'; matchId: string; winner: 1 | 2; now: number }
  | { t: 'removeFromQueue'; id: string }
  | { t: 'rebuild' }
  | { t: 'addManualMatch'; team1: string[]; team2: string[] }
  | { t: 'switchTeams'; matchId: string; a: string; b: string }
  | { t: 'removeUpNext'; matchId: string }
  | { t: 'fixTeams'; matchId: string; team1: string[]; team2: string[] }
  | { t: 'swapWinner'; matchId: string } | { t: 'deleteMatch'; matchId: string }
  | { t: 'endSession'; now: number } | { t: 'deleteSession'; id: string }
  | { t: 'undo'; expect?: number }; // expect: only undo if the stack is still this long (toast Undo)

export const initialState = (): AppState => ({ roster: [], session: null, past: [], undo: [], seq: 1, clock: 0 });

export const DEFAULT_SETTINGS: SessionSettings = {
  gameType: 'doubles', gamesLimit: null, unpairAfter: null, showStandings: true, rankingBy: 'wins',
};

// ---------- selectors ----------
export const need = (s: Session) => (s.settings.gameType === 'singles' ? 2 : 4);
export const checkedIn = (s: Session) => s.players.filter(p => p.status !== 'notHere');
export const queueOf = (s: Session) => sortQueue(s.players.filter(p => p.status === 'waiting'));
export const courtMatch = (s: Session, courtId: string) =>
  s.matches.find(m => m.courtId === courtId && m.startedAt != null && m.endedAt == null) ?? null;
export const finishedOf = (s: Session) => s.matches.filter(m => m.endedAt != null).sort((a, b) => a.endedAt! - b.endedAt!);
const historyOf = (s: Session): PlayedMatch[] => finishedOf(s).map(m => ({ team1: m.team1, team2: m.team2 }));
const eligible = (s: Session) =>
  s.players.filter(p => p.status === 'waiting' && (s.settings.gamesLimit == null || p.gamesPlayed < s.settings.gamesLimit));
const members = (m: Match) => [...m.team1, ...m.team2];

const linkedFn = (s: Session) => (a: string, b: string) => {
  const pa = s.players.find(p => p.id === a), pb = s.players.find(p => p.id === b);
  const u = s.settings.unpairAfter;
  const on = (p?: SPlayer, o?: string) => !!p && p.linkedPartnerId === o && (u == null || p.linkedGamesTogether < u);
  return s.settings.gameType === 'doubles' && (on(pa, b) || on(pb, a));
};
export function warningsFor(s: Session, m: Match): Warning[] {
  return matchWarnings(m.team1, m.team2, historyOf(s), id => s.players.find(p => p.id === id)?.name ?? id, linkedFn(s));
}
// Players on the other team that `pid` may swap with without splitting an active linked pair.
export function validSwaps(s: Session, m: Match, pid: string): string[] {
  const mine = m.team1.includes(pid) ? m.team1 : m.team2;
  const other = mine === m.team1 ? m.team2 : m.team1;
  const linked = linkedFn(s);
  return other.filter(o => {
    const t1 = (mine === m.team1 ? m.team1 : m.team2).map(x => (x === pid ? o : x));
    const t2 = other.map(x => (x === o ? pid : x));
    return ![t1, t2].some(t => t.some(x => s.players.some(p => linked(x, p.id) && p.id !== x && !t.includes(p.id) && [...m.team1, ...m.team2].includes(p.id))));
  });
}

// ---------- reducer ----------
const NO_UNDO = new Set(['load', 'undo', 'newSession', 'endSession', 'deleteSession']);

export function reducer(state: AppState, a: Action): AppState {
  if (a.t === 'load') return a.state;
  if (a.t === 'undo') {
    if (!state.undo.length || !state.session || (a.expect != null && a.expect !== state.undo.length)) return state;
    const n = structuredClone(state);
    n.session = n.undo.pop()!;
    return n;
  }
  const n = structuredClone(state);
  if ('now' in a) n.clock = a.now;
  apply(n, a);
  if (!NO_UNDO.has(a.t) && state.session?.status === 'live' && n.session?.status === 'live'
    && JSON.stringify(state.session) !== JSON.stringify(n.session)) {
    n.undo = [...state.undo, state.session].slice(-30);
  }
  return n;
}

function apply(n: AppState, a: Action) {
  const id = (p: string) => `${p}${n.seq++}`;
  const s = n.session;

  if (a.t === 'newSession') {
    n.session = {
      id: id('s'), name: 'Open Play', courts: [{ id: id('c'), name: 'Court 1' }], settings: { ...DEFAULT_SETTINGS },
      status: 'setup', players: n.roster.map(r => fresh(r, 'notHere')), upNext: [], matches: [], startedAt: null, endedAt: null,
    };
    n.undo = [];
    return;
  }
  if (a.t === 'deleteSession') { n.past = n.past.filter(x => x.id !== a.id); return; }

  // roster-level edits work with or without a session
  if (a.t === 'renamePlayer' || a.t === 'setRating') {
    const upd = (p: { id: string; name: string; rating: number | null }) => {
      if (p.id !== a.id) return;
      if (a.t === 'renamePlayer' && a.name.trim()) p.name = a.name.trim();
      if (a.t === 'setRating') p.rating = a.rating;
    };
    n.roster.forEach(upd);
    s?.players.forEach(upd);
    return;
  }
  if (a.t === 'removePlayer') {
    n.roster = n.roster.filter(r => r.id !== a.id);
    if (s) s.players = s.players.filter(p => p.id !== a.id || p.status !== 'notHere');
    return;
  }
  if (a.t === 'addPlayer' || a.t === 'importPlayers') {
    const rows = a.t === 'addPlayer' ? [{ name: a.name, rating: a.rating ?? null }] : parseImport(a.text);
    for (const row of rows) {
      const name = row.name.trim();
      if (!name) continue;
      let r = n.roster.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!r) { r = { id: id('p'), name, rating: row.rating }; n.roster.push(r); }
      if (s && !s.players.some(p => p.id === r!.id)) s.players.push(fresh(r, 'notHere'));
      if (s && a.t === 'addPlayer' && a.checkIn) checkInOne(s, r.id, a.now);
    }
    if (s?.status === 'live') fill(n, s);
    return;
  }
  if (!s) return;

  switch (a.t) {
    case 'setName': s.name = a.name; break;
    case 'setSettings': s.settings = { ...s.settings, ...a.patch }; if (s.status === 'live') fill(n, s); break;
    case 'addCourt': {
      const num = 1 + Math.max(0, ...s.courts.map(c => parseInt(c.name.replace(/\D/g, '')) || 0));
      s.courts.push({ id: id('c'), name: `Court ${num}` });
      if (s.status === 'live') fill(n, s);
      break;
    }
    case 'removeCourt':
      if (s.courts.length > 1 && !courtMatch(s, a.id)) s.courts = s.courts.filter(c => c.id !== a.id);
      break;
    case 'renameCourt': { const c = s.courts.find(x => x.id === a.id); if (c && a.name.trim()) c.name = a.name.trim(); break; }
    case 'checkIn': checkInOne(s, a.id, a.now); if (s.status === 'live') fill(n, s); break;
    case 'checkInAll': s.players.forEach(p => checkInOne(s, p.id, a.now)); if (s.status === 'live') fill(n, s); break;
    case 'link': {
      if (a.a === a.b) break;
      for (const p of s.players) if (p.linkedPartnerId === a.a || p.linkedPartnerId === a.b) p.linkedPartnerId = null;
      const pa = s.players.find(p => p.id === a.a), pb = s.players.find(p => p.id === a.b);
      if (pa && pb) { pa.linkedPartnerId = pb.id; pb.linkedPartnerId = pa.id; pa.linkedGamesTogether = pb.linkedGamesTogether = 0; }
      break;
    }
    case 'unlink': {
      const p = s.players.find(x => x.id === a.id);
      for (const q of s.players) if (q.id === a.id || q.id === p?.linkedPartnerId) q.linkedPartnerId = null;
      break;
    }
    case 'start':
      if (s.status === 'setup' && checkedIn(s).length >= need(s)) { s.status = 'live'; s.startedAt = a.now; fill(n, s); }
      break;
    case 'sendToCourt': {
      const m = s.upNext.find(x => x.id === a.matchId);
      if (!m || courtMatch(s, a.courtId) || !s.courts.some(c => c.id === a.courtId)) break;
      if (m.source === 'auto') {
        // players ahead of the latest-chosen member who were not picked get passed over once
        const others = new Set(s.upNext.filter(x => x !== m).flatMap(members));
        const sorted = sortQueue(eligible(s).filter(p => !others.has(p.id)));
        const inM = new Set(members(m));
        const last = Math.max(...sorted.map((p, i) => (inM.has(p.id) ? i : -1)));
        sorted.slice(0, last).filter(p => !inM.has(p.id)).forEach(p => { s.players.find(x => x.id === p.id)!.passedOverCount++; });
      }
      s.upNext = s.upNext.filter(x => x !== m);
      startMatch(s, m, a.courtId, a.now);
      fill(n, s);
      break;
    }
    case 'choosePlayers': {
      const all = [...a.team1, ...a.team2];
      const ok = a.team1.length === a.team2.length && all.length === need(s) && new Set(all).size === all.length
        && all.every(pid => s.players.find(p => p.id === pid)?.status === 'waiting');
      if (!ok || courtMatch(s, a.courtId)) break;
      s.upNext = s.upNext.filter(m => !members(m).some(pid => all.includes(pid)));
      startMatch(s, { id: id('m'), team1: a.team1, team2: a.team2, source: 'manual', courtId: null, winnerTeam: null, startedAt: null, endedAt: null }, a.courtId, a.now);
      fill(n, s);
      break;
    }
    case 'recordResult': {
      const m = s.matches.find(x => x.id === a.matchId);
      if (!m || m.endedAt != null || m.startedAt == null) break;
      m.winnerTeam = a.winner; m.endedAt = a.now;
      for (const pid of members(m)) {
        const p = s.players.find(x => x.id === pid);
        if (!p) continue;
        p.status = 'waiting'; p.gamesPlayed++; p.queueEnteredAt = a.now; p.passedOverCount = 0;
      }
      pairBump(s, [m.team1, m.team2], 1);
      fill(n, s);
      break;
    }
    case 'removeFromQueue': {
      const p = s.players.find(x => x.id === a.id);
      if (!p || p.status !== 'waiting') break;
      p.status = 'notHere';
      s.upNext = s.upNext.filter(m => !members(m).includes(a.id));
      fill(n, s);
      break;
    }
    case 'rebuild': s.upNext = s.upNext.filter(m => m.source === 'manual'); fill(n, s); break;
    case 'addManualMatch': {
      const all = [...a.team1, ...a.team2];
      const ok = a.team1.length === a.team2.length && all.length === need(s) && new Set(all).size === all.length
        && all.every(pid => s.players.find(p => p.id === pid)?.status === 'waiting')
        && !s.upNext.some(m => m.source === 'manual' && members(m).some(pid => all.includes(pid)));
      if (!ok) break;
      s.upNext = s.upNext.filter(m => !members(m).some(pid => all.includes(pid)));
      s.upNext.push({ id: id('m'), team1: a.team1, team2: a.team2, source: 'manual', courtId: null, winnerTeam: null, startedAt: null, endedAt: null });
      fill(n, s);
      break;
    }
    case 'switchTeams': {
      const m = s.upNext.find(x => x.id === a.matchId);
      if (!m || !validSwaps(s, m, a.a).includes(a.b)) break;
      const sw = (t: string[]) => t.map(x => (x === a.a ? a.b : x === a.b ? a.a : x));
      m.team1 = sw(m.team1); m.team2 = sw(m.team2); m.source = 'manual';
      break;
    }
    case 'removeUpNext': s.upNext = s.upNext.filter(m => m.id !== a.matchId); break;
    case 'fixTeams': {
      const m = s.matches.find(x => x.id === a.matchId && x.endedAt != null);
      if (!m || a.team1.length !== m.team1.length || a.team2.length !== m.team2.length) break;
      const before = new Set(members(m)), after = new Set([...a.team1, ...a.team2]);
      if (after.size !== before.size) break;
      pairBump(s, [m.team1, m.team2], -1);
      pairBump(s, [a.team1, a.team2], 1);
      before.forEach(pid => { if (!after.has(pid)) bump(s, pid, -1); });
      after.forEach(pid => { if (!before.has(pid)) bump(s, pid, 1); });
      m.team1 = a.team1; m.team2 = a.team2;
      break;
    }
    case 'swapWinner': {
      const m = s.matches.find(x => x.id === a.matchId && x.endedAt != null);
      if (m) m.winnerTeam = m.winnerTeam === 1 ? 2 : 1;
      break;
    }
    case 'deleteMatch': {
      const m = s.matches.find(x => x.id === a.matchId && x.endedAt != null);
      if (!m) break;
      members(m).forEach(pid => bump(s, pid, -1));
      pairBump(s, [m.team1, m.team2], -1);
      s.matches = s.matches.filter(x => x !== m);
      break;
    }
    case 'endSession':
      // games still on court have no result, so they are dropped
      n.past.unshift({ ...s, status: 'ended', endedAt: a.now, matches: s.matches.filter(m => m.endedAt != null), upNext: [] });
      n.session = null; n.undo = [];
      break;
  }
}

// ---------- helpers ----------
const fresh = (r: RosterPlayer, status: PlayerStatus): SPlayer => ({
  id: r.id, name: r.name, rating: r.rating, status, checkedInAt: 0, queueEnteredAt: 0,
  gamesPlayed: 0, passedOverCount: 0, linkedPartnerId: null, linkedGamesTogether: 0,
});

function parseImport(text: string) {
  return text.split('\n').map(line => {
    const m = line.trim().match(/^(.*?)[\s,;]+([1-6])$/);
    return m ? { name: m[1], rating: Number(m[2]) } : { name: line, rating: null };
  });
}

function checkInOne(s: Session, pid: string, now: number) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.status === 'notHere') { p.status = 'waiting'; p.checkedInAt = now; p.queueEnteredAt = now; p.passedOverCount = 0; }
}

function bump(s: Session, pid: string, by: number) {
  const p = s.players.find(x => x.id === pid);
  if (p) p.gamesPlayed = Math.max(0, p.gamesPlayed + by);
}

// Games a linked pair played together (feeds "unpair after N games"). Floors at 0.
function pairBump(s: Session, teams: string[][], by: number) {
  for (const t of teams) for (const pid of t) {
    const p = s.players.find(x => x.id === pid);
    if (p?.linkedPartnerId && t.includes(p.linkedPartnerId)) p.linkedGamesTogether = Math.max(0, p.linkedGamesTogether + by);
  }
}

function startMatch(s: Session, m: Match, courtId: string, now: number) {
  m.courtId = courtId; m.startedAt = now;
  s.matches.push(m);
  for (const pid of members(m)) {
    const p = s.players.find(x => x.id === pid)!;
    p.status = 'playing'; p.passedOverCount = 0;
  }
}

// Keep one upcoming game per court whenever enough players wait. Existing entries are never reshuffled.
function fill(n: AppState, s: Session) {
  if (s.status !== 'live') return;
  const history = historyOf(s);
  while (s.upNext.length < s.courts.length) {
    const used = new Set(s.upNext.flatMap(members));
    const f = formNextMatch(eligible(s).filter(p => !used.has(p.id)), history, s.settings);
    if (!f) break;
    s.upNext.push({ id: `m${n.seq++}`, team1: f.team1, team2: f.team2, source: 'auto', courtId: null, winnerTeam: null, startedAt: null, endedAt: null });
  }
}
