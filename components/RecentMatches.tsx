import { createClient } from '@/lib/supabase/server';

interface MatchRecord {
  id: number;
  created_at: string;
  match_type: string;
  status: string;
  team_1_players: string[];
  team_2_players: string[];
  winning_team: string; 
  score: string | null;
}

export default async function RecentMatches() {
  const supabase = await createClient();

  // 1. Fetch exactly 4 matches to make a pristine 2x2 grid layout
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(4); // 👈 Changed from 5 to 4 for mathematical grid balance

  if (error) {
    console.error("🚨 Error fetching recent matches:", error.message);
    return null; 
  }

  if (!matches || matches.length === 0) {
    return null; 
  }

  return (
    <div className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl mx-auto -mt-12 mb-28 z-10 relative">
      <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3 pl-2">
        Recent Results
      </h3>
      
      {/* 🚀 2x2 Responsive Grid Layout System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {matches.map((match: MatchRecord) => {
          const isTeam1Winner = match.winning_team === 'team_1';
          const winners = isTeam1Winner ? match.team_1_players : match.team_2_players;
          const losers = isTeam1Winner ? match.team_2_players : match.team_1_players;
          const pointsEarned = match.match_type?.toLowerCase() === 'doubles' ? 50 : 100;

          return (
            <div 
              key={match.id} 
              className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md"
            >
              {/* Left Column: Player Identities */}
              <div className="flex flex-col gap-1.5 min-w-0">
                {/* Winners */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D68F] shrink-0 shadow-[0_0_6px_rgba(0,214,143,0.6)]"></div>
                  <span className="text-sm font-black text-gray-900 tracking-tight truncate">
                    {winners?.join(' & ') || 'Unknown'}
                  </span>
                  <span className="text-[9px] font-bold text-[#00D68F] bg-[#00D68F]/10 px-1 py-0.25 rounded shrink-0">
                    +{pointsEarned}
                  </span>
                </div>
                
                {/* Losers */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0"></div>
                  <span className="text-xs font-semibold text-gray-400 tracking-tight truncate">
                    {losers?.join(' & ') || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Right Column: Dynamic Score Matrix */}
              <div className="text-right flex flex-col justify-center shrink-0 pl-2">
                <span className="text-sm font-black text-gray-800 tracking-tighter">
                  {match.score ? match.score : "Win"}
                </span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {match.match_type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}