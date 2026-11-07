'use client'

import { useState } from 'react';
import { Check, Link2, Minus, Plus, X } from 'lucide-react';
import { checkedIn, need, type SPlayer, type SessionSettings } from '@/lib/session/sessionReducer';
import { Btn, Card, Empty, IconBtn, ImportModal, Label, Stars, useApp } from './ui';

export default function SessionSetup() {
  const { state, dispatch } = useApp();
  const s = state.session!;
  const [q, setQ] = useState('');
  const [showOpts, setShowOpts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  const set = (patch: Partial<SessionSettings>) => dispatch({ t: 'setSettings', patch });
  const here = checkedIn(s).length;
  const required = need(s);
  const away = s.players.filter(p => p.status === 'notHere' && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const nameOf = (id: string | null) => s.players.find(p => p.id === id)?.name;

  const add = () => {
    if (!q.trim()) return;
    dispatch({ t: 'addPlayer', name: q, now: Date.now() });
    setQ('');
  };
  const link = (id: string) => {
    if (!linkFrom) return setLinkFrom(id);
    if (linkFrom !== id) dispatch({ t: 'link', a: linkFrom, b: id });
    setLinkFrom(null);
  };

  const row = (p: SPlayer, isHere: boolean) => (
    <li key={p.id} className="py-3 flex flex-col gap-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
          {p.linkedPartnerId && (
            <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
              <Link2 size={10} /> Paired with {nameOf(p.linkedPartnerId)}
              <button aria-label={`Unpair ${p.name}`} onClick={() => dispatch({ t: 'unlink', id: p.id })}><X size={10} /></button>
            </p>
          )}
        </div>
        <Stars value={p.rating} onChange={r => dispatch({ t: 'setRating', id: p.id, rating: r })} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {isHere
          ? <Btn small tone="gray" onClick={() => dispatch({ t: 'removeFromQueue', id: p.id })}>Undo check-in</Btn>
          : <Btn small tone="green" onClick={() => dispatch({ t: 'checkIn', id: p.id, now: Date.now() })}><Check size={12} /> Check in</Btn>}
        {s.settings.gameType === 'doubles' && (
          <Btn small tone={linkFrom === p.id ? 'blue' : 'gray'} onClick={() => link(p.id)}>
            <Link2 size={12} /> {linkFrom === p.id ? 'Pick partner' : 'Pair'}
          </Btn>
        )}
        {!isHere && <button className="text-[11px] font-black text-[#FF3B6A] uppercase tracking-widest min-h-[36px] px-2"
          onClick={() => dispatch({ t: 'removePlayer', id: p.id })}>Remove</button>}
      </div>
    </li>
  );

  const toggle = (on: boolean, change: (v: boolean) => void, label: string) => (
    <label className="flex items-center justify-between gap-3 min-h-[44px] text-xs font-bold text-gray-700">
      {label}
      <input type="checkbox" checked={on} onChange={e => change(e.target.checked)} className="w-5 h-5 accent-[#00D68F]" />
    </label>
  );
  const field = 'bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 min-h-[44px]';

  return (
    <div className="space-y-4 px-3 sm:px-0 pb-32">
      {/* 1. progress */}
      <Card className="p-4">
        <Label>Setup progress</Label>
        <ol className="mt-2 flex gap-2 text-[11px] font-black uppercase tracking-wider">
          {[['Set up session', true], ['Add players', s.players.length > 0], ['Start', here >= required]].map(([t, done], i) => (
            <li key={i} className={`flex-1 rounded-xl px-2 py-2 text-center ${done ? 'bg-[#00D68F]/10 text-[#00A870]' : 'bg-gray-100 text-gray-400'}`}>
              {i + 1}. {t as string}
            </li>
          ))}
        </ol>
      </Card>

      {/* 2. name + courts */}
      <Card className="p-4 space-y-4">
        <div>
          <Label>Session name</Label>
          <div className="flex items-center justify-between gap-2 mt-1">
            {renaming
              ? <input autoFocus defaultValue={s.name} className={field + ' flex-1'} onBlur={e => { dispatch({ t: 'setName', name: e.target.value.trim() || 'Open Play' }); setRenaming(false); }}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} aria-label="Session name" />
              : <p className="text-lg font-black text-gray-900">{s.name}</p>}
            {!renaming && <button className="text-[11px] font-black text-blue-600 uppercase tracking-widest min-h-[44px] px-2" onClick={() => setRenaming(true)}>Rename</button>}
          </div>
        </div>
        <div>
          <Label>Courts</Label>
          <div className="flex items-center gap-4 mt-1">
            <IconBtn label="Fewer courts" className="bg-gray-100 !min-w-[44px] !min-h-[44px]" disabled={s.courts.length <= 1}
              onClick={() => dispatch({ t: 'removeCourt', id: s.courts[s.courts.length - 1].id })}><Minus size={18} /></IconBtn>
            <span className="text-3xl font-black text-gray-900 w-10 text-center">{s.courts.length}</span>
            <IconBtn label="More courts" className="bg-gray-100 !min-w-[44px] !min-h-[44px]" onClick={() => dispatch({ t: 'addCourt' })}><Plus size={18} /></IconBtn>
          </div>
        </div>
      </Card>

      {/* 3. settings */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <Label>Session settings</Label>
          <button className="text-[11px] font-black text-blue-600 uppercase tracking-widest min-h-[44px] px-2" onClick={() => setShowOpts(!showOpts)}>
            {showOpts ? 'Hide options' : 'View options'}
          </button>
        </div>
        <dl className="text-xs font-bold text-gray-700 space-y-1.5 mt-1">
          {[
            ['Game type', s.settings.gameType === 'doubles' ? 'Doubles' : 'Singles'],
            ['Games per player', s.settings.gamesLimit ? `Max ${s.settings.gamesLimit}` : 'No limit'],
            ['Unpair after', s.settings.unpairAfter ? `${s.settings.unpairAfter} games` : 'Unlimited'],
            ['Ranking', `${s.settings.rankingBy === 'wins' ? 'Total wins' : 'Win %'}`],
            ['Public standings', s.settings.showStandings ? 'On' : 'Off'],
          ].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-gray-400">{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {showOpts && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div className="bg-gray-100 p-1 rounded-xl grid grid-cols-2 text-center text-xs font-black tracking-wider">
              {(['doubles', 'singles'] as const).map(t => (
                <button key={t} onClick={() => set({ gameType: t })} className={`py-2.5 min-h-[44px] rounded-lg uppercase ${s.settings.gameType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>{t}</button>
              ))}
            </div>
            {toggle(s.settings.gamesLimit != null, v => set({ gamesLimit: v ? 5 : null }), 'Limit games per player')}
            {s.settings.gamesLimit != null && (
              <input type="number" min={1} aria-label="Games per player" className={field + ' w-full'} value={s.settings.gamesLimit}
                onChange={e => set({ gamesLimit: Math.max(1, Number(e.target.value) || 1) })} />
            )}
            <label className="block text-xs font-bold text-gray-700">Automatically unpair after
              <select className={field + ' w-full mt-1'} value={s.settings.unpairAfter ?? ''} onChange={e => set({ unpairAfter: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Unlimited</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} games</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-gray-700">Rank by
              <select className={field + ' w-full mt-1'} value={s.settings.rankingBy} onChange={e => set({ rankingBy: e.target.value as 'wins' | 'winPct' })}>
                <option value="wins">Total wins</option><option value="winPct">Win percentage</option>
              </select>
            </label>
            {toggle(s.settings.showStandings, v => set({ showStandings: v }), 'Player standings on the public view')}
          </div>
        )}
      </Card>

      {/* 4. matching mode */}
      <Card className="p-4">
        <Label>Matching mode</Label>
        <div className="mt-2 flex items-start gap-3 rounded-xl border-2 border-[#00D68F] bg-[#00D68F]/5 p-3">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-[#00D68F] text-white flex items-center justify-center shrink-0"><Check size={12} strokeWidth={4} /></span>
          <div>
            <p className="text-sm font-black text-gray-900">Balanced <span className="ml-1 text-[9px] bg-[#00D68F] text-white rounded-md px-1.5 py-0.5 uppercase tracking-wider">Recommended</span></p>
            <p className="text-[11px] font-bold text-gray-500">Even teams by rating, in queue order, with fresh partners and opponents.</p>
          </div>
        </div>
      </Card>

      {/* 5. players */}
      <Card className="p-4">
        <Label>Add players</Label>
        <div className="flex gap-2 mt-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Search or add a player" aria-label="Search or add a player" className={field + ' flex-1 min-w-0'} />
          <Btn tone="dark" onClick={add} disabled={!q.trim()}>Add</Btn>
        </div>
        <Btn tone="gray" small className="mt-2" onClick={() => setImporting(true)}>Import player list</Btn>

        <div className="flex justify-between items-center mt-4">
          <Label>Not yet here ({away.length})</Label>
          {away.length > 0 && <Btn small tone="green" onClick={() => dispatch({ t: 'checkInAll', now: Date.now() })}>Check in all</Btn>}
        </div>
        {away.length ? <ul>{away.map(p => row(p, false))}</ul> : <Empty>{q ? 'No match. Press Enter to add.' : 'Nobody waiting to check in.'}</Empty>}

        {here > 0 && (
          <>
            <div className="mt-4"><Label>Checked in ({here})</Label></div>
            <ul>{s.players.filter(p => p.status !== 'notHere').sort((a, b) => a.queueEnteredAt - b.queueEnteredAt).map(p => row(p, true))}</ul>
          </>
        )}
      </Card>

      {/* 6. sticky start */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-100 p-3">
        <div className="max-w-2xl mx-auto">
          <Btn tone="green" full disabled={here < required} onClick={() => dispatch({ t: 'start', now: Date.now() })} className="!min-h-[52px] !text-sm">
            {here < required ? `${here}/${required} checked in` : 'Start play'}
          </Btn>
        </div>
      </div>

      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}
