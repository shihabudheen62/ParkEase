import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { Slot } from '../types';
import { SLOTS } from '../constants';
import { useCurrency } from '../CurrencyContext';
import { useLocation } from '../LocationContext';
import { useAuth } from '../AuthContext';
import MapComponent from './MapComponent';
import LocationSelector from './LocationSelector';
import NearbySlots from './NearbySlots';
import Navigation from './Navigation';
import MySlots from './MySlots';
import Profile from './Profile';
import Bookings from './Bookings';
import LocationPermissionModal from './LocationPermissionModal';

interface HomeProps {
  onSelectSlot: (slot: Slot) => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onLocationDrawerChange?: (isOpen: boolean) => void;
}

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Home: React.FC<HomeProps> = ({ 
  onSelectSlot, 
  initialTab = 'explore', 
  onTabChange,
  onLocationDrawerChange
}) => {
  const { user } = useAuth();
  const { setCurrencyByCountryCode } = useCurrency();
  const { 
    mapCenter, setMapCenter, 
    userLocation, setUserLocation, 
    currentAddress, setCurrentAddress, 
    currentAddressType, setCurrentAddressType,
    isInitialLoad, setIsInitialLoad,
    showPermissionModal, setShowPermissionModal
  } = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch slots from Firestore
  useEffect(() => {
    const q = query(collection(db, 'slots'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slotsData: Slot[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Slot;
        // Only include active and available slots in the explorer
        if (data.status === 'ACTIVE' && data.isAvailable === true) {
          slotsData.push({ id: doc.id, ...data });
        }
      });
      setAllSlots(slotsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'slots');
    });

    return () => unsubscribe();
  }, []);

  // Auto-detection on mount
  useEffect(() => {
    const checkLocationPrompt = async () => {
      if (!isInitialLoad || !user) return;
      setIsInitialLoad(false);

      const storageKey = `parkgreen_location_prompt_seen_${user.uid}`;
      const hasSeenPrompt = localStorage.getItem(storageKey);

      // If already seen, don't show modal. 
      // But if permission is granted, we can still detect location automatically.
      if (hasSeenPrompt) {
        if (navigator.permissions) {
          try {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            if (status.state === 'granted') {
              detectLocation();
            }
          } catch (e) {
            // Permissions API might not be supported or fail
          }
        }
        return;
      }

      // If not seen yet, check current permission status
      if (navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'granted') {
            // Already granted, just detect and mark as seen
            detectLocation();
            localStorage.setItem(storageKey, 'true');
            return;
          } else if (status.state === 'denied') {
            // Already denied, don't bother showing modal, mark as seen
            localStorage.setItem(storageKey, 'true');
            return;
          }
        } catch (e) {
          // Fallback if permissions API fails
        }
      }

      // If we reach here, it's 'prompt' status and not seen yet
      setShowPermissionModal(true);
    };

    checkLocationPrompt();
  }, [isInitialLoad, user]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPos: [number, number] = [latitude, longitude];
        setUserLocation(newPos);
        setMapCenter(newPos);
        setCurrentAddressType('Current Location');

        // Reverse geocoding to get address
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            const a = data.address;
            const parts = [];
            
            // Specifics
            if (a.building) parts.push(a.building);
            if (a.house_name) parts.push(a.house_name);
            if (a.amenity) parts.push(a.amenity);
            if (a.shop) parts.push(a.shop);
            if (a.office) parts.push(a.office);
            if (a.tourism) parts.push(a.tourism);
            if (a.historic) parts.push(a.historic);
            
            // Street level
            if (a.house_number) parts.push(a.house_number);
            if (a.road) parts.push(a.road);
            if (a.pedestrian) parts.push(a.pedestrian);
            if (a.path) parts.push(a.path);
            
            // Area level
            if (a.neighbourhood) parts.push(a.neighbourhood);
            if (a.suburb) parts.push(a.suburb);
            if (a.village) parts.push(a.village);
            if (a.town) parts.push(a.town);
            if (a.city_district) parts.push(a.city_district);
            if (a.city) parts.push(a.city);
            if (a.state_district) parts.push(a.state_district);
            if (a.state) parts.push(a.state);

            const uniqueParts = parts.filter((val, index, self) => val && self.indexOf(val) === index);
            if (uniqueParts.length > 0) {
              setCurrentAddress(uniqueParts.join(', '));
            } else {
              setCurrentAddress(data.display_name);
            }
            if (data.address && data.address.country_code) {
              setCurrencyByCountryCode(data.address.country_code);
            }
          }
 else if (data && data.display_name) {
            setCurrentAddress(data.display_name);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
        }
      },
      (error) => {
        console.error("Error detecting location:", error);
        toast.error("Could not detect your exact location. Please ensure GPS is enabled or search for your address manually.");
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const sortedSlots = useMemo(() => {
    if (!userLocation) return allSlots;

    return [...allSlots]
      .map(slot => ({
        ...slot,
        calculatedDistance: calculateDistance(userLocation[0], userLocation[1], slot.lat, slot.lng)
      }))
      .filter(slot => slot.calculatedDistance <= 8) // Filter within 8km radius
      .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
      .map(slot => ({
        ...slot,
        distance: `${slot.calculatedDistance.toFixed(1)} km`
      }));
  }, [userLocation, allSlots]);

  const handleAddressSelect = async (address: string, type?: string, lat?: number, lng?: number) => {
    setCurrentAddress(address);
    setCurrentAddressType(type || 'Location');

    if (lat !== undefined && lng !== undefined) {
      const newPos: [number, number] = [lat, lng];
      setMapCenter(newPos);
      setUserLocation(newPos);

      // Still reverse geocode to get country code for currency, but don't update map center from it
      try {
        const revResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const revData = await revResponse.json();
        if (revData && revData.address && revData.address.country_code) {
          setCurrencyByCountryCode(revData.address.country_code);
        }
      } catch (error) {
        console.error("Error reverse geocoding selected address:", error);
      }
      return;
    }

    // Geocode the address to update map center (only if coords were not provided)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(newPos);
        setUserLocation(newPos);

        // Reverse geocoding to get country code for the selected address
        try {
          const revResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const revData = await revResponse.json();
          if (revData && revData.address && revData.address.country_code) {
            setCurrencyByCountryCode(revData.address.country_code);
          }
        } catch (error) {
          console.error("Error reverse geocoding selected address:", error);
        }
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] overflow-hidden relative">
      <AnimatePresence>
        {showPermissionModal && (
          <LocationPermissionModal 
            onAllow={() => {
              setShowPermissionModal(false);
              if (user) {
                localStorage.setItem(`parkgreen_location_prompt_seen_${user.uid}`, 'true');
              }
              detectLocation();
            }}
            onDecline={() => {
              setShowPermissionModal(false);
              if (user) {
                localStorage.setItem(`parkgreen_location_prompt_seen_${user.uid}`, 'true');
              }
              // Use default location (Palakkad)
              setCurrentAddress('Palakkad, Kerala, India');
            }}
          />
        )}
      </AnimatePresence>

      {activeTab === 'explore' ? (
        <>
          <MapComponent 
            onSelectSlot={onSelectSlot} 
            center={mapCenter} 
            userLocation={userLocation}
            slots={sortedSlots}
          />
          
          <LocationSelector 
            currentAddress={currentAddress} 
            currentAddressType={currentAddressType}
            onAddressSelect={handleAddressSelect} 
            onSheetStateChange={onLocationDrawerChange}
          />

          <NearbySlots 
            onSelectSlot={onSelectSlot} 
            slots={sortedSlots}
          />
        </>
      ) : activeTab === 'myslots' ? (
        <MySlots />
      ) : activeTab === 'bookings' ? (
        <Bookings setActiveTab={setActiveTab} />
      ) : activeTab === 'profile' ? (
        <Profile onSelectSlot={onSelectSlot} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View Coming Soon
        </div>
      )}
    </div>
  );
};

export default Home;
