'use client'

import { useState, useTransition } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { startMatchAction } from '@/app/actions';

interface Player {
  id: string | number;
  name: string;
}

export default function LogMatchModal({ players }: { players: Player[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');

  // Form States
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const team1 = matchType === 'singles' ? [t1p1] : [t1p1, t1p2];
    const team2 = matchType === 'singles' ? [t2p1] : [t2p1, t2p2];

    // Simple validation guards
    if (team1.includes('') || team2.includes('')) {
      setErrorMessage('Please select all players.');
      return;
    }
    if (team1.some(p => team2.includes(p)) || (matchType === 'doubles' && (t1p1 === t1p2 || t2p1 === t2p2))) {
      setErrorMessage('A player cannot compete against or partner with themselves!');
      return;
    }

    startTransition(async () => {
      const result = await startMatchAction(matchType, team1, team2);
      if (result.success) {
        // Reset states and close modal
        setT1p1(''); setT1p2(''); setT2p1(''); setT2p2('');
        setIsOpen(false);
      } else {
        setErrorMessage(result.error || 'Something went wrong.');
      }
    });
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      {/* Clean, un-positioned Log Match Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#00D68F] hover:bg-[#00c483] text-white rounded-full py-3.5 sm:py-4 flex items-center justify-center gap-2 font-black text-[11px] sm:text-[12px] tracking-widest shadow-xl shadow-[#00D68F]/20 transition-all active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={3} />
        <span>LOG NEW MATCH</span>
      </button>

      {/* Modal Overlay Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">START NEW MATCH</h3>
                <p className="text-xs font-semibold text-gray-400">Set active match configurations</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Config Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Match Type Switcher */}
              <div className="bg-gray-100 p-1 rounded-xl grid grid-cols-2 text-center text-xs font-black tracking-wider">
                <button
                  type="button"
                  onClick={() => setMatchType('singles')}
                  className={`py-2.5 rounded-lg transition-all ${matchType === 'singles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                >
                  SINGLES
                </button>
                <button
                  type="button"
                  onClick={() => setMatchType('doubles')}
                  className={`py-2.5 rounded-lg transition-all ${matchType === 'doubles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                >
                  DOUBLES
                </button>
              </div>

              {/* Selection Grids */}
              <div className="space-y-4">
                {/* Team 1 Selection */}
                <div className="bg-[#EBFAF5] border border-[#00D68F]/20 p-4 rounded-2xl space-y-3">
                  <label className="block text-[10px] font-black text-[#00D68F] uppercase tracking-widest">TEAM 1 (Serving)</label>
                  <select
                    value={t1p1}
                    onChange={(e) => setT1p1(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#00D68F]"
                  >
                    <option value="">Select Player...</option>
                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>

                  {matchType === 'doubles' && (
                    <select
                      value={t1p2}
                      onChange={(e) => setT1p2(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#00D68F]"
                    >
                      <option value="">Select Partner...</option>
                      {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Team 2 Selection */}
                <div className="bg-red-50/50 border border-[#FF3B6A]/10 p-4 rounded-2xl space-y-3">
                  <label className="block text-[10px] font-black text-[#FF3B6A] uppercase tracking-widest">TEAM 2 (Receiving)</label>
                  <select
                    value={t2p1}
                    onChange={(e) => setT2p1(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#FF3B6A]"
                  >
                    <option value="">Select Player...</option>
                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>

                  {matchType === 'doubles' && (
                    <select
                      value={t2p2}
                      onChange={(e) => setT2p2(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#FF3B6A]"
                    >
                      <option value="">Select Partner...</option>
                      {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <p className="text-[11px] font-bold text-[#FF3B6A] bg-[#FF3B6A]/5 border border-[#FF3B6A]/10 p-3 rounded-xl text-center">
                  {errorMessage}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-3.5 font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    CREATING MATCH...
                  </>
                ) : (
                  'LAUNCH LIVE MATCH'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}