import { createClient } from '@/lib/supabase/server';
import LogMatchModal from '@/components/LogMatchModal';
import LiveMatchCard from '@/components/LiveMatchCard';
import { Plus, Radio, Medal } from 'lucide-react';

// Tell Next.js to always fetch fresh data on every load
export const revalidate = 0;

// Tell TypeScript exactly what data to expect from Supabase
interface Player {
  id: string | number;
  name: string;
  wins: number;
  losses: number;
  total_points: number;
  avatar_url?: string;
}

// We pass `isAdmin` as a control switch (defaults to false if not provided)
export default async function Leaderboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const supabase = await createClient();

  // 1. Fetch Players
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('*')
    .order('total_points', { ascending: false });

  if (playersError) console.error("🚨 SUPABASE PLAYERS ERROR:", playersError.message);

  // 2. Fetch Live Matches (New!)
  const { data: liveMatches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'in_progress');

  if (matchesError) console.error("🚨 SUPABASE MATCHES ERROR:", matchesError.message);

  // Apply our types to the fetched data
  const safePlayers: Player[] = playersData || [];
  const safeLiveMatches = liveMatches || [];

  // Used to identify your specific card row for the green "You" badge
  const currentUserName = "Kim Raya";

  // Since the data is sorted, the top player is always index 0!
  const topPlayer = safePlayers[0];

  // Helper: Generates 2-letter avatar initials safely
  const getInitials = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper: Safely extracts just the first name
  const getFirstName = (name?: string) => {
    if (!name) return '';
    return name.split(' ')[0];
  };

  return (
    <main className="min-h-screen bg-[#F4F6F9] font-sans pb-28 relative overflow-x-hidden">
      <div className="max-w-2xl mx-auto w-full relative h-full">
        {/* Adjusted padding for mobile */}
        <header className="flex justify-between items-center p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter">
            <span className="text-gray-900">ATP</span>
            <span className="text-[#00D68F]">NABUNTURAN</span>
          </h1>
        </header>

        {/* 🏆 Top Leader Hero Card */}
        <div className="mx-3 sm:mx-0 mb-6 bg-[#E4E4E4] rounded-[24px] p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <p className="text-black text-[10px] sm:text-xs font-semibold mb-4 sm:mb-5 opacity-80">Current Leader · Season 2026</p>

          <div className="grid grid-cols-3 items-center mt-3 sm:mt-5 w-full relative z-10 gap-1 sm:gap-0">
            {/* Left Column: Rank, Avatar, and Name */}
            <div className="flex flex-col justify-center justify-self-start">
              <div className="flex items-center gap-1.5 sm:gap-3 h-8 sm:h-10">
                <p className="text-[22px] sm:text-[34px] leading-none font-black text-[#00D68F] tracking-tight">#1</p>
                {topPlayer?.avatar_url ? (
                  <img
                    src={topPlayer.avatar_url}
                    alt="Rank 1"
                    className="w-7 h-7 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full shrink-0 bg-[#00D68F]/10 border border-[#00D68F]/30 flex items-center justify-center font-bold text-[10px] sm:text-sm text-[#00D68F]">
                    {getInitials(topPlayer?.name)}
                  </div>
                )}
                <p className="text-[22px] sm:text-[34px] font-bold text-gray-900 tracking-tight leading-none truncate max-w-[70px] sm:max-w-none">
                  {topPlayer ? getFirstName(topPlayer.name) : 'TBD'}
                </p>
              </div>
              <p className="text-black text-[9px] sm:text-[10px] font-medium mt-1.5 sm:mt-2 pl-1">Top Player</p>
            </div>

            {/* Center Column: Total Points */}
            <div className="flex flex-col items-center justify-center text-center justify-self-center w-full">
              <div className="h-8 sm:h-10 flex items-center justify-center">
                <p className="text-[22px] sm:text-[34px] leading-none font-black text-gray-900 tracking-tight">
                  {topPlayer?.total_points?.toLocaleString() || '0'}
                </p>
              </div>
              <p className="text-black text-[9px] sm:text-[10px] font-medium mt-1.5 sm:mt-2">Total Points</p>
            </div>

            {/* Right Column: Win / Loss Pill */}
            <div className="bg-[#2A232E] rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 border border-[#FF3B6A]/20 min-w-[50px] sm:min-w-[75px] flex flex-col justify-center text-center justify-self-end">
              <p className="text-sm sm:text-xl leading-none font-black text-[#00D68F]">
                {topPlayer?.wins || 0}W
              </p>
              <p className="text-[#FF3B6A] opacity-70 text-[8px] sm:text-[10px] font-medium mt-1">
                {topPlayer?.losses || 0}L
              </p>
            </div>
          </div>
        </div>

        {/* ⚡ LIVE MATCHES BLOCK (Only shows if a match is running) */}
        {safeLiveMatches.length > 0 && (
          <div className="mx-3 sm:mx-0 mb-6 space-y-3">
            <h2 className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-widest uppercase flex items-center gap-1.5 px-2 animate-pulse">
              <Radio size={14} className="text-[#FF3B6A]" /> Live Now
            </h2>

            {/* 🚀 Here is where we inject the interactive card! */}
            {safeLiveMatches.map((match) => (
              <LiveMatchCard key={match.id} match={match} isAdmin={isAdmin} />
            ))}

          </div>
        )}

        {/* 📋 Leaderboard Rankings Header */}
        <div className="flex justify-between items-end px-5 sm:px-7 mb-3">
          <h2 className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-widest uppercase">Current Rankings</h2>
          <span className="text-[10px] sm:text-xs font-medium text-gray-400">{safePlayers.length} players</span>
        </div>

        {/* 📋 Leaderboard Rankings List */}
        <div className="px-3 sm:px-5 space-y-2 sm:space-y-2.5">
          {safePlayers.map((player: Player, index: number) => {
            const rank = index + 1;
            const isMe = player.name === currentUserName;
            const initials = getInitials(player.name);
            const firstName = getFirstName(player.name);

            const avatarColors = [
              "bg-teal-100 text-teal-600",
              "bg-pink-100 text-pink-600",
              "bg-emerald-100 text-emerald-600",
              "bg-purple-100 text-purple-600",
              "bg-blue-100 text-blue-600",
            ];
            const colorClass = avatarColors[index % avatarColors.length];

            let rankColor = "text-gray-300";
            if (rank === 1) rankColor = "text-[#00D68F]";
            if (rank === 2) rankColor = "text-[#FF3B6A]";
            if (rank === 3) rankColor = "text-[#00D68F]";

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-[16px] sm:rounded-[20px] shadow-sm transition-all ${isMe ? 'bg-[#EBFAF5] border border-[#00D68F]/30' : 'bg-white border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  {/* 🏅 NEW MEDAL RANK BLOCK */}
                  <div className="w-5 sm:w-6 flex justify-center items-center shrink-0">
                    {rank === 1 ? (
                      <Medal className="text-yellow-500 fill-yellow-500/20 w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" strokeWidth={2.5} />
                    ) : rank === 2 ? (
                      <Medal className="text-slate-400 fill-slate-400/20 w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" strokeWidth={2.5} />
                    ) : rank === 3 ? (
                      <Medal className="text-amber-700 fill-amber-700/20 w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" strokeWidth={2.5} />
                    ) : (
                      <span className="text-center font-black text-base sm:text-lg text-gray-300">
                        {rank}
                      </span>
                    )}
                  </div>

                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={`${firstName}'s profile`}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm border border-black/10"
                    />
                  ) : (
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-[11px] ${colorClass} shadow-sm border border-black/5`}>
                      {initials}
                    </div>
                  )}

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[12px] sm:text-[13px] text-gray-900">{firstName}</p>
                      {isMe && (
                        <span className="bg-[#00D68F]/10 text-[#00D68F] text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] sm:text-[11px] font-black text-[#00D68F]">{player.wins}W</span>
                      <span className="text-gray-300 text-[9px] sm:text-[10px]">•</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#FF3B6A]">{player.losses}L</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-baseline gap-1">
                  <p className="text-base sm:text-lg font-black text-gray-900">{player.total_points?.toLocaleString()}</p>
                  <p className="text-[9px] sm:text-[10px] font-medium text-gray-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🔒 This button ONLY shows up if isAdmin is TRUE */}
        {/* {isAdmin && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:max-w-[calc(28rem-2.5rem)] px-2 sm:px-5 z-10">
            <button className="w-full bg-[#00D68F] hover:bg-[#00c483] text-white rounded-full py-3 sm:py-4 flex items-center justify-center gap-2 font-black text-[12px] sm:text-[13px] tracking-widest shadow-xl shadow-[#00D68F]/30 transition-transform active:scale-[0.98]">
              <Plus size={18} strokeWidth={3} className="w-4 h-4 sm:w-5 sm:h-5" />
              LOG NEW MATCH
            </button>
          </div>
        )} */}

        {/* 🔒 Old button block replaced with interactive component */}
        {isAdmin && <LogMatchModal players={safePlayers} />}

      </div>
    </main>
  );
}