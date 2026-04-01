import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeftRounded as ChevronLeft, 
  FavoriteRounded as Heart, 
  LocationOnRounded as MapPin, 
  StarRounded as Star, 
  BookmarkRounded as Bookmark 
} from '@mui/icons-material';
import { Slot } from '../types';

interface SavedItemsProps {
  slots: Slot[];
  onBack: () => void;
  onSelectSlot: (slot: Slot) => void;
  onRemove: (slotId: string) => void;
  isRemoving: string | null;
}

const SavedItems: React.FC<SavedItemsProps> = ({ slots, onBack, onSelectSlot, onRemove, isRemoving }) => {
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 flex items-center gap-4 shadow-sm">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-extrabold text-[#1A1C1E]">Saved Places</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {slots.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {slots.map((slot) => (
              <motion.div 
                key={slot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectSlot(slot)}
                className="bg-white rounded-[24px] p-3 flex gap-4 shadow-sm border border-gray-200 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                  <img 
                    src={slot.images[0]} 
                    alt={slot.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(slot.id);
                    }}
                    disabled={isRemoving === slot.id}
                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform disabled:opacity-50"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isRemoving === slot.id ? 'text-gray-300' : 'text-[#EA4335] fill-[#EA4335]'}`} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-[#1A1C1E] text-sm line-clamp-1">{slot.name}</h3>
                      <div className="flex items-center gap-0.5 bg-orange-50 px-1.5 py-0.5 rounded-md">
                        <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        <span className="text-[10px] font-bold text-orange-700">{slot.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 mt-1">
                      <MapPin className="w-3 h-3 text-[#007AFF]" />
                      <p className="text-[10px] font-medium line-clamp-1">{slot.address}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-[#007AFF]">${slot.price.toFixed(2)}</span>
                      <span className="text-[9px] text-gray-400 font-bold">/hr</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      {slot.distance}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Bookmark className="w-10 h-10 text-gray-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1C1E]">No saved places</h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto">Spots you save will appear here for quick access.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedItems;
