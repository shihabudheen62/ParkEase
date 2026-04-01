import React from 'react';
import { motion } from 'framer-motion';
import { ExploreRounded as Compass, StarRounded as Star, ChevronRightRounded as ChevronRight } from '@mui/icons-material';
import { Slot } from '../types';
import { useCurrency } from '../CurrencyContext';

interface NearbySlotsProps {
  onSelectSlot: (slot: Slot) => void;
  slots: Slot[];
}

const NearbySlots: React.FC<NearbySlotsProps> = ({ onSelectSlot, slots }) => {
  const { currencySymbol } = useCurrency();
  return (
    <motion.div 
      initial={{ y: "40%" }}
      animate={{ y: "0%" }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={0.1}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      className="mt-auto relative z-20 bg-white rounded-t-[40px] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex flex-col h-[70vh] max-w-2xl mx-auto w-full"
    >
      {/* Drawer Handle */}
      <div className="w-full py-4 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
      </div>
      
      <div className="px-6 pb-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Nearby Slots</h2>
            <p className="text-sm text-gray-400">{slots.length} available spaces found</p>
          </div>
        </div>

        <div className="space-y-4 pb-20">
          {slots.length > 0 ? (
            slots.map((slot) => (
              <motion.div 
                key={slot.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSlot(slot)}
                className="bg-white border border-gray-200 rounded-3xl p-3 flex gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <img 
                    src={slot.images[0]} 
                    alt={slot.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {slot.rating >= 4.8 && (
                    <div className="absolute top-2 left-2 bg-[#007AFF] text-[8px] font-bold text-white px-2 py-1 rounded-md uppercase tracking-wider">
                      Top Rated
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{slot.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                        <span className="text-[10px] font-bold text-gray-900">{slot.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                      <Compass className="w-3 h-3" />
                      <span>{slot.distance} • {slot.type}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-lg font-bold text-gray-900">{currencySymbol} {slot.price.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 ml-1">/ hr</span>
                    </div>
                    <button className="bg-[#007AFF] text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg shadow-blue-100">
                      Book
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Compass className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No slots found</h3>
              <p className="text-sm text-gray-400 max-w-[200px] mx-auto mt-1">
                There are no parking spaces within an 8km radius of your location.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NearbySlots;
