import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeftRounded as ChevronLeft, 
  SearchRounded as Search, 
  LocationOnRounded as MapPin, 
  LocationOnRounded as Navigation, 
  HomeRounded as Home, 
  WorkRounded as Briefcase, 
  MoreHorizRounded as MoreHorizontal, 
  PhotoCameraRounded as Camera, 
  PersonRounded as User, 
  PhoneRounded as Phone, 
  ChevronRightRounded as ChevronRight, 
  CloseRounded as X 
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { createPinIcon } from '../constants';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface AddAddressFormProps {
  onBack: () => void;
  onSave: (addressData: any) => void;
  initialLat?: number;
  initialLng?: number;
  editData?: any;
}

const MapHandler: React.FC<{ 
  onMove: (lat: number, lng: number) => void; 
  onMoveStart?: () => void;
  triggerResize: any;
  center: [number, number];
  isLocked?: boolean;
}> = ({ onMove, onMoveStart, triggerResize, center, isLocked }) => {
  const map = useMap();
  const lastCenterRef = useRef(center);
  const isResizingRef = useRef(false);
  
  useEffect(() => {
    if (isLocked) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [isLocked, map]);

  useEffect(() => {
    // If center changes from outside (e.g. Locate Me), update map view
    if (center[0] !== lastCenterRef.current[0] || center[1] !== lastCenterRef.current[1]) {
      map.flyTo(center, 17, { duration: 1.5 }); // Smooth flyTo with higher zoom
      lastCenterRef.current = center;
    }
  }, [center, map]);

  useEffect(() => {
    isResizingRef.current = true;
    // Invalidate size multiple times during the transition to ensure tiles fill the container
    const intervals = [50, 150, 300, 500];
    const timers = intervals.map(ms => setTimeout(() => {
      map.invalidateSize();
      if (ms === 500) isResizingRef.current = false;
    }, ms));
    return () => timers.forEach(t => clearTimeout(t));
  }, [triggerResize, map]);

  useMapEvents({
    movestart: () => {
      if (!isResizingRef.current && !isLocked) {
        onMoveStart?.();
      }
    },
    moveend: () => {
      if (isResizingRef.current || isLocked) return;
      const newCenter = map.getCenter();
      // Only trigger if the movement is significant to avoid jitter
      const dist = Math.sqrt(
        Math.pow(newCenter.lat - lastCenterRef.current[0], 2) + 
        Math.pow(newCenter.lng - lastCenterRef.current[1], 2)
      );
      if (dist > 0.00001) {
        lastCenterRef.current = [newCenter.lat, newCenter.lng];
        onMove(newCenter.lat, newCenter.lng);
      }
    },
  });
  return null;
};

const AddAddressForm: React.FC<AddAddressFormProps> = ({ onBack, onSave, initialLat = 10.7867, initialLng = 76.6547, editData }) => {
  const [position, setPosition] = useState<[number, number]>([
    editData?.lat || initialLat, 
    editData?.lng || initialLng
  ]);
  const [address, setAddress] = useState(editData?.address || 'Loading address...');
  const [addressDetails, setAddressDetails] = useState(editData?.addressDetails || '');
  const [receiverName, setReceiverName] = useState(editData?.receiverName || 'Shihab CA');
  const [receiverPhone, setReceiverPhone] = useState(editData?.receiverPhone || '+91 8893154581');
  const [addressType, setAddressType] = useState<'home' | 'work' | 'other'>(editData?.addressType || 'home');
  const [isLocating, setIsLocating] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user location on mount for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  // Haversine formula to calculate distance between two points in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceDisplay = (lat: number, lon: number) => {
    if (!userLocation) return '0.0 km';
    const dist = calculateDistance(userLocation[0], userLocation[1], lat, lon);
    return `${dist.toFixed(1)} km`;
  };

  // Search for locations using Nominatim
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=10`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const isMapShrunk = scrollOffset > 20;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(e.currentTarget.scrollTop);
  };

  const parseAddress = (data: any) => {
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
      
      // Street
      if (a.house_number) parts.push(a.house_number);
      if (a.road) parts.push(a.road);
      if (a.pedestrian) parts.push(a.pedestrian);
      if (a.path) parts.push(a.path);
      
      // Area
      if (a.neighbourhood) parts.push(a.neighbourhood);
      if (a.suburb) parts.push(a.suburb);
      if (a.village || a.town || a.city_district) parts.push(a.village || a.town || a.city_district);
      if (a.city) parts.push(a.city);
      if (a.state) parts.push(a.state);
      if (a.country) parts.push(a.country);

      const uniqueParts = parts.filter((val, index, self) => 
        val && self.indexOf(val) === index
      );

      return uniqueParts.length > 0 ? uniqueParts.join(', ') : data.display_name;
    }
    return data?.display_name || 'Unknown Location';
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMove = useCallback(async (lat: number, lng: number) => {
    // Skip updates if the map is locked
    if (isMapShrunk) return;
    
    setPosition([lat, lng]);
    setIsUpdatingAddress(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to debounce the request
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setAddress(parseAddress(data));
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        if (address === 'Loading address...') {
          setAddress('Location details unavailable');
        }
      } finally {
        setIsUpdatingAddress(false);
        timeoutRef.current = null;
      }
    }, 400);
  }, [isMapShrunk, address]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fetch initial address on mount only if we don't have one
  useEffect(() => {
    if (address === 'Loading address...') {
      handleMove(initialLat, initialLng);
    }
  }, [initialLat, initialLng, handleMove, address]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        handleMove(latitude, longitude);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!auth.currentUser) {
      setError('Please sign in to save addresses');
      return;
    }

    if (!addressDetails.trim()) {
      setError('Please enter address details');
      return;
    }

    setIsSaving(true);
    setError(null);
    const addressData = {
      address,
      addressDetails,
      receiverName,
      receiverPhone,
      addressType,
      lat: position[0],
      lng: position[1],
      updatedAt: new Date().toISOString()
    };

    try {
      const path = `users/${auth.currentUser.uid}/addresses`;
      if (editData?.id) {
        await updateDoc(doc(db, path, editData.id), addressData);
        onSave({ ...addressData, id: editData.id });
      } else {
        const newDoc = await addDoc(collection(db, path), {
          ...addressData,
          createdAt: new Date().toISOString()
        });
        onSave({ ...addressData, id: newDoc.id });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      // Attempt to parse Firestore error info if it's our JSON format
      try {
        const errJson = JSON.parse(err.message);
        setError(`Failed to save: ${errJson.error}`);
      } catch (e) {
        setError(err.message || 'An error occurred while saving the address');
      }
      // Log for system diagnosis but don't re-throw to avoid crashing UI
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/addresses`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[200] flex flex-col overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Add Address</h1>
      </div>

      {/* Search Bar Overlay */}
      <div className="px-4 py-3 bg-white relative z-[1002]">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-[#007AFF]" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for area, street name..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium shadow-sm focus:outline-none focus:border-gray-300 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[1003] max-h-[60vh] overflow-y-auto no-scrollbar"
            >
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium tracking-wide">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {searchResults.map((result, idx) => {
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);
                    const displayName = result.display_name;
                    const name = result.name || displayName.split(',')[0];
                    const subAddress = displayName.split(',').slice(1).join(',').trim();
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setPosition([lat, lon]);
                          setAddress(parseAddress(result));
                          setSearchQuery('');
                        }}
                        className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex flex-col items-center gap-1 pt-1 min-w-[40px]">
                          <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">
                            {getDistanceDisplay(lat, lon)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{name}</h4>
                          <p className="text-xs text-gray-400 font-medium line-clamp-2 mt-0.5">{subAddress}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400 font-medium">No results found for "{searchQuery}"</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Section */}
      <motion.div 
        animate={{ 
          height: isMapShrunk ? '15vh' : '40vh',
          opacity: isMapShrunk ? 0.6 : 1
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative overflow-hidden shrink-0 bg-[#f8f9fa]"
      >
        <MapContainer 
          center={position} 
          zoom={15} 
          zoomControl={false}
          style={{ height: '100%', width: '100%', backgroundColor: '#f8f9fa' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap'
          />
          <MapHandler 
            onMove={handleMove} 
            onMoveStart={() => setIsUpdatingAddress(true)}
            triggerResize={isMapShrunk} 
            center={position} 
            isLocked={isMapShrunk}
          />
        </MapContainer>

        {/* Fixed Center Pin & Tooltip Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
          {/* Tooltip */}
          <div className="bg-black/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap relative mb-1 shadow-lg">
            Move pin to your exact delivery location
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45"></div>
          </div>
          
          {/* Pin Icon */}
          <div className="flex items-center justify-center -mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#007AFF" stroke="white" strokeWidth="1" className="drop-shadow-xl">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
          </div>
          
          {/* Shadow/Dot at the exact center point */}
          <div className="w-1.5 h-1.5 bg-black/20 rounded-full blur-[1px]"></div>
        </div>

        {/* Use Current Location Button */}
        <button 
          onClick={handleLocateMe}
          disabled={isLocating}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-gray-100 active:scale-95 transition-all whitespace-nowrap disabled:opacity-70"
        >
          <div className="w-3.5 h-3.5 rounded-full border border-[#007AFF] flex items-center justify-center">
            {isLocating ? (
              <div className="w-2 h-2 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full"></div>
            )}
          </div>
          <span className="text-[10px] font-bold text-[#007AFF]">
            {isLocating ? 'Locating...' : 'Use current location'}
          </span>
        </button>
      </motion.div>

      {/* Bottom Sheet Form */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ 
          y: 0,
          flex: 1
        }}
        onScroll={handleScroll}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] z-[1001] flex flex-col overflow-y-auto no-scrollbar"
      >
        {/* Handle */}
        <div className="flex justify-center p-3 sticky top-0 bg-white z-10">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-24 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Delivery details</p>
            <div className="h-[1px] flex-1 bg-gray-100 ml-4" />
          </div>

          {/* Address Display */}
          <div className="flex items-start gap-4 p-4 bg-blue-50/30 border border-blue-100 rounded-2xl">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5 text-[#007AFF] fill-[#007AFF]" />
            </div>
            <div className="flex-1">
              {isUpdatingAddress ? (
                <p className="text-sm font-bold text-gray-800 leading-tight opacity-50">Updating address...</p>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-gray-800 leading-tight">
                    {address.split(', ').slice(0, 2).join(', ')}
                  </p>
                  {address.split(', ').length > 2 && (
                    <p className="text-[11px] font-medium text-gray-500 leading-tight line-clamp-1">
                      {address.split(', ').slice(2).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Address Details Input */}
          <div className="space-y-2">
            <div className="relative">
              <input 
                type="text"
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder="Address details*"
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 text-sm font-medium focus:outline-none focus:border-[#007AFF] transition-colors"
              />
              <span className="absolute left-4 -top-2.5 px-1 bg-white text-[10px] font-bold text-gray-400">Address details*</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium ml-1">E.g. Floor, House no.</p>
          </div>

          {/* Receiver Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Receiver details</p>
              <div className="h-[1px] flex-1 bg-gray-100 ml-4" />
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Receiver Name*"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 pl-12 text-sm font-medium focus:outline-none focus:border-[#007AFF] transition-colors"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <span className="absolute left-4 -top-2.5 px-1 bg-white text-[10px] font-bold text-gray-400">Receiver Name*</span>
              </div>

              <div className="relative">
                <input 
                  type="text"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="Receiver Phone*"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 pl-12 text-sm font-medium focus:outline-none focus:border-[#007AFF] transition-colors"
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <span className="absolute left-4 -top-2.5 px-1 bg-white text-[10px] font-bold text-gray-400">Receiver Phone*</span>
              </div>
            </div>
          </div>

          {/* Save As */}
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Save address as</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setAddressType('home')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  addressType === 'home' 
                    ? 'bg-blue-50 border-[#007AFF] text-[#007AFF]' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-bold">Home</span>
              </button>
              <button 
                onClick={() => setAddressType('work')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  addressType === 'work' 
                    ? 'bg-blue-50 border-[#007AFF] text-[#007AFF]' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-bold">Work</span>
              </button>
              <button 
                onClick={() => setAddressType('other')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  addressType === 'other' 
                    ? 'bg-blue-50 border-[#007AFF] text-[#007AFF]' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-bold">Other</span>
              </button>
            </div>
          </div>

          {/* Door Image */}
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Door/building image (optional)</p>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-[#007AFF]">
                <Camera className="w-5 h-5" />
                <span className="text-sm font-bold">Add an image</span>
              </div>
              <p className="text-xs text-gray-400 text-center px-8">This helps our delivery partners find your exact location faster</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg z-[1003] flex items-center justify-between"
            >
              <span className="text-sm font-bold">{error}</span>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-50 z-[1002]">
          <button 
            onClick={handleSave}
            disabled={isUpdatingAddress || address === 'Loading address...' || isSaving}
            className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:shadow-none disabled:scale-100"
          >
            {isSaving ? 'Saving...' : isUpdatingAddress ? 'Updating location...' : 'Save address'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddAddressForm;
