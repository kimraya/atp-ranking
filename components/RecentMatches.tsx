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

function formatMatchDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function RecentMatches() {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(4); 

  if (error) {
    console.error("🚨 Error fetching recent matches:", error.message);
    return null; 
  }

  if (!matches || matches.length === 0) {
    return null; 
  }

  return (
    <div className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl mx-auto mt-4 mb-28 z-10 relative">
      <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3 pl-2">
        Recent Results
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {matches.map((match: MatchRecord) => {
          const isTeam1Winner = match.winning_team === 'team_1';
          const winners = isTeam1Winner ? match.team_1_players : match.team_2_players;
          const losers = isTeam1Winner ? match.team_2_players : match.team_1_players;
          const pointsEarned = match.match_type?.toLowerCase() === 'doubles' ? 50 : 100;

          return (
            <div 
              key={match.id} 
              // 🎨 THE MAGIC: Added a thick deep blue left border (border-l-[6px] border-[#1E3A8A])
              className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100 border-l-[6px] border-l-[#00D68F] flex flex-col gap-3 transition-all hover:shadow-md"
            >
              {/* Top Meta Row (Date & Match Type) */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {formatMatchDate(match.created_at)}
                </span>
                {/* 🎨 THE MAGIC: Solid deep blue pill with white text */}
                <span className="text-[9px] font-black text-white bg-[#00D68F] px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                  {match.match_type}
                </span>
              </div>

              {/* BOTTOM: Players & Score */}
              <div className="flex items-center justify-between">
                
                {/* Left Column: Player Identities */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  {/* Winners (Kept green so "Winning" stays consistent across the app) */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00D68F] shrink-0 shadow-[0_0_6px_rgba(0,214,143,0.6)]"></div>
                    <span className="text-sm font-black text-slate-900 tracking-tight truncate">
                      {winners?.join(' & ') || 'Unknown'}
                    </span>
                    <span className="text-[9px] font-bold text-[#00D68F] bg-[#00D68F]/10 px-1 py-0.25 rounded shrink-0">
                      +{pointsEarned}
                    </span>
                  </div>
                  
                  {/* Losers */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0"></div>
                    <span className="text-xs font-semibold text-slate-400 tracking-tight truncate">
                      {losers?.join(' & ') || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Right Column: Score Only */}
                <div className="text-right shrink-0 pl-2">
                  {/* 🎨 THE MAGIC: Score is now a dark navy to match the theme */}
                  <span className="text-sm font-black text-black tracking-tighter">
                    {match.score ? match.score : "Win"}
                  </span>
                </div>
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}