import Leaderboard from '@/components/Leaderboard';

export default function Page() {
  // This is the public spectator view. 
  // isAdmin is false, so the button is hidden!
  return <Leaderboard isAdmin={false} />;
}