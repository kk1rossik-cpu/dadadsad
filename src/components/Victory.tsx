import { motion } from "motion/react";
import { Star, RefreshCw, Play } from "lucide-react";
import { Theme } from "../App";

interface VictoryProps {
  level: number;
  stars: number;
  onNext: () => void;
  onRetry: () => void;
  theme: Theme;
}

export default function Victory({ level, stars, onNext, onRetry, theme }: VictoryProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, rotate: -5 }}
      animate={{ scale: 1, rotate: 0 }}
      className={`bg-white p-10 w-full max-w-md shadow-2xl text-center relative overflow-hidden ${
        theme === "cartoon" ? "rounded-[60px]" : "rounded-[48px]"
      }`}
    >
      {/* Confetti background effect */}
      <div className={`absolute inset-0 pointer-events-none opacity-20 ${
        theme === "cartoon" ? "bg-gradient-to-br from-amber-100 via-pink-100 to-sky-100" : "bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100"
      }`} />

      <h2 className={`text-5xl font-black mb-4 relative ${
        theme === "cartoon" ? "text-amber-600" : "text-gray-800"
      }`}>Победа!</h2>
      <p className="text-2xl font-bold text-gray-500 mb-8 relative">Уровень {level + 1} пройден</p>

      <div className="flex justify-center gap-4 mb-12 relative">
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            initial={{ scale: 0, rotate: -45 }}
            animate={{ 
              scale: s <= stars ? 1 : 0.8, 
              rotate: 0,
              opacity: s <= stars ? 1 : 0.3
            }}
            transition={{ delay: 0.2 + s * 0.1, type: "spring" }}
          >
            <Star 
              className={`w-16 h-16 ${s <= stars ? (theme === "cartoon" ? "fill-amber-400 text-amber-400 drop-shadow-lg" : "fill-yellow-400 text-yellow-400 drop-shadow-lg") : "text-gray-200"}`} 
            />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-4 relative">
        <button
          onClick={onNext}
          className={`w-full py-5 text-white text-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 ${
            theme === "cartoon" ? "bg-amber-500 rounded-[40px] hover:bg-amber-600 shadow-amber-100" : "bg-green-500 rounded-3xl hover:bg-green-600 shadow-green-200"
          }`}
        >
          <Play className="w-8 h-8 fill-white" />
          Дальше
        </button>
        
        <button
          onClick={onRetry}
          className={`w-full py-5 transition-all flex items-center justify-center gap-3 ${
            theme === "cartoon" ? "bg-amber-50 text-amber-600 rounded-[40px] hover:bg-amber-100 font-bold text-xl" : "bg-blue-100 text-blue-600 rounded-3xl text-xl font-bold hover:bg-blue-200"
          }`}
        >
          <RefreshCw className="w-6 h-6" />
          Повторить
        </button>
      </div>
    </motion.div>
  );
}
