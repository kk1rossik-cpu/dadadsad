import { motion } from "motion/react";
import { Volume2, VolumeX, X, PlayCircle, Music, Palette } from "lucide-react";
import { testVoice, startBackgroundMusic, stopBackgroundMusic } from "../lib/audioService";
import { Theme } from "../App";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  musicVolume: number;
  onMusicVolumeChange: (val: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function Settings({ 
  isOpen, 
  onClose, 
  soundEnabled, 
  onToggleSound, 
  musicEnabled,
  onToggleMusic,
  volume, 
  onVolumeChange,
  musicVolume,
  onMusicVolumeChange,
  theme,
  onThemeChange
}: SettingsProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`bg-white w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar ${
          theme === "cartoon" ? "rounded-[40px] md:rounded-[60px] p-8 md:p-10" : "rounded-[32px] md:rounded-[48px] p-6 md:p-8"
        }`}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-all"
          aria-label="Закрыть настройки"
        >
          <X className="w-6 h-6" />
        </motion.button>

        <h2 className={`text-3xl md:text-4xl font-black mb-8 md:mb-10 text-center ${
          theme === "cartoon" ? "text-amber-600" : "text-gray-800"
        }`}>Настройки</h2>

        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <span className="text-lg md:text-xl font-medium text-gray-700">Звук</span>
            <button
              onClick={onToggleSound}
              className={`p-3 md:p-4 rounded-full transition-all ${
                soundEnabled ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }`}
              aria-label={soundEnabled ? "Выключить звуковые эффекты" : "Включить звуковые эффекты"}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 md:w-8 md:h-8" /> : <VolumeX className="w-6 h-6 md:w-8 md:h-8" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg md:text-xl font-medium text-gray-700">Музыка</span>
            <button
              onClick={onToggleMusic}
              className={`p-3 md:p-4 rounded-full transition-all ${
                musicEnabled ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
              }`}
              aria-label={musicEnabled ? "Выключить фоновую музыку" : "Включить фоновую музыку"}
            >
              <Music className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between text-gray-600">
              <span className="text-base md:text-lg">Громкость звуков</span>
              <span className="text-base md:text-lg font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-6 md:h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
              aria-label="Громкость звуковых эффектов"
            />
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between text-gray-600">
              <span className="text-base md:text-lg">Громкость музыки</span>
              <span className="text-base md:text-lg font-bold">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={musicVolume}
              onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
              className="w-full h-6 md:h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
              aria-label="Громкость фоновой музыки"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4 text-gray-700 font-medium text-lg">
              <Palette className="w-6 h-6" />
              <span>Тема оформления</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onThemeChange("material")}
                className={`py-3 rounded-2xl font-bold transition-all border-2 ${
                  theme === "material" 
                    ? "bg-blue-50 border-blue-500 text-blue-600" 
                    : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                }`}
                aria-label="Выбрать тему Material Design"
                aria-pressed={theme === "material"}
              >
                Material
              </button>
              <button
                onClick={() => onThemeChange("cartoon")}
                className={`py-3 rounded-2xl font-bold transition-all border-2 ${
                  theme === "cartoon" 
                    ? "bg-amber-50 border-amber-500 text-amber-600" 
                    : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                }`}
                aria-label="Выбрать тему Cartoon"
                aria-pressed={theme === "cartoon"}
              >
                Cartoon
              </button>
            </div>
          </div>

          {/* Voice Test Button */}
          <div className="pt-4">
            <button
              onClick={() => testVoice(volume)}
              className="w-full py-4 bg-blue-50 text-blue-600 rounded-3xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-blue-100 transition-all border-2 border-blue-100"
              aria-label="Прослушать тестовый голос"
            >
              <PlayCircle className="w-6 h-6" />
              Проверить голос
            </button>
            <p className="text-center text-sm text-gray-400 mt-2">
              Нажми, чтобы услышать «Один»
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`w-full mt-10 py-5 text-white text-xl font-black transition-all shadow-xl
            ${theme === "cartoon" ? "bg-amber-500 rounded-[40px] hover:bg-amber-600 shadow-amber-100" : "bg-blue-500 rounded-3xl hover:bg-blue-600 shadow-blue-200"}
          `}
        >
          Готово
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
