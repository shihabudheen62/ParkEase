import React from 'react';
import { motion } from 'framer-motion';
import { NavigationRounded as Navigation } from '@mui/icons-material';

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
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Navigation className="w-8 h-8 text-[#007AFF] fill-[#007AFF]/20" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Enable Location
          </h2>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            We need your location to show you the nearest parking spots and provide accurate directions.
          </p>
          
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
