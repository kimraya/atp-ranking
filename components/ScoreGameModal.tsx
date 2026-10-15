'use client'

import { Fragment, useState, useTransition } from 'react';
import { Trophy, X, Loader2 } from 'lucide-react';
import { scoreGameAction } from '@/app/actions';

type Team = 1 | 2;

// Replay the point log: points -> game (deuce/advantage or sudden death) -> set (first to `gps` games).
// ponytail: no win-by-2 for sets and no tiebreak, per house rules.
function tally(log: Team[], numSets: number, gps: number, suddenDeath: boolean) {
  const sets = Array.from({ length: numSets }, () => [0, 0]);
  let pts = [0, 0];
  for (const t of log) {
    const i = t - 1, o = 1 - i;
    pts[i]++;
    if (pts[i] >= 4 && (suddenDeath || pts[i] - pts[o] >= 2)) {
      sets.find(s => Math.max(...s) < gps)![i]++;
      pts = [0, 0];
    }
  }
  return { sets, pts };
}

const LABEL = ['0', '15', '30', '40'];
function gameLabel([a, b]: number[], suddenDeath: boolean) {
  if (a < 3 || b < 3) return `${LABEL[a]} - ${LABEL[b]}`;
  if (a === b) return suddenDeath ? '40 - 40 (next point wins)' : 'DEUCE';
  return `ADVANTAGE TEAM ${a > b ? 1 : 2}`;
}

export default function ScoreGameModal({ players }: { players: { id: string | number; name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');
  const [picks, setPicks] = useState(['', '', '', '']); // t1p1, t1p2, t2p1, t2p2
  const [numSets, setNumSets] = useState(1);
  const [gps, setGps] = useState(6);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [log, setLog] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const { sets, pts } = tally(log, numSets, gps, suddenDeath);
  const full = !sets.some(s => Math.max(...s) < gps);
  const setWins = [0, 1].map(i => sets.filter(s => s[i] === gps).length);
  const total = [0, 1].map(i => sets.reduce((n, s) => n + s[i], 0));
  const lead = (a: number[]) => (a[0] === a[1] ? 0 : a[0] > a[1] ? 1 : 2) as 0 | Team;
  const winner = lead(setWins) || lead(total);
  const score = sets.map(s => s.join('-')).join(' ');

  const setFormat = (n: number, g: number) => { setNumSets(n); setGps(g); setLog([]); };
  const toggleSuddenDeath = () => { setSuddenDeath(!suddenDeath); setLog([]); };
  const pick = (i: number, v: string) => setPicks(p => p.map((x, j) => (j === i ? v : x)));

  const finish = () => {
    const n = matchType === 'singles' ? 1 : 2;
    const team1 = picks.slice(0, n), team2 = picks.slice(2, 2 + n);
    if ([...team1, ...team2].includes('') || new Set([...team1, ...team2]).size < 2 * n) {
      return setError('Pick different players for every slot.');
    }
    startTransition(async () => {
      const r = await scoreGameAction(matchType, team1, team2, winner as Team, score);
      if (r.success) { setIsOpen(false); setLog([]); setPicks(['', '', '', '']); setError(''); }
      else setError('error' in r ? r.error : 'Something went wrong.');
    });
  };

  const sel = 'w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800';
  const slot = (i: number, label: string) => (
    <select value={picks[i]} onChange={e => pick(i, e.target.value)} className={sel}>
      <option value="">{label}</option>
      {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
    </select>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-900 hover:bg-black text-white rounded-full py-3.5 sm:py-4 flex items-center justify-center gap-2 font-black text-[11px] sm:text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98]"
      >
        <Trophy size={16} strokeWidth={3} />
        <span>SCORE A GAME</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">SCORE A GAME</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400"><X size={18} /></button>
            </div>

            <div className="bg-gray-100 p-1 rounded-xl grid grid-cols-2 text-center text-xs font-black tracking-wider">
              {(['singles', 'doubles'] as const).map(t => (
                <button key={t} type="button" onClick={() => setMatchType(t)}
                  className={`py-2.5 rounded-lg ${matchType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <label>Sets
                <input type="number" min={1} max={5} defaultValue={numSets} inputMode="numeric" className={sel + ' mt-1'}
                  onBlur={e => { if (!+e.target.value) e.target.value = String(numSets); }}
                  onChange={e => +e.target.value >= 1 && setFormat(Math.min(5, +e.target.value), gps)} />
              </label>
              <label>Games per set
                <input type="number" min={1} max={20} defaultValue={gps} inputMode="numeric" className={sel + ' mt-1'}
                  onBlur={e => { if (!+e.target.value) e.target.value = String(gps); }}
                  onChange={e => +e.target.value >= 1 && setFormat(numSets, Math.min(20, +e.target.value))} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <input type="checkbox" checked={suddenDeath} onChange={toggleSuddenDeath} />
              Sudden death (no deuce / advantage)
            </label>

            <div className="grid grid-cols-2 gap-3">
              {([1, 2] as Team[]).map(t => (
                <div key={t} className="space-y-2">
                  {slot((t - 1) * 2, `Team ${t} player`)}
                  {matchType === 'doubles' && slot((t - 1) * 2 + 1, `Team ${t} partner`)}
                  <button disabled={full} onClick={() => setLog([...log, t])}
                    className="w-full bg-[#00D68F] disabled:opacity-30 text-white rounded-xl py-5 text-sm font-black tracking-widest">
                    POINT TEAM {t}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-center space-y-2">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {numSets} set{numSets > 1 ? 's' : ''} · first to {gps} games per set · sets won {setWins[0]} - {setWins[1]}
              </div>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span />
                <span>Team 1</span>
                <span>Team 2</span>
                {sets.map((s, i) => {
                  const done = Math.max(...s) === gps, now = !done && sets.findIndex(x => Math.max(...x) < gps) === i;
                  return (
                    <Fragment key={i}>
                      <span>Set {i + 1}{done ? ' ✓' : now ? ' •' : ''}</span>
                      <span className={`text-3xl tracking-tight ${s[0] === gps ? 'text-[#00D68F]' : 'text-gray-900'}`}>{s[0]}</span>
                      <span className={`text-3xl tracking-tight ${s[1] === gps ? 'text-[#00D68F]' : 'text-gray-900'}`}>{s[1]}</span>
                    </Fragment>
                  );
                })}
              </div>
              {!full && <div className="text-4xl font-black text-[#00D68F] tracking-tight">{gameLabel(pts, suddenDeath)}</div>}
              <button disabled={!log.length} onClick={() => setLog(log.slice(0, -1))}
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest disabled:opacity-30">Undo last</button>
            </div>

            {error && <p className="text-[11px] font-bold text-[#FF3B6A] text-center">{error}</p>}

            <button disabled={!winner || isPending} onClick={finish}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-black text-xs tracking-widest uppercase disabled:opacity-30 flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : winner ? `FINISH · TEAM ${winner} WINS` : 'FINISH'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
