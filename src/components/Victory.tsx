import { motion } from "motion/react";
import { Star, RefreshCw, Play } from "lucide-react";

interface VictoryProps {
  level: number;
  stars: number;
  onNext: () => void;
  onRetry: () => void;
}

export default function Victory({ level, stars, onNext, onRetry }: VictoryProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -5 }}
        animate={{ scale: 1, rotate: 0 }}
        className="bg-white rounded-[48px] p-10 w-full max-w-md shadow-2xl text-center relative overflow-hidden"
      >
        {/* Confetti background effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100" />

        <h2 className="text-5xl font-black text-gray-800 mb-4 relative">Победа!</h2>
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
                className={`w-16 h-16 ${s <= stars ? "fill-yellow-400 text-yellow-400 drop-shadow-lg" : "text-gray-200"}`} 
              />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-4 relative">
          <button
            onClick={onNext}
            className="w-full py-5 bg-green-500 text-white rounded-3xl text-2xl font-black hover:bg-green-600 transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3"
          >
            <Play className="w-8 h-8 fill-white" />
            Дальше
          </button>
          
          <button
            onClick={onRetry}
            className="w-full py-5 bg-blue-100 text-blue-600 rounded-3xl text-xl font-bold hover:bg-blue-200 transition-all flex items-center justify-center gap-3"
          >
            <RefreshCw className="w-6 h-6" />
            Повторить
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
