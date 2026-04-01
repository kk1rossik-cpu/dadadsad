import { motion } from "motion/react";
import { Volume2, VolumeX, X } from "lucide-react";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
}

export default function Settings({ isOpen, onClose, soundEnabled, onToggleSound, volume, onVolumeChange }: SettingsProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-8 h-8 text-gray-500" />
        </button>

        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Настройки</h2>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium text-gray-700">Звук</span>
            <button
              onClick={onToggleSound}
              className={`p-4 rounded-full transition-all ${
                soundEnabled ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-gray-600">
              <span className="text-lg">Громкость</span>
              <span className="text-lg font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-10 py-4 bg-blue-500 text-white rounded-3xl text-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
        >
          Готово
        </button>
      </motion.div>
    </motion.div>
  );
}
