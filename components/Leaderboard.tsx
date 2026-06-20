import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';

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
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('total_points', { ascending: false });

  if (error) {
    console.error("🚨 SUPABASE ERROR:", error.message);
  }

  // Apply our Player type to the fetched data
  const safePlayers: Player[] = data || [];

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

        {/* 🏆 Top Leader Hero Card - Added side margins on mobile so it doesn't touch screen edges */}
        <div className="mx-3 sm:mx-0 mb-8 bg-[#E4E4E4] rounded-[24px] p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <p className="text-black text-[10px] sm:text-xs font-semibold mb-4 sm:mb-5 opacity-80">Current Leader · Season 2026</p>

          {/* 🎯 Main Row: Kept grid-cols-3 but tightened gaps for mobile */}
          <div className="grid grid-cols-3 items-center mt-3 sm:mt-5 w-full relative z-10 gap-1 sm:gap-0">
            
            {/* Left Column: Rank, Avatar, and Name */}
            <div className="flex flex-col justify-center justify-self-start">
              <div className="flex items-center gap-1.5 sm:gap-3 h-8 sm:h-10">
                {/* Scaled text from 34px down to 22px on mobile */}
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
                  <div className={`w-4 sm:w-5 text-center font-black text-base sm:text-lg ${rankColor}`}>
                    {rank}
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
        {isAdmin && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:max-w-[calc(28rem-2.5rem)] px-2 sm:px-5 z-10">
            <button className="w-full bg-[#00D68F] hover:bg-[#00c483] text-white rounded-full py-3 sm:py-4 flex items-center justify-center gap-2 font-black text-[12px] sm:text-[13px] tracking-widest shadow-xl shadow-[#00D68F]/30 transition-transform active:scale-[0.98]">
              <Plus size={18} strokeWidth={3} className="w-4 h-4 sm:w-5 sm:h-5" />
              LOG NEW MATCH
            </button>
          </div>
        )}

      </div>
    </main>
  );
}