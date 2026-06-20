import Leaderboard from '@/components/Leaderboard';

export default function AdminPage() {
  // This route unlocks the Match Logging UI!
  return <Leaderboard isAdmin={true} />;
}