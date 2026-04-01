import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings as SettingsIcon, RotateCcw, Lightbulb, Play, Home, Heart, BarChart2, Shuffle } from "lucide-react";
import confetti from "canvas-confetti";

import { TileData, generateLevel, updateAvailability, checkMatch, LEVELS } from "./lib/gameLogic";
import { playNumberVoice, playSoundEffect, prewarmAudio, resumeAudioContext, startBackgroundMusic, stopBackgroundMusic, updateMusicVolume } from "./lib/audioService";
import { GameStats, INITIAL_STATS } from "./lib/statsService";
import Tile from "./components/Tile";
import Settings from "./components/Settings";
import Victory from "./components/Victory";
import Statistics from "./components/Statistics";

type GameState = "menu" | "playing" | "victory" | "gameover";
export type Theme = "material" | "cartoon";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("mahjong_theme");
    return (saved as Theme) || "material";
  });
  const [currentLevel, setCurrentLevel] = useState(0);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [history, setHistory] = useState<TileData[][]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [hintedTiles, setHintedTiles] = useState<string[]>([]);
  const [stars, setStars] = useState(3);
  const [isAudioLoading, setIsAudioLoading] = useState(true);
  const [lives, setLives] = useState(3);
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem("mahjong_stats");
    try {
      return saved ? JSON.parse(saved) : INITIAL_STATS;
    } catch {
      return INITIAL_STATS;
    }
  });
  const [showStats, setShowStats] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Pre-warm audio on start
  useEffect(() => {
    prewarmAudio().finally(() => setIsAudioLoading(false));
  }, []);

  // Initialize level
  const startLevel = useCallback((levelIdx: number) => {
    resumeAudioContext();
    if (musicEnabled) {
      startBackgroundMusic(musicVolume);
    }
    const newTiles = generateLevel(levelIdx);
    setTiles(newTiles);
    setGameState("playing");
    setHistory([]);
    setSelectedTile(null);
    setHintedTiles([]);
    setStars(3);
    setLives(3);
    setCurrentLevel(levelIdx);
    setStartTime(Date.now());
  }, []);

  // Handle tile click
  const handleTileClick = (tile: TileData) => {
    resumeAudioContext();
    
    // 1. Voice feedback (Priority)
    if (soundEnabled) {
      playNumberVoice(tile.value, volume);
    }

    // 2. Game logic (only for available tiles)
    if (!tile.isAvailable) {
      return;
    }

    // Only play click if it's a valid move, but voice is already playing
    // We'll skip the click sound to let the voice be heard clearly
    // playSoundEffect('click', volume); 

    if (selectedTile) {
      if (selectedTile.id === tile.id) {
        setSelectedTile(null);
      } else if (checkMatch(selectedTile, tile)) {
        // Match found
        playSoundEffect('match', volume);
        setHistory([...history, [...tiles]]);
        
        const newTiles = tiles.map(t => 
          (t.id === tile.id || t.id === selectedTile.id) 
            ? { ...t, isMatched: true } 
            : t
        );
        
        const updatedTiles = updateAvailability(newTiles);
        setTiles(updatedTiles);
        setSelectedTile(null);
        setHintedTiles([]);

        // Check for victory
        if (updatedTiles.every(t => t.isMatched)) {
          const timeTaken = Math.floor((Date.now() - startTime) / 1000);
          
          setStats(prev => {
            const newStats = { ...prev };
            newStats.totalGames += 1;
            newStats.totalWins += 1;
            
            const levelStat = { ...(newStats.levelStats[currentLevel] || {
              levelId: currentLevel,
              fastestTime: null,
              wins: 0,
              attempts: 0
            }) };
            
            levelStat.wins += 1;
            levelStat.attempts += 1;
            if (levelStat.fastestTime === null || timeTaken < levelStat.fastestTime) {
              levelStat.fastestTime = timeTaken;
            }
            
            newStats.levelStats[currentLevel] = levelStat;
            localStorage.setItem("mahjong_stats", JSON.stringify(newStats));
            return newStats;
          });

          setTimeout(() => {
            setGameState("victory");
            playSoundEffect('victory', volume);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#60a5fa', '#f87171', '#4ade80', '#fbbf24']
            });
          }, 500);
        }
      } else {
        // No match - Error!
        playSoundEffect('error', volume);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setStats(prevStats => {
              const newStats = { ...prevStats };
              newStats.totalGames += 1;
              
              const levelStat = { ...(newStats.levelStats[currentLevel] || {
                levelId: currentLevel,
                fastestTime: null,
                wins: 0,
                attempts: 0
              }) };
              
              levelStat.attempts += 1;
              newStats.levelStats[currentLevel] = levelStat;
              localStorage.setItem("mahjong_stats", JSON.stringify(newStats));
              return newStats;
            });
            setTimeout(() => setGameState("gameover"), 500);
          }
          return next;
        });
        setSelectedTile(tile); // Select the new one anyway
      }
    } else {
      setSelectedTile(tile);
    }
  };

  // Undo move
  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setTiles(previousState);
      setHistory(history.slice(0, -1));
      setSelectedTile(null);
      setHintedTiles([]);
      playSoundEffect('click', volume);
    }
  };

  // Hint
  const handleHint = () => {
    const available = tiles.filter(t => t.isAvailable && !t.isMatched);
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        if (available[i].value === available[j].value) {
          setHintedTiles([available[i].id, available[j].id]);
          playSoundEffect('click', volume);
          return;
        }
      }
    }
  };

  // Shuffle
  const handleShuffle = () => {
    if (lives <= 1) return;
    
    const unmatchedTiles = tiles.filter(t => !t.isMatched);
    if (unmatchedTiles.length === 0) return;

    // Get all current positions of unmatched tiles
    const positions = unmatchedTiles.map(t => ({ x: t.x, y: t.y, z: t.z }));
    
    // Shuffle the positions array
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Assign new positions to unmatched tiles
    const newTiles = tiles.map(t => {
      if (t.isMatched) return t;
      const newPos = positions.pop()!;
      return { ...t, ...newPos };
    });

    // Update availability after shuffle
    const updatedTiles = updateAvailability(newTiles);
    
    setTiles(updatedTiles);
    setLives(prev => prev - 1);
    playSoundEffect('click', volume);
    setSelectedTile(null);
    setHintedTiles([]);
  };

  // Save theme to local storage
  useEffect(() => {
    localStorage.setItem("mahjong_theme", theme);
  }, [theme]);

  // Calculate board dimensions
  const boardConfig = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
  const boardWidth = boardConfig.cols * 80;
  const boardHeight = boardConfig.rows * 100;

  // Update music volume when it changes
  useEffect(() => {
    updateMusicVolume(musicVolume);
  }, [musicVolume]);

  // Toggle music
  useEffect(() => {
    if (musicEnabled && gameState !== "menu") {
      startBackgroundMusic(musicVolume);
    } else if (!musicEnabled) {
      stopBackgroundMusic();
    }
  }, [musicEnabled, gameState, musicVolume]);

  return (
    <div className={`min-h-screen font-sans overflow-hidden select-none transition-colors duration-500 ${
      theme === "cartoon" ? "bg-[#fffbeb]" : "bg-[#fdfaf5]"
    }`}>
      <AnimatePresence mode="wait">
        {gameState === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="mb-12"
            >
              <h1 className={`text-6xl font-black tracking-tight text-center mb-4 ${
                theme === "cartoon" ? "text-amber-600" : "text-blue-600"
              }`}>
                Цифровой<br />Маджонг
              </h1>
              <p className={`text-2xl font-bold text-center ${
                theme === "cartoon" ? "text-amber-400" : "text-gray-400"
              }`}>Для маленьких гениев</p>
            </motion.div>

            <div className="flex flex-col gap-6 w-full max-w-sm">
              {isAudioLoading ? (
                <div className="flex flex-col items-center gap-4 py-6 bg-blue-50 rounded-[40px]">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-600 font-bold">Загрузка звуков...</p>
                </div>
              ) : (
                <button
                  onClick={() => startLevel(0)}
                  className={`group relative py-6 text-white text-3xl font-black transition-all shadow-2xl flex items-center justify-center gap-4 overflow-hidden
                    ${theme === "cartoon" ? "bg-amber-500 rounded-[50px] shadow-amber-200 hover:bg-amber-600" : "bg-blue-500 rounded-[40px] shadow-blue-200 hover:bg-blue-600"}
                  `}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ type: "spring" }}
                  >
                    <Play className="w-10 h-10 fill-white" />
                  </motion.div>
                  Играть
                </button>
              )}

              <button
                onClick={() => setShowSettings(true)}
                className={`py-5 bg-white text-gray-700 text-2xl font-bold hover:bg-gray-50 transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-4 border-2 border-gray-100
                  ${theme === "cartoon" ? "rounded-[50px]" : "rounded-[40px]"}
                `}
              >
                <SettingsIcon className="w-8 h-8" />
                Настройки
              </button>

              <button
                onClick={() => setShowStats(true)}
                className={`py-5 bg-white text-gray-700 text-2xl font-bold hover:bg-gray-50 transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-4 border-2 border-gray-100
                  ${theme === "cartoon" ? "rounded-[50px]" : "rounded-[40px]"}
                `}
              >
                <BarChart2 className={`w-8 h-8 ${theme === "cartoon" ? "text-amber-500" : "text-blue-500"}`} />
                Статистика
              </button>
            </div>

            <div className="mt-16 flex gap-4 overflow-x-auto p-4 w-full justify-center">
              {LEVELS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => startLevel(idx)}
                  className={`w-16 h-16 flex items-center justify-center text-2xl font-black transition-all shadow-md
                    ${theme === "cartoon" ? "rounded-[24px]" : "rounded-2xl"}
                    ${idx === currentLevel 
                      ? (theme === "cartoon" ? "bg-amber-400 text-white scale-110" : "bg-blue-500 text-white scale-110")
                      : "bg-white text-gray-400 hover:bg-gray-50"}
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-screen relative"
          >
            {/* Animated Background */}
            <motion.div
              animate={{
                background: theme === "cartoon" 
                  ? [
                    "radial-gradient(circle at 20% 20%, #fffbeb 0%, #fef3c7 100%)",
                    "radial-gradient(circle at 80% 80%, #fffbeb 0%, #fef3c7 100%)",
                    "radial-gradient(circle at 20% 80%, #fffbeb 0%, #fef3c7 100%)",
                    "radial-gradient(circle at 80% 20%, #fffbeb 0%, #fef3c7 100%)",
                    "radial-gradient(circle at 20% 20%, #fffbeb 0%, #fef3c7 100%)",
                  ]
                  : [
                    "radial-gradient(circle at 20% 20%, #fdfaf5 0%, #f0f9ff 100%)",
                    "radial-gradient(circle at 80% 80%, #fdfaf5 0%, #f0f9ff 100%)",
                    "radial-gradient(circle at 20% 80%, #fdfaf5 0%, #f0f9ff 100%)",
                    "radial-gradient(circle at 80% 20%, #fdfaf5 0%, #f0f9ff 100%)",
                    "radial-gradient(circle at 20% 20%, #fdfaf5 0%, #f0f9ff 100%)",
                  ]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 -z-10"
            />
            {/* Header */}
            <header className="p-6 flex items-center justify-between">
              <button
                onClick={() => setGameState("menu")}
                className="p-4 bg-white rounded-3xl shadow-lg text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Home className="w-8 h-8" />
              </button>

              <div className="flex flex-col items-center gap-1">
                <div className={`bg-white px-8 py-3 rounded-full shadow-lg border-2 ${
                  theme === "cartoon" ? "border-amber-100" : "border-blue-100"
                }`}>
                  <span className={`text-2xl font-black ${
                    theme === "cartoon" ? "text-amber-600" : "text-blue-600"
                  }`}>Уровень {currentLevel + 1}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart 
                      key={i} 
                      className={`w-6 h-6 ${i < lives ? (theme === "cartoon" ? "fill-pink-500 text-pink-500" : "fill-red-500 text-red-500") : "text-gray-200"}`} 
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="p-4 bg-white rounded-3xl shadow-lg text-gray-600 hover:bg-gray-50 transition-all"
              >
                <SettingsIcon className="w-8 h-8" />
              </button>
            </header>

            {/* Game Area */}
            <main className="flex-1 relative flex items-center justify-center overflow-auto p-10">
              <div 
                className="relative"
                style={{ width: boardWidth, height: boardHeight }}
              >
                {tiles.map(tile => (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    isSelected={selectedTile?.id === tile.id}
                    isHinted={hintedTiles.includes(tile.id)}
                    onClick={handleTileClick}
                    theme={theme}
                  />
                ))}
              </div>
            </main>

            {/* Footer Controls */}
            <footer className="p-8 flex justify-center gap-8">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`flex flex-col items-center gap-2 p-6 transition-all shadow-xl
                  ${theme === "cartoon" ? "rounded-[36px]" : "rounded-[32px]"}
                  ${history.length > 0 
                    ? (theme === "cartoon" ? "bg-white text-amber-500 hover:bg-amber-50" : "bg-white text-blue-500 hover:bg-blue-50") 
                    : "bg-gray-50 text-gray-300 opacity-50"}
                `}
              >
                <RotateCcw className="w-10 h-10" />
                <span className="font-bold">Назад</span>
              </button>

              <button
                onClick={handleShuffle}
                disabled={lives <= 1}
                className={`flex flex-col items-center gap-2 p-6 transition-all shadow-xl
                  ${theme === "cartoon" ? "rounded-[36px]" : "rounded-[32px]"}
                  ${lives > 1 
                    ? (theme === "cartoon" ? "bg-white text-pink-500 hover:bg-pink-50" : "bg-white text-purple-500 hover:bg-purple-50") 
                    : "bg-gray-50 text-gray-300 opacity-50"}
                `}
              >
                <Shuffle className="w-10 h-10" />
                <span className="font-bold">Перемешать</span>
              </button>

              <button
                onClick={handleHint}
                className={`flex flex-col items-center gap-2 p-6 bg-white transition-all shadow-xl
                  ${theme === "cartoon" ? "rounded-[36px] text-sky-500 hover:bg-sky-50" : "rounded-[32px] text-yellow-500 hover:bg-yellow-50"}
                `}
              >
                <Lightbulb className="w-10 h-10" />
                <span className="font-bold">Подсказка</span>
              </button>
            </footer>
          </motion.div>
        )}

        {gameState === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`bg-white p-10 w-full max-w-md shadow-2xl text-center ${
                theme === "cartoon" ? "rounded-[60px]" : "rounded-[48px]"
              }`}
            >
              <h2 className={`text-5xl font-black mb-4 ${
                theme === "cartoon" ? "text-pink-500" : "text-red-500"
              }`}>Ой-ой!</h2>
              <p className="text-2xl font-bold text-gray-500 mb-8">Закончились сердечки</p>
              <button
                onClick={() => startLevel(currentLevel)}
                className={`w-full py-5 text-white text-2xl font-black transition-all shadow-xl
                  ${theme === "cartoon" ? "bg-amber-500 rounded-[40px] hover:bg-amber-600 shadow-amber-100" : "bg-blue-500 rounded-3xl hover:bg-blue-600 shadow-blue-200"}
                `}
              >
                Попробовать еще раз
              </button>
              <button
                onClick={() => setGameState("menu")}
                className="w-full mt-4 py-4 text-gray-400 font-bold"
              >
                В меню
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        musicEnabled={musicEnabled}
        onToggleMusic={() => setMusicEnabled(!musicEnabled)}
        volume={volume}
        onVolumeChange={setVolume}
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        theme={theme}
        onThemeChange={setTheme}
      />

      <Statistics
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        onReset={() => {
          if (confirm("Точно сбросить всю статистику?")) {
            setStats(INITIAL_STATS);
            localStorage.removeItem("mahjong_stats");
          }
        }}
        theme={theme}
      />

      <AnimatePresence>
        {gameState === "victory" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <Victory
              level={currentLevel}
              stars={stars}
              onNext={() => {
                if (currentLevel < LEVELS.length - 1) {
                  startLevel(currentLevel + 1);
                } else {
                  setGameState("menu");
                }
              }}
              onRetry={() => startLevel(currentLevel)}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
