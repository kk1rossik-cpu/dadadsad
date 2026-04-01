import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings as SettingsIcon, RotateCcw, Lightbulb, Play, Home, Heart, BarChart2, Shuffle, Maximize2, Minimize2 } from "lucide-react";
import confetti from "canvas-confetti";

import { TileData, generateLevel, updateAvailability, checkMatch, LEVELS } from "./lib/gameLogic";
import { playNumberVoice, playSoundEffect, prewarmAudio, resumeAudioContext, startBackgroundMusic, stopBackgroundMusic, updateMusicVolume } from "./lib/audioService";
import { GameStats, INITIAL_STATS } from "./lib/statsService";
import Tile from "./components/Tile";
import Settings from "./components/Settings";
import Victory from "./components/Victory";
import Statistics from "./components/Statistics";
import GameOver from "./components/GameOver";

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
  const [nextValueToMatch, setNextValueToMatch] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "original">("fit");
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    setZoomMode("fit");
    setHistory([]);
    setSelectedTile(null);
    setHintedTiles([]);
    setStars(3);
    setLives(3);
    setCurrentLevel(levelIdx);
    setStartTime(Date.now());
    setNextValueToMatch(1);
  }, []);

  // Handle tile click
  const handleTileClick = (tile: TileData) => {
    resumeAudioContext();
    
    // 1. Voice feedback (Priority)
    if (soundEnabled) {
      playNumberVoice(tile.value, volume);
    }

    // 2. Game logic (only for available tiles)
    if (!tile.isAvailable || tile.isMatched) {
      return;
    }

    // Sequential matching check
    if (tile.value !== nextValueToMatch) {
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

        // Update nextValueToMatch to the lowest unmatched value
        const unmatched = updatedTiles.filter(t => !t.isMatched);
        if (unmatched.length > 0) {
          const minVal = Math.min(...unmatched.map(t => t.value));
          setNextValueToMatch(minVal);
        }

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
      
      // Update nextValueToMatch to the lowest unmatched value
      const unmatched = previousState.filter(t => !t.isMatched);
      if (unmatched.length > 0) {
        const minVal = Math.min(...unmatched.map(t => t.value));
        setNextValueToMatch(minVal);
      }
      
      playSoundEffect('click', volume);
    }
  };

  // Hint
  const handleHint = () => {
    const available = tiles.filter(t => t.isAvailable && !t.isMatched && t.value === nextValueToMatch);
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

  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  // Calculate board dimensions
  const boardConfig = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
  const boardWidth = boardConfig.cols * 80 + (boardConfig.layers * 8);
  const boardHeight = boardConfig.rows * 100 + (boardConfig.layers * 8);

  // Calculate dynamic scale for mobile
  const isMobile = windowSize.width < 768;
  const horizontalPadding = isMobile ? 20 : 40;
  const verticalPadding = isMobile ? 160 : 240; // Header + Footer + extra
  const availableWidth = windowSize.width - horizontalPadding;
  const availableHeight = windowSize.height - verticalPadding;
  
  const scaleX = availableWidth / boardWidth;
  const scaleY = availableHeight / boardHeight;
  const fitScale = Math.min(1, scaleX, scaleY);
  const gameScale = zoomMode === "fit" ? fitScale : (isMobile ? 0.8 : 1);

  // Auto-switch zoom mode for very large levels
  useEffect(() => {
    if (fitScale < 0.5 && zoomMode === "fit") {
      setZoomMode("original");
    }
  }, [fitScale, zoomMode]);

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
              className="mb-8 md:mb-12"
            >
              <h1 className={`text-4xl md:text-6xl font-black tracking-tight text-center mb-2 md:mb-4 ${
                theme === "cartoon" ? "text-amber-600" : "text-blue-600"
              }`}>
                Цифровой<br />Маджонг
              </h1>
              <p className={`text-xl md:text-2xl font-bold text-center ${
                theme === "cartoon" ? "text-amber-400" : "text-gray-400"
              }`}>Для маленьких гениев</p>
            </motion.div>

            <div className="flex flex-col gap-4 md:gap-6 w-full max-w-sm">
              {isAudioLoading ? (
                <div className="flex flex-col items-center gap-4 py-6 bg-blue-50 rounded-[32px] md:rounded-[40px]">
                  <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-600 font-bold">Загрузка звуков...</p>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startLevel(0)}
                  className={`group relative py-4 md:py-6 text-white text-2xl md:text-3xl font-black transition-all shadow-2xl flex items-center justify-center gap-4 overflow-hidden
                    ${theme === "cartoon" ? "bg-amber-500 rounded-[40px] md:rounded-[50px] shadow-amber-200 hover:bg-amber-600" : "bg-blue-500 rounded-[32px] md:rounded-[40px] shadow-blue-200 hover:bg-blue-600"}
                  `}
                  aria-label="Начать игру"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <Play className="w-8 h-8 md:w-10 md:h-10 fill-white" />
                  </motion.div>
                  Играть
                  <motion.div 
                    className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSettings(true)}
                className={`py-4 md:py-5 bg-white text-gray-700 text-xl md:text-2xl font-bold hover:bg-gray-50 transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-4 border-2 border-gray-100
                  ${theme === "cartoon" ? "rounded-[40px] md:rounded-[50px]" : "rounded-[32px] md:rounded-[40px]"}
                `}
                aria-label="Открыть настройки игры"
              >
                <SettingsIcon className="w-6 h-6 md:w-8 md:h-8" />
                Настройки
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, x: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowStats(true)}
                className={`py-4 md:py-5 bg-white text-gray-700 text-xl md:text-2xl font-bold hover:bg-gray-50 transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-4 border-2 border-gray-100
                  ${theme === "cartoon" ? "rounded-[40px] md:rounded-[50px]" : "rounded-[32px] md:rounded-[40px]"}
                `}
                aria-label="Открыть статистику игрока"
              >
                <BarChart2 className={`w-6 h-6 md:w-8 md:h-8 ${theme === "cartoon" ? "text-amber-500" : "text-blue-500"}`} />
                Статистика
              </motion.button>
            </div>

            <div className="mt-10 md:mt-16 flex gap-3 md:gap-4 overflow-x-auto p-4 w-full justify-start md:justify-center no-scrollbar">
              {LEVELS.map((_, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.15, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 1, 
                    scale: idx === currentLevel ? 1.15 : 1,
                    y: idx === currentLevel ? -5 : 0
                  }}
                  transition={{ 
                    delay: idx * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 15
                  }}
                  onClick={() => startLevel(idx)}
                  className={`min-w-[56px] h-14 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-2xl font-black transition-all shadow-lg
                    ${theme === "cartoon" ? "rounded-[20px] md:rounded-[24px]" : "rounded-xl md:rounded-2xl"}
                    ${idx === currentLevel 
                      ? (theme === "cartoon" ? "bg-amber-400 text-white shadow-amber-200" : "bg-blue-500 text-white shadow-blue-200")
                      : "bg-white text-gray-400 hover:bg-gray-50"}
                  `}
                  aria-label={`Выбрать уровень ${idx + 1}`}
                  aria-current={idx === currentLevel ? "level" : undefined}
                >
                  {idx + 1}
                </motion.button>
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
            <header className="p-2 md:p-6 flex items-center justify-between z-20 safe-top">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setGameState("menu")}
                className="p-2 md:p-4 bg-white rounded-2xl md:rounded-3xl shadow-lg text-gray-600 hover:bg-gray-50 transition-all border border-gray-100"
                aria-label="Вернуться в главное меню"
              >
                <Home className="w-5 h-5 md:w-8 md:h-8" />
              </motion.button>

              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <motion.div 
                  layout
                  className={`bg-white px-3 md:px-8 py-1 md:py-3 rounded-full shadow-lg border-2 flex items-center gap-2 ${
                    theme === "cartoon" ? "border-amber-100" : "border-blue-100"
                  }`}
                >
                  <span className={`text-xs md:text-2xl font-black ${
                    theme === "cartoon" ? "text-amber-600" : "text-blue-600"
                  }`}>Ищи: {nextValueToMatch}</span>
                  
                  {isMobile && fitScale < 0.8 && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setZoomMode(zoomMode === "fit" ? "original" : "fit")}
                      className={`p-1.5 rounded-lg border-2 ${
                        theme === "cartoon" ? "border-amber-200 text-amber-500" : "border-blue-200 text-blue-500"
                      }`}
                    >
                      {zoomMode === "fit" ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </motion.button>
                  )}
                </motion.div>
                <div className="flex gap-1 mt-0.5">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{ scale: i < lives ? 1 : 0.8, opacity: i < lives ? 1 : 0.3 }}
                    >
                      <Heart 
                        className={`w-3.5 h-3.5 md:w-6 md:h-6 ${i < lives ? (theme === "cartoon" ? "fill-pink-500 text-pink-500" : "fill-red-500 text-red-500") : "text-gray-200"}`} 
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(true)}
                className="p-2.5 md:p-4 bg-white rounded-2xl md:rounded-3xl shadow-lg text-gray-600 hover:bg-gray-50 transition-all border border-gray-100"
                aria-label="Открыть настройки"
              >
                <SettingsIcon className="w-5 h-5 md:w-8 md:h-8" />
              </motion.button>
            </header>

            {/* Game Area */}
            <main ref={containerRef} className="flex-1 relative flex overflow-auto no-scrollbar px-4 py-4">
              <div 
                className="relative transition-transform duration-300 m-auto"
                style={{ 
                  width: boardWidth * gameScale, 
                  height: boardHeight * gameScale,
                  minWidth: boardWidth * gameScale,
                  minHeight: boardHeight * gameScale,
                }}
              >
                <div style={{ 
                  transform: `scale(${gameScale})`, 
                  transformOrigin: 'top left',
                  width: boardWidth,
                  height: boardHeight
                }}>
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
              </div>
            </main>

            {/* Footer Controls */}
            <footer className="p-2 md:p-8 flex justify-center gap-2 md:gap-8 z-20 safe-bottom">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`flex flex-col items-center gap-0.5 md:gap-2 p-2.5 md:p-6 transition-all shadow-xl border border-gray-100
                  ${theme === "cartoon" ? "rounded-[24px] md:rounded-[36px]" : "rounded-[20px] md:rounded-[32px]"}
                  ${history.length > 0 
                    ? (theme === "cartoon" ? "bg-white text-amber-500 hover:bg-amber-50" : "bg-white text-blue-500 hover:bg-blue-50") 
                    : "bg-gray-50 text-gray-300 opacity-50"}
                `}
                aria-label="Отменить последний ход"
              >
                <RotateCcw className="w-5 h-5 md:w-10 md:h-10" />
                <span className="font-bold text-[9px] md:text-base tracking-tight">Назад</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleShuffle}
                disabled={lives <= 1}
                className={`flex flex-col items-center gap-0.5 md:gap-2 p-2.5 md:p-6 transition-all shadow-xl border border-gray-100
                  ${theme === "cartoon" ? "rounded-[24px] md:rounded-[36px]" : "rounded-[20px] md:rounded-[32px]"}
                  ${lives > 1 
                    ? (theme === "cartoon" ? "bg-white text-pink-500 hover:bg-pink-50" : "bg-white text-purple-500 hover:bg-purple-50") 
                    : "bg-gray-50 text-gray-300 opacity-50"}
                `}
                aria-label="Перемешать плитки (стоит одну жизнь)"
              >
                <Shuffle className="w-5 h-5 md:w-10 md:h-10" />
                <span className="font-bold text-[9px] md:text-base tracking-tight">Микс</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleHint}
                className={`flex flex-col items-center gap-0.5 md:gap-2 p-2.5 md:p-6 bg-white transition-all shadow-xl border border-gray-100
                  ${theme === "cartoon" ? "rounded-[24px] md:rounded-[36px] text-sky-500 hover:bg-sky-50" : "rounded-[20px] md:rounded-[32px] text-yellow-500 hover:bg-yellow-50"}
                `}
                aria-label="Показать подсказку"
              >
                <Lightbulb className="w-5 h-5 md:w-10 md:h-10" />
                <span className="font-bold text-[9px] md:text-base tracking-tight">Хелп</span>
              </motion.button>
            </footer>
          </motion.div>
        )}

        {gameState === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <GameOver 
              onRetry={() => startLevel(currentLevel)} 
              onMenu={() => setGameState("menu")}
              theme={theme}
            />
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
            key="victory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
