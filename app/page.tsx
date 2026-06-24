import Leaderboard from '@/components/Leaderboard';
import RecentMatches from '@/components/RecentMatches';

export default async function PublicPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] pb-32">
      
      {/* 🚀 2. This layout flexbox mirrors the admin layout for perfect spacing */}
      <div className="flex flex-col gap-4">
        
        {/* 🔒 3. Public leaderboard (isAdmin is false so buttons hide) */}
        <Leaderboard isAdmin={false} />
        
        {/* 🎾 4. Drop the Recent Matches in for the public to see! */}
        <RecentMatches />
        
      </div>
    </main>
  );
}