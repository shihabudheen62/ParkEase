import React from 'react';
import { motion } from 'framer-motion';
import { LocationOnRounded as Navigation } from '@mui/icons-material';

interface LocationPermissionModalProps {
  onAllow: () => void;
  onDecline: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({ onAllow, onDecline }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Enable Location
              </h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                We need your location to show you the nearest parking spots and provide accurate directions.
              </p>
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex-shrink-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Navigation className="w-6 h-6 text-[#007AFF] fill-[#007AFF]/20" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={onAllow}
              className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-semibold text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
            >
              Allow Access
            </button>
            
            <button
              onClick={onDecline}
              className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-semibold text-lg active:scale-[0.98] transition-transform"
            >
              Not Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LocationPermissionModal;
