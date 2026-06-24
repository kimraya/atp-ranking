import Leaderboard from '@/components/Leaderboard';
import RecentMatches from '@/components/RecentMatches';

// export default function AdminPage() {
//   // This route unlocks the Match Logging UI!
//   return <Leaderboard isAdmin={true} />;
// }

export default async function AdminPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] pb-32">
      {/* Existing Header/Leaderboard stuff */}
      <Leaderboard isAdmin={true} />
      
      {/* 👈 2. Drop the Recent Matches module here */}
      <RecentMatches /> 
    </main>
  );
}