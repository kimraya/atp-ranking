'use client'

import Link from 'next/link';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { History, Menu, Trophy, Users, X, Play, ArrowLeft } from 'lucide-react';
import { initialState, reducer, type Action, type AppState } from '@/lib/session/sessionReducer';
import LiveSession from './LiveSession';
import SessionSetup from './SessionSetup';
import { HistoryView, PlayersView, StatsView } from './Views';
import { Btn, Ctx, IconBtn, type ToastItem } from './ui';

const KEY = 'pickleball-open-play-v1';
type View = 'session' | 'players' | 'stats' | 'history';
const VIEWS: [View, string, typeof Play][] = [['session', 'Session', Play], ['players', 'Players', Users], ['stats', 'Stats', Trophy], ['history', 'Recent sessions', History]];

export default function PickleballApp() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('session');
  const [menu, setMenu] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Session state lives in this browser only (no database).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : null;
      // ignore anything that does not look like our state, so bad data can never lock the page
      if (saved && Array.isArray(saved.roster) && Array.isArray(saved.past) && Array.isArray(saved.undo)
        && (saved.session === null || Array.isArray(saved.session?.players))) dispatch({ t: 'load', state: saved as AppState });
    } catch { /* corrupt or blocked storage: start fresh */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  }, [state, ready]);

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));
  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts(cur => [...cur.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(cur => cur.filter(x => x.id !== id)), 7000);
  }, []);

  const dispatchUndoable = (a: Action, title: string, sub?: string) => {
    const at = reducer(state, a).undo.length;
    dispatch(a);
    toast({ title, sub, undoAt: at, action: { label: 'Undo', tone: 'dark', run: () => dispatch({ t: 'undo', expect: at }) } });
  };

  const s = state.session;
  const live = view === 'session' && s?.status === 'live';

  return (
    <Ctx.Provider value={{ state, dispatch, toast, dispatchUndoable }}>
      <main className="min-h-screen bg-[#F4F6F9] font-sans">
        <div className="max-w-2xl mx-auto w-full">
          <header className="bg-gray-900 text-white px-3 py-3 flex items-center gap-2">
            <IconBtn label="Open menu" className="!text-white" onClick={() => setMenu(true)}><Menu size={20} /></IconBtn>
            <h1 className="text-base font-black tracking-tighter"><span>OPEN</span><span className="text-[#00D68F]">PLAY</span></h1>
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-gray-400">{VIEWS.find(v => v[0] === view)![1]}</span>
          </header>

          {!ready ? <p className="text-center text-xs font-bold text-gray-400 py-10">Loading…</p> : view === 'session' ? (
            !s ? (
              <div className="px-3 sm:px-0 py-10 text-center space-y-3">
                <p className="text-sm font-bold text-gray-500">No session running.</p>
                <Btn tone="green" onClick={() => dispatch({ t: 'newSession' })}>New session</Btn>
              </div>
            ) : s.status === 'setup' ? <SessionSetup /> : <LiveSession />
          ) : view === 'players' ? <PlayersView /> : view === 'stats' ? <StatsView /> : <HistoryView />}
        </div>

        {menu && (
          <div className="fixed inset-0 z-40 flex" role="dialog" aria-label="Menu">
            <nav className="bg-white w-72 max-w-[85%] h-full p-4 space-y-1 shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <p className="font-black text-gray-900">Menu</p>
                <IconBtn label="Close menu" onClick={() => setMenu(false)}><X size={18} /></IconBtn>
              </div>
              {VIEWS.map(([k, label, Icon]) => (
                <button key={k} onClick={() => { setView(k); setMenu(false); }}
                  className={`w-full min-h-[48px] flex items-center gap-3 rounded-xl px-3 text-sm font-black ${view === k ? 'bg-[#00D68F]/10 text-[#00A870]' : 'text-gray-700'}`}>
                  <Icon size={16} /> {label}
                </button>
              ))}
              <Link href="/" className="w-full min-h-[48px] flex items-center gap-3 rounded-xl px-3 text-sm font-black text-gray-500"><ArrowLeft size={16} /> Back to leaderboard</Link>
            </nav>
            <button aria-label="Close menu" className="flex-1 bg-black/50" onClick={() => setMenu(false)} />
          </div>
        )}

        {/* toast stack pinned to the bottom, above the setup bar */}
        <div className={`fixed inset-x-0 ${live ? 'bottom-3' : 'bottom-24'} z-50 px-3 space-y-2 pointer-events-none`} aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-gray-900">{t.title}</p>
                {t.sub && <p className="text-[11px] font-bold text-gray-400 truncate">{t.sub}</p>}
              </div>
              {t.action && <Btn small tone={t.action.tone ?? 'dark'} disabled={t.undoAt != null && state.undo.length !== t.undoAt} onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action.label}</Btn>}
              <IconBtn label="Dismiss" onClick={() => dismiss(t.id)}><X size={14} /></IconBtn>
            </div>
          ))}
        </div>
      </main>
    </Ctx.Provider>
  );
}
