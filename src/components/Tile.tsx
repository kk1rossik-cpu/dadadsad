import { motion } from "motion/react";
import React from "react";
import { TileData } from "../lib/gameLogic";
import { Theme } from "../App";

interface TileProps {
  key?: React.Key;
  tile: TileData;
  isSelected: boolean;
  isHinted: boolean;
  onClick: (tile: TileData) => void | Promise<void>;
  theme: Theme;
}

export default function Tile({ tile, isSelected, isHinted, onClick, theme }: TileProps) {
  if (tile.isMatched) return null;

  const getNumberColor = (idx: number) => {
    if (theme === "cartoon") {
      const colors = [
        "text-blue-500", "text-red-500", "text-green-500", "text-purple-500",
        "text-orange-500", "text-pink-500", "text-indigo-500", "text-teal-500",
        "text-amber-500", "text-cyan-500", "text-emerald-500", "text-rose-500",
        "text-violet-500", "text-fuchsia-500", "text-sky-500", "text-lime-500",
        "text-yellow-500", "text-slate-500", "text-zinc-500", "text-neutral-500"
      ];
      return colors[idx % colors.length];
    }
    const colors = [
      "text-blue-600", "text-red-600", "text-green-600", "text-purple-600",
      "text-orange-600", "text-pink-600", "text-indigo-600", "text-teal-600",
      "text-amber-600", "text-cyan-600", "text-emerald-600", "text-rose-600",
      "text-violet-600", "text-fuchsia-600", "text-sky-600", "text-lime-600",
      "text-yellow-600", "text-slate-600", "text-zinc-600", "text-neutral-600"
    ];
    return colors[idx % colors.length];
  };

  const getBgColor = (idx: number) => {
    if (theme === "cartoon") {
      const bgs = [
        "bg-blue-100", "bg-red-100", "bg-green-100", "bg-purple-100",
        "bg-orange-100", "bg-pink-100", "bg-indigo-100", "bg-teal-100",
        "bg-amber-100", "bg-cyan-100", "bg-emerald-100", "bg-rose-100",
        "bg-violet-100", "bg-fuchsia-100", "bg-sky-100", "bg-lime-100",
        "bg-yellow-100", "bg-slate-100", "bg-zinc-100", "bg-neutral-100"
      ];
      return bgs[idx % bgs.length];
    }
    const bgs = [
      "bg-blue-50", "bg-red-50", "bg-green-50", "bg-purple-50",
      "bg-orange-50", "bg-pink-50", "bg-indigo-50", "bg-teal-50",
      "bg-amber-50", "bg-cyan-50", "bg-emerald-50", "bg-rose-50",
      "bg-violet-50", "bg-fuchsia-50", "bg-sky-50", "bg-lime-50",
      "bg-yellow-50", "bg-slate-50", "bg-zinc-50", "bg-neutral-50"
    ];
    return bgs[idx % bgs.length];
  };

  return (
    <motion.div
      role="button"
      aria-label={`${tile.isAvailable ? "" : "Заблокированная "}плитка с числом ${tile.value}${isSelected ? ", выбрана" : ""}${isHinted ? ", подсказка" : ""}`}
      tabIndex={tile.isAvailable ? 0 : -1}
      onKeyDown={(e) => {
        if (tile.isAvailable && (e.key === "Enter" || e.key === " ")) {
          onClick(tile);
        }
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isSelected ? 1.1 : 1, 
        opacity: 1,
        x: tile.x * 80 + (tile.z * 4), // Small offset for 3D stack effect
        y: tile.y * 100 - (tile.z * 4),
        zIndex: isSelected ? 100 : tile.z * 10,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={tile.isAvailable && !isSelected && !isHinted ? { 
        scale: 1.08,
        rotate: [0, -1, 1, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(tile)}
      className={`
        absolute w-16 h-20 flex flex-col items-center justify-center cursor-pointer
        shadow-md border-b-4 border-r-4 transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-blue-400
        ${theme === "cartoon" ? "rounded-[28px]" : "rounded-2xl"}
        ${tile.isAvailable ? "opacity-100" : "opacity-40 grayscale-[0.8]"}
        ${isSelected 
          ? `ring-4 ${theme === "cartoon" ? "ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-300" : "ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)] border-blue-400"} z-[100]` 
          : "border-gray-200"
        }
        ${isHinted && !isSelected ? `ring-4 ${theme === "cartoon" ? "ring-pink-400/70 shadow-[0_0_15px_rgba(244,114,182,0.4)]" : "ring-yellow-400/70 shadow-[0_0_15px_rgba(250,204,21,0.4)]"}` : ""}
        ${getBgColor(tile.colorIndex)}
      `}
    >
      {isHinted && !isSelected && (
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className={`absolute inset-0 pointer-events-none ring-4 ${
            theme === "cartoon" ? "rounded-[28px] ring-pink-400" : "rounded-2xl ring-yellow-400"
          }`}
        />
      )}
      <span className={`text-4xl font-black ${getNumberColor(tile.colorIndex)} select-none ${isSelected ? "scale-110" : ""}`}>
        {tile.value}
      </span>
      
      {/* 3D effect shadow */}
      <div className={`absolute inset-0 border-2 border-white/50 pointer-events-none ${
        theme === "cartoon" ? "rounded-[28px]" : "rounded-2xl"
      }`} />
    </motion.div>
  );
}
