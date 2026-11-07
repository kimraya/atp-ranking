// All tunable numbers for open-play matching and stats live here.
export const MATCHING = {
  UNRATED_RATING: 3.5, // neutral midpoint of the 1-6 scale
  SPREAD_PENALTY: 0.5, // cost per rating point of gap inside a team
  PARTNER_REPEAT_WEIGHT: 3, // repeating a partner hurts more...
  OPPONENT_REPEAT_WEIGHT: 1, // ...than repeating an opponent
  HISTORY_WINDOW: 4, // last N games per player count as "recent"
  LARGE_QUEUE_THRESHOLD: 16, // above this many waiting, look further ahead
  LOOKAHEAD_LARGE: 8, // candidate pool size for large queues
  BALANCE_TOLERANCE: 1, // team-balance cost within this of the best counts as "similarly balanced"
  MAX_SKIPS: 2, // a waiting player may be passed over at most this many times
};

export const STATS = {
  MIN_GAMES_TO_RANK: 1, // leaderboard: a player shows up after their first game
  ADJUST_PRIOR_GAMES: 5, // adjusted win rate = (wins + prior*0.5) / (games + prior)
};

export const RATING = { MIN: 1, MAX: 6 };
export const RATING_LABELS = ['Beginner', 'Adv. beginner', 'Intermediate', 'Upper inter.', 'Advanced', 'Expert'];
