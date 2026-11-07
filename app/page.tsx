import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import RecentMatches from '@/components/RecentMatches';

export default async function PublicPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] pb-32">
      
      {/* 🚀 2. This layout flexbox mirrors the admin layout for perfect spacing */}
      <div className="flex flex-col gap-4">
        
        {/* 🏓 Entry to the separate pickleball open-play feature */}
        <Link
          href="/pickleball"
          className="mx-3 mt-3 sm:mx-auto sm:max-w-2xl sm:w-full bg-gray-900 hover:bg-black text-white rounded-full py-3.5 text-center font-black text-[11px] tracking-widest shadow-xl transition-all active:scale-[0.98]"
        >
          PICKLEBALL OPEN PLAY
        </Link>

        {/* 🔒 3. Public leaderboard (isAdmin is false so buttons hide) */}
        <Leaderboard isAdmin={false} />
        
        {/* 🎾 4. Drop the Recent Matches in for the public to see! */}
        <RecentMatches />
        
      </div>
    </main>
  );
}