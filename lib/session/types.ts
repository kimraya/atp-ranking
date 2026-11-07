export type GameType = 'doubles' | 'singles';

export interface QueuePlayer {
  id: string;
  name: string;
  rating: number | null;
  checkedInAt: number;
  queueEnteredAt: number;
  gamesPlayed: number;
  passedOverCount: number;
  linkedPartnerId: string | null;
  linkedGamesTogether: number;
}

// A finished game as far as matching cares: who was on which team. Results are deliberately absent.
export interface PlayedMatch {
  team1: string[];
  team2: string[];
}

export interface MatchSettings {
  gameType: GameType;
  unpairAfter: number | null;
}

export interface Warning {
  kind: 'partner' | 'opponent' | 'full';
  message: string;
}

export interface FormedMatch {
  team1: string[];
  team2: string[];
  warnings: Warning[];
  passedOver: string[];
}
