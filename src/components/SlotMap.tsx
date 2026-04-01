import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CloseRounded as X, ElectricBoltRounded as Zap, DirectionsCarRounded as Car } from '@mui/icons-material';

interface SlotMapProps {
  onSelect: (slotId: string) => void;
  selectedSlot: string | null;
  onClose: () => void;
  rows?: number;
  cols?: number;
  levels?: number;
  occupiedSlots?: string[];
  evSlots?: string[];
}

const SlotMap: React.FC<SlotMapProps> = ({ 
  onSelect, 
  selectedSlot, 
  onClose,
  rows = 5,
  cols = 7,
  levels = 3,
  occupiedSlots = [],
  evSlots = []
}) => {
  const [activeLevel, setActiveLevel] = useState(() => {
    if (selectedSlot && selectedSlot.startsWith('L')) {
      const match = selectedSlot.match(/^L(\d+)-/);
      if (match) return parseInt(match[1]);
    }
    return 1;
  });

  // Generate row labels (A, B, C...)
  const rowLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < rows; i++) {
      labels.push(String.fromCharCode(65 + i));
    }
    return labels.reverse(); // Display from top to bottom (e.g., E, D, C, B, A)
  }, [rows]);

  // Generate column numbers (1, 2, 3...)
  const colNumbers = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= cols; i++) {
      nums.push(i);
    }
    return nums;
  }, [cols]);

  // Generate levels array
  const levelsArray = useMemo(() => {
    const lvls = [];
    for (let i = 1; i <= levels; i++) {
      lvls.push(i);
    }
    return lvls;
  }, [levels]);

  const renderSlot = (row: string, col: number) => {
    const slotId = levels > 1 ? `L${activeLevel}-${row}${col}` : `${row}${col}`;
    const isOccupied = occupiedSlots.includes(slotId);
    const isEV = evSlots.includes(slotId);
    const isSelected = selectedSlot === slotId;

    return (
      <motion.button
        key={slotId}
        whileTap={!isOccupied ? { scale: 0.9 } : {}}
        onClick={() => !isOccupied && onSelect(slotId)}
        disabled={isOccupied}
        className={`
          relative w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all
          ${isOccupied 
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
            : isSelected 
              ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-100' 
              : isEV 
                ? 'bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe]' 
                : 'bg-white text-gray-600 border border-gray-100 shadow-sm hover:border-gray-200'
          }
        `}
      >
        {isOccupied ? (
          <Car className="w-5 h-5 opacity-20" />
        ) : isEV ? (
          <div className="relative">
            <Zap className="w-4 h-4 fill-current" />
            <span className="absolute -top-1 -right-1 text-[8px] font-black">1</span>
          </div>
        ) : (
          col
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Select Slot</h3>
          <p className="text-xs text-gray-500 font-medium">Choose your preferred parking spot</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Level Selector */}
      <div className="p-6 flex gap-3 overflow-x-auto no-scrollbar">
        {levelsArray.map((level) => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`
              min-w-[100px] py-3 rounded-2xl font-bold text-sm transition-all
              ${activeLevel === level 
                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-100' 
                : 'bg-white text-gray-500 border border-gray-100'
              }
            `}
          >
            Level {level}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 flex justify-between items-center shadow-sm">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-gray-300" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Occupied</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-600">1</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Available</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">1</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Selected</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#3b82f6] fill-current" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">EV Slot</span>
          </div>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 px-6 pb-10 overflow-y-auto">
        <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
          {/* Grid Background Dots */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div className="relative space-y-6">
            {rowLabels.map((row) => (
              <div key={row} className="flex items-center gap-4">
                <span className="w-4 text-[10px] font-black text-gray-300 text-center">{row}</span>
                <div className="flex-1 flex justify-between gap-2">
                  {colNumbers.map((col) => renderSlot(row, col))}
                </div>
              </div>
            ))}

            {/* Driveway Indicator */}
            <div className="py-4 border-y border-dashed border-gray-100 flex items-center justify-center">
              <span className="text-[8px] font-black text-gray-300 tracking-[0.5em] uppercase">Driveway</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-6 bg-white border-t border-gray-100">
        <button
          disabled={!selectedSlot}
          onClick={onClose}
          className={`
            w-full py-4 rounded-full font-bold transition-all active:scale-[0.98]
            ${selectedSlot 
              ? 'bg-[#007AFF] text-white shadow-xl shadow-blue-100' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {selectedSlot ? `Confirm Slot ${selectedSlot}` : 'Select a Slot'}
        </button>
      </div>
    </div>
  );
};

export default SlotMap;
