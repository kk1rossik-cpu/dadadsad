export interface TileData {
  id: string;
  value: number;
  colorIndex: number;
  x: number;
  y: number;
  z: number;
  isMatched: boolean;
  isAvailable: boolean;
}

export interface LevelConfig {
  rows: number;
  cols: number;
  layers: number;
  maxNum: number;
  pattern?: string[]; // Optional pattern: 'X' for tile, ' ' for empty
}

export const LEVELS: LevelConfig[] = [
  { rows: 2, cols: 4, layers: 1, maxNum: 4 },   // 8 tiles
  { rows: 3, cols: 4, layers: 1, maxNum: 6 },   // 12 tiles
  { rows: 4, cols: 4, layers: 1, maxNum: 8 },   // 16 tiles
  { 
    rows: 4, cols: 5, layers: 1, maxNum: 10,
    pattern: [
      "XXXXX",
      "X X X",
      "X X X",
      "XXXXX"
    ]
  },
  { 
    rows: 5, cols: 5, layers: 1, maxNum: 12,
    pattern: [
      " XXX ",
      "XXXXX",
      "XXXXX",
      "XXXXX",
      " XXX "
    ]
  },
  { rows: 5, cols: 6, layers: 1, maxNum: 15 },  // 30 tiles
  { rows: 6, cols: 6, layers: 1, maxNum: 18 },  // 36 tiles
  { 
    rows: 7, cols: 7, layers: 1, maxNum: 24,
    pattern: [
      "XXXXXXX",
      "X     X",
      "X XXX X",
      "X X X X",
      "X XXX X",
      "X     X",
      "XXXXXXX"
    ]
  },
  { rows: 8, cols: 8, layers: 1, maxNum: 32 },  // 64 tiles
  { rows: 10, cols: 10, layers: 1, maxNum: 50 }, // 100 tiles
];

export function generateLevel(levelIndex: number): TileData[] {
  const config = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  
  const positions: {x: number, y: number, z: number}[] = [];
  for (let z = 0; z < config.layers; z++) {
    for (let y = 0; y < config.rows; y++) {
      for (let x = 0; x < config.cols; x++) {
        if (config.pattern) {
          if (config.pattern[y] && config.pattern[y][x] === 'X') {
            positions.push({x, y, z});
          }
        } else {
          positions.push({x, y, z});
        }
      }
    }
  }

  const totalTiles = positions.length;
  // Ensure totalTiles is even
  const finalPositions = totalTiles % 2 === 0 ? positions : positions.slice(0, -1);
  const finalTotal = finalPositions.length;

  const values: number[] = [];
  for (let i = 0; i < finalTotal / 2; i++) {
    const val = i + 1;
    values.push(val, val);
  }

  // Shuffle values
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const tiles: TileData[] = finalPositions.map((pos, idx) => ({
    id: `tile-${pos.z}-${pos.y}-${pos.x}-${idx}`,
    value: values[idx],
    colorIndex: Math.floor(Math.random() * 20),
    x: pos.x,
    y: pos.y,
    z: pos.z,
    isMatched: false,
    isAvailable: true,
  }));

  return updateAvailability(tiles);
}

export function updateAvailability(tiles: TileData[]): TileData[] {
  return tiles.map(tile => {
    if (tile.isMatched) return { ...tile, isAvailable: false };
    
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
