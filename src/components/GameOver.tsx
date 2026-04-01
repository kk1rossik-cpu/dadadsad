import { motion } from "motion/react";
import { RefreshCw, Home } from "lucide-react";
import { Theme } from "../App";

interface GameOverProps {
  onRetry: () => void;
  onMenu: () => void;
  theme: Theme;
}

export default function GameOver({ onRetry, onMenu, theme }: GameOverProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`bg-white p-8 md:p-12 w-full max-w-md shadow-2xl text-center relative overflow-hidden ${
        theme === "cartoon" ? "rounded-[60px]" : "rounded-[48px]"
      }`}
    >
      <h2 className={`text-4xl md:text-5xl font-black mb-4 relative ${
        theme === "cartoon" ? "text-pink-500" : "text-red-500"
      }`}>Ой-ой!</h2>
      <p className="text-xl md:text-2xl font-bold text-gray-500 mb-8 relative">Закончились сердечки</p>

      <div className="flex flex-col gap-4 relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className={`w-full py-5 text-white text-xl md:text-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 ${
            theme === "cartoon" ? "bg-amber-500 rounded-[40px] hover:bg-amber-600 shadow-amber-100" : "bg-blue-500 rounded-3xl hover:bg-blue-600 shadow-blue-200"
          }`}
          aria-label="Попробовать уровень еще раз"
        >
          <RefreshCw className="w-6 h-6 md:w-8 md:h-8" />
          Еще раз
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onMenu}
          className={`w-full py-4 transition-all flex items-center justify-center gap-3 ${
            theme === "cartoon" ? "bg-gray-50 text-gray-400 rounded-[40px] hover:bg-gray-100 font-bold text-lg" : "bg-gray-100 text-gray-500 rounded-3xl text-lg font-bold hover:bg-gray-200"
          }`}
          aria-label="Вернуться в главное меню"
        >
          <Home className="w-5 h-5 md:w-6 md:h-6" />
          В меню
        </motion.button>
      </div>
    </motion.div>
  );
}
