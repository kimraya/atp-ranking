'use client'

import { useEffect, useState } from 'react';
import { ChevronDown, Megaphone, Pencil, Plus, RefreshCw, Repeat, Trophy, X } from 'lucide-react';
import {
  courtMatch, finishedOf, queueOf, reducer, validSwaps, warningsFor,
  type Match, type Session,
} from '@/lib/session/sessionReducer';
import { sessionStandings } from '@/lib/session/stats';
import RecordScoreModal from './RecordScoreModal';
import { Btn, Card, clock, Empty, IconBtn, Label, mins, Modal, nameOf, RankBadge, ratingOf, Stars, TEAM, useApp } from './ui';

const team = (s: Session, ids: string[]) => ids.map(id => nameOf(s, id)).join(' / ');

export default function LiveSession() {
  const { state, dispatch } = useApp();
  const s = state.session!;
  const [tab, setTab] = useState<'courts' | 'upnext' | 'queue'>('courts');
  const [standings, setStandings] = useState(false);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const inUse = s.courts.filter(c => courtMatch(s, c.id)).length;
  const waiting = queueOf(s);
  const tabs = [['courts', `Courts (${s.courts.length})`], ['upnext', `Up Next (${s.upNext.length})`], ['queue', `Queue (${waiting.length})`]] as const;

  return (
    <div className="pb-24">
      {/* sub-bar with live counts */}
      <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="font-black text-sm truncate">{s.name}</p>
        <p className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          Courts <span className="text-[#00D68F] text-sm">{inUse}/{s.courts.length}</span>
          <span className="mx-2 text-gray-500">|</span>Players <span className="text-white text-sm">{s.players.filter(p => p.status !== 'notHere').length}</span>
          <span className="mx-2 text-gray-500">|</span>Queue <span className="text-amber-400 text-sm">{waiting.length}</span>
        </p>
      </div>

      <div role="tablist" className="grid grid-cols-3 bg-white border-b border-gray-100 sticky top-0 z-20">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-[48px] text-[11px] font-black uppercase tracking-wider border-b-4 ${tab === k ? 'border-[#00D68F] text-gray-900' : 'border-transparent text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-3 sm:px-0 pt-4 space-y-4">
        {tab === 'courts' && <><Courts now={now} /><UpNextSection /><MatchLog /></>}
        {tab === 'upnext' && <UpNextSection />}
        {tab === 'queue' && <><QueueTab now={now} /><MatchLog /></>}
        <div className="flex gap-2">
          <Btn tone="gray" small onClick={() => setStandings(true)}><Trophy size={12} /> Standings</Btn>
          <Btn tone="red" small onClick={() => setEnding(true)}>End session</Btn>
        </div>
      </div>

      {standings && <StandingsModal onClose={() => setStandings(false)} />}
      {ending && (
        <Modal title="End this session?" onClose={() => setEnding(false)}>
          <p className="text-sm font-bold text-gray-700">Open play will be finished and saved to Recent sessions. You cannot reopen it.</p>
          <ul className="text-xs font-bold text-gray-600 space-y-1 list-disc pl-4">
            <li>{finishedOf(s).length} finished game{finishedOf(s).length === 1 ? '' : 's'} will be saved.</li>
            {inUse > 0
              ? <li className="text-[#FF3B6A]">{inUse} game{inUse === 1 ? '' : 's'} still on court will be dropped. Record the result first if you want {inUse === 1 ? 'it' : 'them'} to count.</li>
              : <li>No games are still on court.</li>}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="gray" autoFocus onClick={() => setEnding(false)}>Keep playing</Btn>
            <Btn tone="red" onClick={() => dispatch({ t: 'endSession', now: Date.now() })}>Yes, end session</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Courts ----------------
function Courts({ now }: { now: number }) {
  const { state, dispatch, toast, dispatchUndoable } = useApp();
  const s = state.session!;
  const [choose, setChoose] = useState<string | null>(null);
  const [score, setScore] = useState<string | null>(null);

  const finish = (m: Match, winner: 1 | 2) => {
    const courtName = s.courts.find(c => c.id === m.courtId)?.name ?? 'Court';
    const act = { t: 'recordResult', matchId: m.id, winner, now: Date.now() } as const;
    const next = reducer(state, act).session!;
    dispatchUndoable(act, 'Recorded result', `Team ${winner} won on ${courtName}`);
    const up = next.upNext[0];
    if (up) toast({ title: `${courtName} ready`, sub: team(next, [...up.team1, ...up.team2]), action: { label: 'Start', tone: 'green', run: () => dispatch({ t: 'sendToCourt', matchId: up.id, courtId: m.courtId!, now: Date.now() }) } });
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Live courts ({s.courts.length})</h2>
        <Btn small tone="gray" onClick={() => dispatch({ t: 'addCourt' })}><Plus size={12} /> Add court</Btn>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {s.courts.map(c => {
          const m = courtMatch(s, c.id);
          const up = s.upNext[0];
          const rename = () => { const n = prompt('Court name', c.name); if (n) dispatch({ t: 'renameCourt', id: c.id, name: n }); };
          if (!m) {
            return (
              <div key={c.id} className="bg-white rounded-[20px] border-2 border-dashed border-gray-300 p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <p className="font-black text-gray-900 truncate">{c.name}</p>
                  <IconBtn label={`Rename ${c.name}`} onClick={rename}><Pencil size={14} /></IconBtn>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-[#00D68F]/10 text-[#00A870] rounded-full px-2 py-1">Available</span>
                  <IconBtn label={`Remove ${c.name}`} className="ml-auto" disabled={s.courts.length <= 1}
                    onClick={() => confirm(`Remove ${c.name}?`) && dispatch({ t: 'removeCourt', id: c.id })}><X size={16} /></IconBtn>
                </div>
                <p className="text-xs font-bold text-gray-600 min-h-[2.5rem]">
                  {up ? <>{team(s, up.team1)} <span className="text-gray-400">vs</span> {team(s, up.team2)}</> : 'Not enough players waiting yet.'}
                </p>
                <Btn tone="green" full disabled={!up} onClick={() => dispatch({ t: 'sendToCourt', matchId: up.id, courtId: c.id, now: Date.now() })}>Start Up Next 1</Btn>
                <Btn tone="gray" full onClick={() => setChoose(c.id)}>Choose players</Btn>
              </div>
            );
          }
          return (
            <div key={c.id} className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between gap-2">
                <p className="font-black truncate">{c.name}</p>
                <p className="font-black tabular-nums text-[#00D68F]" aria-label="Game timer">{clock(now - (m.startedAt ?? now))}</p>
              </div>
              <div className="grid grid-cols-2">
                {([1, 2] as const).map(t => (
                  <div key={t} className={`${TEAM[t].tint} p-3 space-y-2`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${TEAM[t].text}`}>Team {t}</p>
                    {(t === 1 ? m.team1 : m.team2).map(id => (
                      <div key={id}><p className="text-sm font-black text-gray-900 truncate">{nameOf(s, id)}</p><Stars value={ratingOf(s, id)} /></div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Btn tone="blue" onClick={() => finish(m, 1)}>Team 1 wins</Btn>
                  <Btn tone="orange" onClick={() => finish(m, 2)}>Team 2 wins</Btn>
                </div>
                <Btn tone="gray" full onClick={() => setScore(m.id)}>Record score</Btn>
              </div>
            </div>
          );
        })}
      </div>
      {choose && <PickPlayersModal title="Choose players" confirm="Start game" onClose={() => setChoose(null)}
        onPick={(t1, t2) => { dispatch({ t: 'choosePlayers', courtId: choose, team1: t1, team2: t2, now: Date.now() }); setChoose(null); }} />}
      {score && <RecordScoreModal matchId={score} onClose={() => setScore(null)} />}
    </section>
  );
}

// ---------------- Pick players (manual match / choose players) ----------------
function PickPlayersModal({ title, confirm: label, onClose, onPick }: {
  title: string; confirm: string; onClose: () => void; onPick: (t1: string[], t2: string[]) => void;
}) {
  const { state } = useApp();
  const s = state.session!;
  const per = s.settings.gameType === 'singles' ? 1 : 2;
  const [t1, setT1] = useState<string[]>([]);
  const [t2, setT2] = useState<string[]>([]);
  const pool = queueOf(s);

  const toggle = (id: string) => {
    if (t1.includes(id)) return setT1(t1.filter(x => x !== id));
    if (t2.includes(id)) return setT2(t2.filter(x => x !== id));
    if (t1.length < per) setT1([...t1, id]);
    else if (t2.length < per) setT2([...t2, id]);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[11px] font-bold text-gray-500">Tap players in order: the first {per} go to Team 1, the next {per} to Team 2. Tap again to remove.</p>
      {pool.length ? (
        <ul className="space-y-1.5">
          {pool.map(p => {
            const side = t1.includes(p.id) ? 1 : t2.includes(p.id) ? 2 : 0;
            return (
              <li key={p.id}>
                <button onClick={() => toggle(p.id)} aria-pressed={side > 0}
                  className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3 text-left text-sm font-black ${side ? TEAM[side as 1 | 2].tint + ' ' + TEAM[side as 1 | 2].text : 'bg-gray-50 text-gray-800'}`}>
                  {p.name}<span className="text-[10px] uppercase tracking-widest">{side ? `Team ${side}` : <Stars value={p.rating} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <Empty>No players in queue.</Empty>}
      <Btn tone="green" full disabled={t1.length !== per || t2.length !== per} onClick={() => onPick(t1, t2)}>{label}</Btn>
    </Modal>
  );
}

// ---------------- Up Next ----------------
function UpNextSection() {
  const { state, dispatch } = useApp();
  const s = state.session!;
  const [adding, setAdding] = useState(false);
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Up next ({s.upNext.length})</h2>
        <div className="flex gap-2">
          <Btn small tone="gray" onClick={() => dispatch({ t: 'rebuild' })}><RefreshCw size={12} /> Refresh up next</Btn>
          <Btn small tone="gray" onClick={() => setAdding(true)}><Plus size={12} /> Add match</Btn>
        </div>
      </div>
      {s.upNext.map((m, i) => <UpNextCard key={m.id} m={m} index={i} />)}
      {s.upNext.length === 0 && (
        <div className="rounded-[20px] border-2 border-dashed border-gray-200 text-center py-6 text-xs font-bold text-gray-400">Not enough players waiting yet.</div>
      )}
      {adding && <PickPlayersModal title="Add match" confirm="Add to up next" onClose={() => setAdding(false)}
        onPick={(t1, t2) => { dispatch({ t: 'addManualMatch', team1: t1, team2: t2 }); setAdding(false); }} />}
    </section>
  );
}

function UpNextCard({ m, index }: { m: Match; index: number }) {
  const { state, dispatch, toast, dispatchUndoable } = useApp();
  const s = state.session!;
  const [switching, setSwitching] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const warnings = warningsFor(s, m);
  const free = s.courts.find(c => !courtMatch(s, c.id));
  const valid = switching ? validSwaps(s, m, switching) : [];

  const tap = (id: string) => {
    if (!switching) return;
    if (id === switching) return setSwitching(null);
    if (valid.includes(id)) { dispatch({ t: 'switchTeams', matchId: m.id, a: switching, b: id }); setSwitching(null); }
  };
  const call = () => {
    const text = `Calling ${team(s, m.team1)} versus ${team(s, m.team2)}`;
    try { window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch { /* no speech support */ }
    toast({ title: 'Calling players', sub: text });
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <p className="font-black text-gray-900">Up Next {index + 1}</p>
        <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 rounded-md px-1.5 py-0.5">{m.source === 'auto' ? 'Auto' : 'Manual'}</span>
        {m.source === 'auto' && <button onClick={() => dispatch({ t: 'rebuild' })} className="text-[11px] font-black text-blue-600 uppercase tracking-wider inline-flex items-center gap-1 min-h-[36px] px-1"><RefreshCw size={11} /> Rebuild</button>}
        <IconBtn label="Remove this match" className="ml-auto" onClick={() => dispatchUndoable({ t: 'removeUpNext', matchId: m.id }, 'Match removed')}><X size={16} /></IconBtn>
      </div>
      <div className="flex h-1.5"><div className={`flex-1 ${TEAM[1].bar}`} /><div className={`flex-1 ${TEAM[2].bar}`} /></div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {([1, 2] as const).map(t => (
          <div key={t} className="space-y-2">
            <p className={`text-[10px] font-black uppercase tracking-widest ${TEAM[t].text}`}>Team {t}</p>
            {(t === 1 ? m.team1 : m.team2).map(id => {
              const isSel = switching === id, ok = valid.includes(id);
              return (
                <div key={id} onClick={() => tap(id)}
                  className={`rounded-lg px-2 py-1.5 flex items-center justify-between gap-1 ${isSel ? 'ring-2 ring-gray-900' : ok ? 'ring-2 ring-[#00D68F] bg-[#00D68F]/10 cursor-pointer' : ''}`}>
                  <div className="min-w-0"><p className="text-sm font-black text-gray-900 truncate">{nameOf(s, id)}</p><Stars value={ratingOf(s, id)} /></div>
                  {!switching && <IconBtn label={`Switch teams for ${nameOf(s, id)}`} onClick={e => { e.stopPropagation(); setSwitching(id); }}><Repeat size={14} /></IconBtn>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {switching && <p className="px-4 pb-2 text-[11px] font-bold text-gray-500">{valid.length ? 'Tap a highlighted player to swap, or tap the selected player to cancel.' : 'No valid swap. Tap the selected player to cancel.'}</p>}
      {warnings.length > 0 && (
        <div className="mx-4 mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Matchup heads-up</p>
          <p className="text-xs font-bold text-amber-900">{warnings[0].message}</p>
          {warnings.length > 1 && <button className="text-[11px] font-black text-amber-700 underline min-h-[36px]" onClick={() => setDetails(!details)}>{details ? 'Hide details' : 'Show details'}</button>}
          {details && <ul className="text-xs font-bold text-amber-900 list-disc pl-4">{warnings.slice(1).map((w, i) => <li key={i}>{w.message}</li>)}</ul>}
        </div>
      )}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <Btn tone="green" disabled={!free} onClick={() => free && dispatch({ t: 'sendToCourt', matchId: m.id, courtId: free.id, now: Date.now() })}>{free ? 'Send to court' : 'No court free'}</Btn>
        <Btn tone="gray" onClick={call}><Megaphone size={14} /> Call players</Btn>
      </div>
    </Card>
  );
}

// ---------------- Queue ----------------
function QueueTab({ now }: { now: number }) {
  const { state, dispatch, dispatchUndoable } = useApp();
  const s = state.session!;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const q = queueOf(s);
  const inNext = new Set(s.upNext.flatMap(m => [...m.team1, ...m.team2]));
  const submit = () => {
    if (!name.trim()) return;
    dispatch({ t: 'addPlayer', name, rating, checkIn: true, now: Date.now() });
    setName(''); setRating(null); setAdding(false);
  };
  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <p className="font-black">Queue ({q.length})</p>
        <Btn small tone="green" onClick={() => setAdding(true)}><Plus size={12} /> Add player</Btn>
      </div>
      {q.length ? (
        <ol className="divide-y divide-gray-100">
          {q.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl font-black text-gray-300 w-8 text-center">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-gray-900 truncate">{p.name}{inNext.has(p.id) && <span className="ml-2 text-[9px] uppercase tracking-wider bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">Up next</span>}</p>
                <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5"><Stars value={p.rating} size={11} /> · {p.gamesPlayed} games · waiting {mins(now - p.queueEnteredAt)}</p>
              </div>
              <IconBtn label={`Remove ${p.name} from queue`} onClick={() => dispatchUndoable({ t: 'removeFromQueue', id: p.id }, 'Removed from queue', p.name)}><X size={16} /></IconBtn>
            </li>
          ))}
        </ol>
      ) : <Empty>No players in queue.</Empty>}
      {adding && (
        <Modal title="Add player" onClose={() => setAdding(false)}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Name" aria-label="Player name"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-base font-bold min-h-[44px]" />
          <Stars value={rating} onChange={setRating} />
          <Btn tone="green" full disabled={!name.trim()} onClick={submit}>Check in</Btn>
        </Modal>
      )}
    </Card>
  );
}

// ---------------- Match log ----------------
function MatchLog() {
  const { state, dispatch } = useApp();
  const s = state.session!;
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<string | null>(null);
  const [fix, setFix] = useState<Match | null>(null);
  const done = finishedOf(s);
  const avg = done.length ? done.reduce((n, m) => n + (m.endedAt! - m.startedAt!), 0) / done.length : 0;
  return (
    <Card>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full min-h-[48px] px-4 flex items-center justify-between text-left">
        <span className="font-black text-gray-900">Match log ({done.length})</span>
        <span className="flex items-center gap-2 text-[11px] font-bold text-gray-400">{done.length > 0 && `Avg ${mins(avg)}`}<ChevronDown size={16} className={open ? 'rotate-180' : ''} /></span>
      </button>
      {open && (done.length ? (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {[...done].reverse().map((m, i) => {
            const w = m.winnerTeam === 1 ? m.team1 : m.team2, l = m.winnerTeam === 1 ? m.team2 : m.team1;
            return (
              <li key={m.id} className="px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-gray-500">Game {done.length - i} · {s.courts.find(c => c.id === m.courtId)?.name ?? 'Court'}</p>
                <p className="text-sm font-black"><span className={m.winnerTeam === 1 ? TEAM[1].text : TEAM[2].text}>✓ {team(s, w)}</span> <span className="text-gray-400 font-bold">beat</span> <span className="text-gray-500">{team(s, l)}</span></p>
                <div className="flex gap-2 flex-wrap">
                  <Btn small onClick={() => setFix(m)}>Fix teams</Btn>
                  <Btn small onClick={() => dispatch({ t: 'swapWinner', matchId: m.id })}>Swap winner</Btn>
                  <Btn small onClick={() => setScore(m.id)}>Record score</Btn>
                  <Btn small tone="red" onClick={() => confirm('Delete this match? Player stats will be reversed.') && dispatch({ t: 'deleteMatch', matchId: m.id })}>Delete match</Btn>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <Empty>No finished games yet.</Empty>)}
      {score && <RecordScoreModal matchId={score} onClose={() => setScore(null)} />}
      {fix && <FixTeams m={fix} onClose={() => setFix(null)} />}
    </Card>
  );
}

function FixTeams({ m, onClose }: { m: Match; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const s = state.session!;
  const [t1, setT1] = useState(m.team1);
  const [t2, setT2] = useState(m.team2);
  const [sel, setSel] = useState<string | null>(null);
  const tap = (id: string) => {
    if (!sel) return setSel(id);
    if (sel === id) return setSel(null);
    const a = sel, b = id, sw = (t: string[]) => t.map(x => (x === a ? b : x === b ? a : x));
    if ((t1.includes(a) && t2.includes(b)) || (t2.includes(a) && t1.includes(b))) { setT1(sw(t1)); setT2(sw(t2)); }
    setSel(null);
  };
  return (
    <Modal title="Fix teams" onClose={onClose}>
      <p className="text-[11px] font-bold text-gray-500">Tap a player, then a player on the other team, to swap them.</p>
      <div className="grid grid-cols-2 gap-3">
        {([[1, t1], [2, t2]] as const).map(([t, ids]) => (
          <div key={t} className={`${TEAM[t].tint} rounded-xl p-3 space-y-2`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${TEAM[t].text}`}>Team {t}</p>
            {ids.map(id => <button key={id} onClick={() => tap(id)} className={`w-full min-h-[44px] rounded-lg bg-white text-sm font-black text-left px-2 ${sel === id ? 'ring-2 ring-gray-900' : ''}`}>{nameOf(s, id)}</button>)}
          </div>
        ))}
      </div>
      <Btn tone="dark" full onClick={() => { dispatch({ t: 'fixTeams', matchId: m.id, team1: t1, team2: t2 }); onClose(); }}>Save</Btn>
    </Modal>
  );
}

function StandingsModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const s = state.session!;
  const rows = sessionStandings(s);
  return (
    <Modal title="Session standings" onClose={onClose}>
      {rows.length ? (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 min-h-[44px] text-sm font-black">
              <span><RankBadge rank={r.ranked ? i + 1 : null} />{r.name}</span>
              <span className="text-xs text-gray-500">{r.wins}W / {r.games - r.wins}L · {Math.round(r.winPct * 100)}%</span>
            </li>
          ))}
        </ol>
      ) : <Empty>No finished games yet.</Empty>}
      <Label>Ranked by {s.settings.rankingBy === 'wins' ? 'total wins' : 'win percentage'}.</Label>
    </Modal>
  );
}
