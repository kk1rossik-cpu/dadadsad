export interface LevelStat {
  levelId: number;
  fastestTime: number | null; // in seconds
  wins: number;
  attempts: number;
}

export interface GameStats {
  totalGames: number;
  totalWins: number;
  levelStats: Record<number, LevelStat>;
}

export const INITIAL_STATS: GameStats = {
  totalGames: 0,
  totalWins: 0,
  levelStats: {}
};
