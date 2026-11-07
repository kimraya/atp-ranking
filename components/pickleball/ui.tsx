'use client'

import { createContext, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Medal, Star, Trophy, X } from 'lucide-react';
import { RATING, RATING_LABELS } from '@/lib/session/config';
import type { Action, AppState, Session } from '@/lib/session/sessionReducer';

export interface ToastItem {
  id: number; title: string; sub?: string;
  undoAt?: number; // Undo only works while the undo stack is still this long
  action?: { label: string; run: () => void; tone?: 'green' | 'dark' };
}
export const Ctx = createContext<{
  state: AppState; dispatch: (a: Action) => void; toast: (t: Omit<ToastItem, 'id'>) => void;
  // dispatch + a toast whose Undo reverts exactly this action
  dispatchUndoable: (a: Action, title: string, sub?: string) => void;
}>(null as never);
export const useApp = () => useContext(Ctx);

export const nameOf = (s: Session, id: string) => s.players.find(p => p.id === id)?.name ?? '?';
export const ratingOf = (s: Session, id: string) => s.players.find(p => p.id === id)?.rating ?? null;

const tones = {
  green: 'bg-[#00D68F] text-white hover:brightness-95',
  dark: 'bg-gray-900 text-white hover:bg-black',
  gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  red: 'bg-[#FF3B6A] text-white hover:brightness-95',
  blue: 'bg-blue-600 text-white hover:bg-blue-700',
  orange: 'bg-orange-500 text-white hover:bg-orange-600',
};
export function Btn({ tone = 'gray', full, small, className = '', ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof tones; full?: boolean; small?: boolean }) {
  return (
    <button
      {...p}
      className={`${tones[tone]} ${full ? 'w-full' : ''} ${small ? 'min-h-[36px] px-3 text-[11px] rounded-lg' : 'min-h-[44px] px-4 text-xs rounded-xl'} font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 ${className}`}
    />
  );
}

export function IconBtn({ label, children, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...p} aria-label={label} title={label}
      className={`min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 transition-colors ${className}`}>
      {children}
    </button>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white rounded-[20px] shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{children}</p>
);

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs font-bold text-gray-400 py-8">{children}</p>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-label={title}>
      <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">{title}</h3>
          <IconBtn label="Close" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

const importField = 'w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800';
export function ImportModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [text, setText] = useState('');
  return (
    <Modal title="Import player list" onClose={onClose}>
      <p className="text-[11px] font-bold text-gray-500">One name per line. Add a rating from 1 to 6 after the name if you like, for example “Sam 4”.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8} aria-label="Player list" className={importField} />
      <Btn tone="dark" full disabled={!text.trim()} onClick={() => { dispatch({ t: 'importPlayers', text }); onClose(); }}>Import</Btn>
    </Modal>
  );
}

// 6-step star control. Tapping the current value clears it (unrated).
export function Stars({ value, onChange, size = 14 }: { value: number | null; onChange?: (v: number | null) => void; size?: number }) {
  if (!onChange) {
    return value == null
      ? <span className="text-[10px] font-bold text-gray-400">Unrated</span>
      : <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`Rating ${value} of ${RATING.MAX}: ${RATING_LABELS[value - 1]}`}>
          <Star size={size} className="fill-amber-400" /><span className="text-[10px] font-black text-gray-600">{value}</span>
        </span>;
  }
  return (
    <div className="inline-flex" role="group" aria-label="Skill rating">
      {Array.from({ length: RATING.MAX }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}: ${RATING_LABELS[n - 1]}`} title={RATING_LABELS[n - 1]}
          onClick={() => onChange(value === n ? null : n)} className="min-w-[28px] min-h-[36px] inline-flex items-center justify-center">
          <Star size={size + 2} className={value != null && n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  );
}

// Rank 1 sits on a gold trophy, every other rank on a medal (2 silver, 3 bronze, the rest gray).
const RANK_STYLE = {
  1: { Icon: Trophy, shape: 'fill-yellow-400 text-yellow-500', num: 'text-yellow-950 -translate-y-[7px]' },
  2: { Icon: Medal, shape: 'fill-slate-300 text-slate-400', num: 'text-slate-800 translate-y-[4px]' },
  3: { Icon: Medal, shape: 'fill-amber-700 text-amber-800', num: 'text-white translate-y-[4px]' },
  rest: { Icon: Medal, shape: 'fill-gray-200 text-gray-300', num: 'text-gray-600 translate-y-[4px]' },
};
export function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <span aria-label="Not ranked" className="inline-flex w-9 h-9 mr-2 align-middle items-center justify-center text-xs font-black text-gray-300">–</span>;
  }
  const { Icon, shape, num } = RANK_STYLE[rank === 1 || rank === 2 || rank === 3 ? rank : 'rest'];
  const word = ['', 'Gold trophy, ', 'Silver medal, ', 'Bronze medal, '][rank] ?? '';
  return (
    <span aria-label={`${word}rank ${rank}`} className="relative inline-flex w-9 h-9 mr-2 align-middle shrink-0 items-center justify-center">
      <Icon size={36} strokeWidth={1.5} aria-hidden className={`absolute inset-0 ${shape}`} />
      <span className={`relative text-xs font-black ${num}`}>{rank}</span>
    </span>
  );
}

export const TEAM = {
  1: { tint: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', tone: 'blue' as const },
  2: { tint: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500', tone: 'orange' as const },
};

export const mins = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${m}m`;
};
export const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
