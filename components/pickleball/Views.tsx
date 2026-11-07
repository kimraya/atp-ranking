'use client'

import { useState } from 'react';
import { ArrowDownAZ, Trash2, Trophy, Users } from 'lucide-react';
import { finishedOf, type Session } from '@/lib/session/sessionReducer';
import { leaderboard, sessionStandings } from '@/lib/session/stats';
import { Btn, Card, Empty, IconBtn, ImportModal, Label, Modal, RankBadge, Stars, useApp } from './ui';

const field = 'bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 min-h-[44px]';

// ---------------- Players ----------------
export function PlayersView() {
  const { state, dispatch } = useApp();
  const [q, setQ] = useState('');
  const [az, setAz] = useState(true);
  const [importing, setImporting] = useState(false);
  const list = state.roster
    .filter(p => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (az ? a.name.localeCompare(b.name) : 0));
  const add = () => { if (q.trim()) { dispatch({ t: 'addPlayer', name: q, now: Date.now() }); setQ(''); } };

  return (
    <div className="px-3 sm:px-0 py-4 space-y-3">
      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Search or add a player" aria-label="Search or add a player" className={field + ' flex-1 min-w-0'} />
          <Btn tone="dark" disabled={!q.trim()} onClick={add}>Add</Btn>
        </div>
        <div className="flex gap-2">
          <Btn small tone="gray" onClick={() => setImporting(true)}>Import player list</Btn>
          <Btn small tone={az ? 'dark' : 'gray'} onClick={() => setAz(!az)} aria-pressed={az}><ArrowDownAZ size={12} /> A-Z</Btn>
        </div>
        <p className="text-[11px] font-bold text-gray-500 bg-gray-50 rounded-xl p-3">Tip: tap the stars to rate a player. Tap the same star again to clear it.</p>
      </Card>
      {list.length ? (
        <Card className="divide-y divide-gray-100">
          {list.map(p => (
            <div key={p.id} className="p-3 flex items-center justify-between gap-2">
              <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
              <div className="flex items-center gap-1">
                <Stars value={p.rating} onChange={r => dispatch({ t: 'setRating', id: p.id, rating: r })} />
                <button className="text-[11px] font-black text-blue-600 uppercase min-h-[36px] px-2" onClick={() => { const n = prompt('Player name', p.name); if (n) dispatch({ t: 'renamePlayer', id: p.id, name: n }); }}>Edit</button>
                <IconBtn label={`Remove ${p.name}`} onClick={() => confirm(`Remove ${p.name}?`) && dispatch({ t: 'removePlayer', id: p.id })}><Trash2 size={15} /></IconBtn>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <div className="text-center py-10 text-gray-400"><Users className="mx-auto mb-2" /><Empty>No players yet.</Empty></div>
      )}
      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}

// ---------------- Stats ----------------
const DAY = 86400000;
export function StatsView() {
  const { state } = useApp();
  const [sortBy, setSortBy] = useState<'adjusted' | 'wins'>('adjusted');
  const [range, setRange] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const from = range ? Date.now() - range * DAY : undefined;
  // current leaderboard = finished sessions + the session being played right now
  const sessions = state.session ? [...state.past, state.session] : state.past;
  const rows = leaderboard(sessions, sortBy, { from });
  const ranked = rows.filter(r => r.ranked);
  const totalGames = sessions
    .filter(s => from == null || (s.endedAt ?? Number.MAX_SAFE_INTEGER) >= from)
    .reduce((n, s) => n + finishedOf(s).length, 0);

  const gamesOf = (id: string) => sessions.flatMap(s => finishedOf(s).filter(m => [...m.team1, ...m.team2].includes(id)).map(m => ({ s, m })));

  return (
    <div className="px-3 sm:px-0 py-4 space-y-3">
      <div className="flex gap-2">
        <select aria-label="Sort by" className={field + ' flex-1'} value={sortBy} onChange={e => setSortBy(e.target.value as 'adjusted' | 'wins')}>
          <option value="adjusted">Adjusted win rate</option><option value="wins">Total wins</option>
        </select>
        <select aria-label="Date filter" className={field} value={range} onChange={e => setRange(Number(e.target.value))}>
          <option value={0}>All time</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center"><p className="text-3xl font-black">{rows.length}</p><Label>Total players</Label></Card>
        <Card className="p-4 text-center"><p className="text-3xl font-black">{totalGames}</p><Label>Total games</Label></Card>
      </div>
      {ranked.length === 0 && (
        <div className="text-center py-8 text-gray-400"><Trophy className="mx-auto mb-2" /><Empty>Finish a game to get on the leaderboard.</Empty></div>
      )}
      {rows.length > 0 && (
        <Card className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <div key={r.id}>
              <button className="w-full min-h-[52px] px-4 flex items-center justify-between text-left" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                <span className="text-sm font-black text-gray-900"><RankBadge rank={r.ranked ? i + 1 : null} />{r.name}</span>
                <span className="text-xs font-bold text-gray-500 text-right">{(r.adjusted * 100).toFixed(0)}% adj · {Math.round(r.winPct * 100)}% raw<br />{r.wins}W / {r.games - r.wins}L</span>
              </button>
              {open === r.id && (
                <ul className="px-4 pb-3 text-xs font-bold text-gray-600 space-y-1">
                  {gamesOf(r.id).map(({ s, m }) => {
                    const won = (m.winnerTeam === 1 ? m.team1 : m.team2).includes(r.id);
                    return <li key={s.id + m.id}>{won ? '✓ Won' : '✗ Lost'} · {s.name} · {new Date(m.endedAt!).toLocaleDateString()}</li>;
                  })}
                </ul>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---------------- History ----------------
export function HistoryView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState<Session | null>(null);
  if (!state.past.length) return <div className="py-10"><Empty>No past sessions yet.</Empty></div>;
  return (
    <div className="px-3 sm:px-0 py-4 space-y-3">
      {state.past.map(s => (
        <Card key={s.id} className="p-4 flex items-center justify-between gap-2">
          <button className="text-left min-h-[44px] flex-1" onClick={() => setOpen(s)}>
            <p className="font-black text-gray-900">{s.name}</p>
            <p className="text-[11px] font-bold text-gray-400">{new Date(s.endedAt ?? 0).toLocaleString()} · {finishedOf(s).length} games · {s.players.filter(p => p.gamesPlayed > 0).length} players</p>
          </button>
          <IconBtn label={`Delete ${s.name}`} onClick={() => confirm(`Delete "${s.name}"? Its games will be removed from the leaderboard.`) && dispatch({ t: 'deleteSession', id: s.id })}><Trash2 size={16} /></IconBtn>
        </Card>
      ))}
      {open && (
        <Modal title={open.name} onClose={() => setOpen(null)}>
          <Label>Standings</Label>
          <ol className="space-y-1.5">
            {sessionStandings(open).map((r, i) => (
              <li key={r.id} className="flex justify-between rounded-xl bg-gray-50 px-3 min-h-[40px] items-center text-sm font-black">
                <span><RankBadge rank={r.ranked ? i + 1 : null} />{r.name}</span>
                <span className="text-xs text-gray-500">{r.wins}W / {r.games - r.wins}L</span>
              </li>
            ))}
          </ol>
          <Label>Games</Label>
          <ul className="text-xs font-bold text-gray-600 space-y-1">
            {finishedOf(open).map(m => {
              const nm = (ids: string[]) => ids.map(id => open.players.find(p => p.id === id)?.name ?? '?').join(' / ');
              return <li key={m.id}>{m.winnerTeam === 1 ? '✓ ' : ''}{nm(m.team1)} vs {m.winnerTeam === 2 ? '✓ ' : ''}{nm(m.team2)}</li>;
            })}
          </ul>
        </Modal>
      )}
    </div>
  );
}
