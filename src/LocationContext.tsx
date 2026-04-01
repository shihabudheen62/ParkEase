import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocationContextType {
  mapCenter: [number, number];
  setMapCenter: (pos: [number, number]) => void;
  userLocation: [number, number] | null;
  setUserLocation: (pos: [number, number] | null) => void;
  currentAddress: string;
  setCurrentAddress: (address: string) => void;
  currentAddressType: string;
  setCurrentAddressType: (type: string) => void;
  isInitialLoad: boolean;
  setIsInitialLoad: (val: boolean) => void;
  showPermissionModal: boolean;
  setShowPermissionModal: (val: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.7867, 76.6547]); // Default to Palakkad
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [currentAddress, setCurrentAddress] = useState('Detecting location...');
  const [currentAddressType, setCurrentAddressType] = useState('Current Location');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  return (
    <LocationContext.Provider value={{
      mapCenter, setMapCenter,
      userLocation, setUserLocation,
      currentAddress, setCurrentAddress,
      currentAddressType, setCurrentAddressType,
      isInitialLoad, setIsInitialLoad,
      showPermissionModal, setShowPermissionModal
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
