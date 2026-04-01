export interface TileData {
  id: string;
  value: number;
  colorIndex: number; // New field for randomized color
  x: number;
  y: number;
  z: number; // Layer
  isMatched: boolean;
  isAvailable: boolean;
}

export interface LevelConfig {
  rows: number;
  cols: number;
  layers: number;
  maxNum: number;
}

export const LEVELS: LevelConfig[] = [
  { rows: 2, cols: 4, layers: 1, maxNum: 4 }, // Level 1: 8 tiles (4 pairs), numbers 1-4
  { rows: 3, cols: 4, layers: 1, maxNum: 6 }, // Level 2: 12 tiles (6 pairs), numbers 1-6
  { rows: 4, cols: 4, layers: 1, maxNum: 8 }, // Level 3: 16 tiles (8 pairs), numbers 1-8
  { rows: 4, cols: 5, layers: 1, maxNum: 10 }, // Level 4: 20 tiles (10 pairs), numbers 1-10
  { rows: 4, cols: 6, layers: 1, maxNum: 10 }, // Level 5: 24 tiles (12 pairs), numbers 1-10
];

export function generateLevel(levelIndex: number): TileData[] {
  const config = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  const totalTiles = config.rows * config.cols * config.layers;
  
  // Ensure totalTiles is even for pairs
  if (totalTiles % 2 !== 0) {
    throw new Error("Total tiles must be even for matching pairs.");
  }

  const values: number[] = [];
  for (let i = 0; i < totalTiles / 2; i++) {
    const val = (i % config.maxNum) + 1;
    values.push(val, val);
  }

  // Shuffle values
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const tiles: TileData[] = [];
  let valueIdx = 0;
  for (let z = 0; z < config.layers; z++) {
    for (let y = 0; y < config.rows; y++) {
      for (let x = 0; x < config.cols; x++) {
        tiles.push({
          id: `tile-${z}-${y}-${x}`,
          value: values[valueIdx++],
          colorIndex: Math.floor(Math.random() * 10), // Random color independent of value
          x,
          y,
          z,
          isMatched: false,
          isAvailable: true,
        });
      }
    }
  }

  return updateAvailability(tiles);
}

export function updateAvailability(tiles: TileData[]): TileData[] {
  return tiles.map(tile => {
    if (tile.isMatched) return { ...tile, isAvailable: false };

    // For kids 3-7, we simplify: a tile is available if it's not covered from top (z+1)
    // We ignore side-blocking (left/right) to make it "Very simple and intuitive"
    
    const isCovered = tiles.some(other => 
      !other.isMatched && 
      other.z === tile.z + 1 && 
      Math.abs(other.x - tile.x) < 1 && 
      Math.abs(other.y - tile.y) < 1
    );

    return { ...tile, isAvailable: !isCovered };
  });
}

export function checkMatch(tile1: TileData, tile2: TileData): boolean {
  return tile1.id !== tile2.id && tile1.value === tile2.value;
}
