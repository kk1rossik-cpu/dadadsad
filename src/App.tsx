import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings as SettingsIcon, RotateCcw, Lightbulb, Play, Home, Heart } from "lucide-react";
import confetti from "canvas-confetti";

import { TileData, generateLevel, updateAvailability, checkMatch, LEVELS } from "./lib/gameLogic";
import { getNumberAudio, playAudio, playSoundEffect, prewarmAudio } from "./lib/audioService";
import Tile from "./components/Tile";
import Settings from "./components/Settings";
import Victory from "./components/Victory";

type GameState = "menu" | "playing" | "victory" | "gameover";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [history, setHistory] = useState<TileData[][]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [hintedTiles, setHintedTiles] = useState<string[]>([]);
  const [stars, setStars] = useState(3);
  const [isAudioLoading, setIsAudioLoading] = useState(true);
  const [lives, setLives] = useState(3);

  // Pre-warm audio on start
  useEffect(() => {
    prewarmAudio().finally(() => setIsAudioLoading(false));
  }, []);

  // Initialize level
  const startLevel = useCallback((levelIdx: number) => {
    const newTiles = generateLevel(levelIdx);
    setTiles(newTiles);
    setGameState("playing");
    setHistory([]);
    setSelectedTile(null);
    setHintedTiles([]);
    setStars(3);
    setLives(3);
    setCurrentLevel(levelIdx);
  }, []);

  // Handle tile click
  const handleTileClick = (tile: TileData) => {
    // 1. Immediate visual feedback & Audio (always play for kids)
    if (soundEnabled) {
      getNumberAudio(tile.value).then(base64 => {
        if (base64) playAudio(base64, volume);
      }).catch(() => {});
    }

    // 2. Game logic (only for available tiles)
    if (!tile.isAvailable) {
      return;
    }

    playSoundEffect('click', volume);

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

  // Calculate board dimensions
  const boardConfig = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
  const boardWidth = boardConfig.cols * 80;
  const boardHeight = boardConfig.rows * 100;

  return (
    <div className="min-h-screen bg-[#fdfaf5] font-sans overflow-hidden select-none">
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
              <h1 className="text-6xl font-black text-blue-600 tracking-tight text-center mb-4">
                Цифровой<br />Маджонг
              </h1>
              <p className="text-2xl font-bold text-gray-400 text-center">Для маленьких гениев</p>
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
                  className="group relative py-6 bg-blue-500 text-white rounded-[40px] text-3xl font-black hover:bg-blue-600 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-4 overflow-hidden"
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
                className="py-5 bg-white text-gray-700 rounded-[40px] text-2xl font-bold hover:bg-gray-50 transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-4 border-2 border-gray-100"
              >
                <SettingsIcon className="w-8 h-8" />
                Настройки
              </button>
            </div>

            <div className="mt-16 flex gap-4 overflow-x-auto p-4 w-full justify-center">
              {LEVELS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => startLevel(idx)}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition-all shadow-md
                    ${idx === currentLevel ? "bg-blue-500 text-white scale-110" : "bg-white text-gray-400 hover:bg-gray-50"}
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
            className="flex flex-col h-screen"
          >
            {/* Header */}
            <header className="p-6 flex items-center justify-between">
              <button
                onClick={() => setGameState("menu")}
                className="p-4 bg-white rounded-3xl shadow-lg text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Home className="w-8 h-8" />
              </button>

              <div className="flex flex-col items-center gap-1">
                <div className="bg-white px-8 py-3 rounded-full shadow-lg border-2 border-blue-100">
                  <span className="text-2xl font-black text-blue-600">Уровень {currentLevel + 1}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart 
                      key={i} 
                      className={`w-6 h-6 ${i < lives ? "fill-red-500 text-red-500" : "text-gray-200"}`} 
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
                  />
                ))}
              </div>
            </main>

            {/* Footer Controls */}
            <footer className="p-8 flex justify-center gap-8">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`flex flex-col items-center gap-2 p-6 rounded-[32px] transition-all shadow-xl
                  ${history.length > 0 ? "bg-white text-blue-500 hover:bg-blue-50" : "bg-gray-50 text-gray-300 opacity-50"}
                `}
              >
                <RotateCcw className="w-10 h-10" />
                <span className="font-bold">Назад</span>
              </button>

              <button
                onClick={handleHint}
                className="flex flex-col items-center gap-2 p-6 bg-white text-yellow-500 rounded-[32px] transition-all shadow-xl hover:bg-yellow-50"
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
              className="bg-white rounded-[48px] p-10 w-full max-w-md shadow-2xl text-center"
            >
              <h2 className="text-5xl font-black text-red-500 mb-4">Ой-ой!</h2>
              <p className="text-2xl font-bold text-gray-500 mb-8">Закончились сердечки</p>
              <button
                onClick={() => startLevel(currentLevel)}
                className="w-full py-5 bg-blue-500 text-white rounded-3xl text-2xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-blue-200"
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
        volume={volume}
        onVolumeChange={setVolume}
      />

      {gameState === "victory" && (
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
        />
      )}
    </div>
  );
}
