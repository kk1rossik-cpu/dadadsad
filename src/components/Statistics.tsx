import { motion, AnimatePresence } from "motion/react";
import { X, Trophy, Clock, Target, RotateCcw, BarChart2 } from "lucide-react";
import { GameStats } from "../lib/statsService";
import { LEVELS } from "../lib/gameLogic";
import { Theme } from "../App";

interface StatisticsProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  onReset: () => void;
  theme: Theme;
}

export default function Statistics({ isOpen, onClose, stats, onReset, theme }: StatisticsProps) {
  const winRate = stats.totalGames > 0 
    ? Math.round((stats.totalWins / stats.totalGames) * 100) 
    : 0;

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`bg-white p-6 md:p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar ${
              theme === "cartoon" ? "rounded-[40px] md:rounded-[60px]" : "rounded-[32px] md:rounded-[48px]"
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <h2 className={`text-2xl md:text-4xl font-black flex items-center gap-2 md:gap-3 ${
                theme === "cartoon" ? "text-amber-600" : "text-gray-800"
              }`}>
                <BarChart2 className={`w-8 h-8 md:w-10 md:h-10 ${theme === "cartoon" ? "text-amber-500" : "text-blue-500"}`} />
                Твои успехи
              </h2>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
                aria-label="Закрыть статистику"
              >
                <X className="w-6 h-6 text-gray-500" />
              </motion.button>
            </div>

            {/* General Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
              <div className={`${theme === "cartoon" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"} p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-center border-2`}>
                <Trophy className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${theme === "cartoon" ? "text-amber-500" : "text-blue-500"}`} />
                <div className={`text-2xl md:text-3xl font-black ${theme === "cartoon" ? "text-amber-600" : "text-blue-600"}`}>{stats.totalWins}</div>
                <div className={`text-xs md:text-sm font-bold uppercase tracking-wider ${theme === "cartoon" ? "text-amber-400" : "text-blue-400"}`}>Побед</div>
              </div>
              <div className={`${theme === "cartoon" ? "bg-pink-50 border-pink-100" : "bg-green-50 border-green-100"} p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-center border-2`}>
                <Target className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${theme === "cartoon" ? "text-pink-500" : "text-green-500"}`} />
                <div className={`text-2xl md:text-3xl font-black ${theme === "cartoon" ? "text-pink-600" : "text-green-600"}`}>{winRate}%</div>
                <div className={`text-xs md:text-sm font-bold uppercase tracking-wider ${theme === "cartoon" ? "text-pink-400" : "text-green-400"}`}>Точность</div>
              </div>
              <div className={`${theme === "cartoon" ? "bg-sky-50 border-sky-100" : "bg-purple-50 border-purple-100"} p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-center border-2`}>
                <Clock className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${theme === "cartoon" ? "text-sky-500" : "text-purple-500"}`} />
                <div className={`text-2xl md:text-3xl font-black ${theme === "cartoon" ? "text-sky-600" : "text-purple-600"}`}>{stats.totalGames}</div>
                <div className={`text-xs md:text-sm font-bold uppercase tracking-wider ${theme === "cartoon" ? "text-sky-400" : "text-purple-400"}`}>Игр всего</div>
              </div>
            </div>

            {/* Level Stats Table */}
            <div className="space-y-4">
              <h3 className="text-xl md:text-2xl font-black text-gray-700 px-2">Рекорды по уровням</h3>
              <div className="bg-gray-50 rounded-[24px] md:rounded-[32px] p-2 md:p-4 overflow-x-auto border-2 border-gray-100">
                <div className="min-w-[300px]">
                  <div className="grid grid-cols-4 gap-2 md:gap-4 px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 mb-2">
                    <span>Уровень</span>
                    <span className="text-center">Игры</span>
                    <span className="text-center">Победы</span>
                    <span className="text-right">Время</span>
                  </div>
                  <div className="space-y-1 max-h-[300px] md:max-h-[400px] overflow-y-auto no-scrollbar">
                    {LEVELS.map((_, idx) => {
                      const levelStat = stats.levelStats[idx];
                      return (
                        <div key={idx} className="grid grid-cols-4 gap-2 md:gap-4 px-2 md:px-4 py-3 rounded-xl md:rounded-2xl hover:bg-white transition-colors items-center">
                          <span className="font-black text-gray-700 text-base md:text-lg">#{idx + 1}</span>
                          <span className="text-center font-bold text-gray-500 text-sm md:text-base">{levelStat?.attempts || 0}</span>
                          <span className="text-center font-bold text-green-500 text-sm md:text-base">{levelStat?.wins || 0}</span>
                          <span className="text-right font-black text-blue-500 text-sm md:text-base">
                            {formatTime(levelStat?.fastestTime || null)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-10">
              <button
                onClick={onReset}
                className="flex-1 py-5 bg-red-50 text-red-500 rounded-3xl text-xl font-black hover:bg-red-100 transition-all flex items-center justify-center gap-3 border-2 border-red-100"
                aria-label="Сбросить всю статистику"
              >
                <RotateCcw className="w-6 h-6" />
                Сбросить всё
              </button>
              <button
                onClick={onClose}
                className={`flex-[2] py-5 text-white text-xl font-black transition-all shadow-xl
                  ${theme === "cartoon" ? "bg-amber-500 rounded-[40px] hover:bg-amber-600" : "bg-gray-900 rounded-3xl hover:bg-black"}
                `}
              >
                Отлично!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
