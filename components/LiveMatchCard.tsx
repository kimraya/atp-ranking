'use client'

import { useState, useTransition } from 'react';
import { resolveMatchAction } from '@/app/actions';
import { Loader2 } from 'lucide-react';

export default function LiveMatchCard({ match, isAdmin }: { match: any, isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  const handleResolve = (winningTeam: 1 | 2) => {
    startTransition(async () => {
      await resolveMatchAction(
        match.id, 
        winningTeam, 
        match.team_1_players, 
        match.team_2_players, 
        match.match_type
      );
      setResolved(true);
    });
  };

  if (resolved) return null; // Hide the card instantly once resolved!

  return (
    <div className="bg-white border-2 border-[#FF3B6A]/20 rounded-[20px] p-4 shadow-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      
      {/* Left Side: Match Info */}
      <div className="space-y-1 w-full sm:w-auto">
        <span className="inline-block bg-[#FF3B6A]/10 text-[#FF3B6A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1">
          {match.match_type}
        </span>
        <div className="text-sm font-bold tracking-tight text-gray-800">
          {match.team_1_players.join(' & ')} <span className="text-gray-400 font-normal">vs</span> {match.team_2_players.join(' & ')}
        </div>
      </div>

      {/* Right Side: Admin Controls OR Public Status */}
      {isAdmin ? (
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => handleResolve(1)}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-gray-900 hover:bg-black text-white px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center"
          >
            T1 Won
          </button>
          <button 
            onClick={() => handleResolve(2)}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-gray-900 hover:bg-black text-white px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center"
          >
            T2 Won
          </button>
        </div>
      ) : (
        <span className="text-[10px] sm:text-xs font-black text-[#FF3B6A] bg-[#FF3B6A]/5 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-[#FF3B6A]/10 whitespace-nowrap">
          In Progress
        </span>
      )}

      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <Loader2 className="w-5 h-5 text-[#FF3B6A] animate-spin" />
        </div>
      )}
    </div>
  );
}