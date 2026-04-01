import { motion } from "motion/react";
import React from "react";
import { TileData } from "../lib/gameLogic";

interface TileProps {
  key?: React.Key;
  tile: TileData;
  isSelected: boolean;
  isHinted: boolean;
  onClick: (tile: TileData) => void | Promise<void>;
}

export default function Tile({ tile, isSelected, isHinted, onClick }: TileProps) {
  if (tile.isMatched) return null;

  const getNumberColor = (idx: number) => {
    const colors = [
      "text-blue-600", "text-red-600", "text-green-600", "text-purple-600",
      "text-orange-600", "text-pink-600", "text-indigo-600", "text-teal-600",
      "text-amber-600", "text-cyan-600"
    ];
    return colors[idx % colors.length];
  };

  const getBgColor = (idx: number) => {
    const bgs = [
      "bg-blue-50", "bg-red-50", "bg-green-50", "bg-purple-50",
      "bg-orange-50", "bg-pink-50", "bg-indigo-50", "bg-teal-50",
      "bg-amber-50", "bg-cyan-50"
    ];
    return bgs[idx % bgs.length];
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: tile.x * 80,
        y: tile.y * 100,
        zIndex: tile.z * 10,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={tile.isAvailable ? { scale: 1.05 } : {}}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(tile)}
      className={`
        absolute w-16 h-20 rounded-2xl flex items-center justify-center cursor-pointer
        shadow-md border-b-4 border-r-4 transition-all duration-200
        ${tile.isAvailable ? "opacity-100" : "opacity-60 grayscale-[0.5]"}
        ${isSelected ? "ring-4 ring-blue-400 scale-105 shadow-xl" : ""}
        ${isHinted ? "ring-4 ring-yellow-400 animate-pulse" : ""}
        ${getBgColor(tile.colorIndex)}
        ${isSelected ? "border-blue-300" : "border-gray-200"}
      `}
    >
      <span className={`text-4xl font-bold ${getNumberColor(tile.colorIndex)} select-none`}>
        {tile.value}
      </span>
      
      {/* 3D effect shadow */}
      <div className="absolute inset-0 rounded-2xl border-2 border-white/50 pointer-events-none" />
    </motion.div>
  );
}
