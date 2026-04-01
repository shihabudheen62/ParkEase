import React, { useState, useEffect } from 'react';
import { 
  ExpandMoreRounded as ChevronDown, 
  LocationOnRounded as MapPin, 
  SearchRounded as Search, 
  AddRounded as Plus, 
  NavigationRounded as Navigation, 
  HomeRounded as HomeIcon, 
  MoreHorizRounded as MoreHorizontal, 
  ShareRounded as Share2, 
  CloseRounded as X, 
  DeleteRounded as Trash2, 
  EditRounded as Edit2, 
  WorkRounded as Briefcase 
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AddAddressForm from './AddAddressForm';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useLocation } from '../LocationContext';

interface LocationSelectorProps {
  currentAddress: string;
  currentAddressType: string;
  onAddressSelect: (address: string, type?: string, lat?: number, lng?: number) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ currentAddress, currentAddressType, onAddressSelect }) => {
  const { userLocation } = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editAddressData, setEditAddressData] = useState<any>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const getDistanceDisplay = (addrLat?: number, addrLng?: number) => {
    if (!userLocation || addrLat === undefined || addrLng === undefined) return '...';
    const dist = calculateDistance(userLocation[0], userLocation[1], addrLat, addrLng);
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    }
    return `${dist.toFixed(1)} km`;
  };

  useEffect(() => {
    if (!auth.currentUser || !isSheetOpen) return;
    
    const path = `users/${auth.currentUser.uid}/addresses`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addrList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddresses(addrList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    
    return () => unsubscribe();
  }, [isSheetOpen]);

  const handleDelete = async (addressId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const path = `users/${auth.currentUser.uid}/addresses`;
      await deleteDoc(doc(db, path, addressId));
      setActiveMenuId(null);
      setDeleteId(null);
      // After deletion, default back to current location
      detectCurrentLocation(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/addresses/${addressId}`);
    }
  };

  const handleEdit = (e: React.MouseEvent, addr: any) => {
    e.stopPropagation();
    setEditAddressData(addr);
    setIsAddAddressOpen(true);
    setActiveMenuId(null);
  };

  const [isLocating, setIsLocating] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  // Auto-detect location when sheet opens
  React.useEffect(() => {
    if (isSheetOpen && !detectedAddress && !isLocating) {
      detectCurrentLocation();
    }
  }, [isSheetOpen, detectedAddress, isLocating]);

  const detectCurrentLocation = (autoSelect = false) => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          
          let address = data.display_name;
          if (data.address) {
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
              address = uniqueParts.join(', ');
            }
          }
          
          setDetectedAddress(address);
          setIsLocating(false);
          if (autoSelect) {
            onAddressSelect(address, 'Current Location', latitude, longitude);
            setIsSheetOpen(false);
          }
        } catch (error) {
          console.error(error);
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleUseCurrentLocation = () => {
    if (detectedAddress) {
      // We need to re-detect to get fresh coordinates if we want to be exact, 
      // but for now let's just use the detected address. 
      // Actually, it's better to re-detect to ensure we have the latest lat/lng.
      detectCurrentLocation(true);
    } else {
      detectCurrentLocation(true);
    }
  };

  return (
    <>
      {/* Header - Image 1 */}
      <div 
        className="absolute top-4 left-4 right-4 z-20 cursor-pointer"
        onClick={() => setIsSheetOpen(true)}
      >
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100">
            <Navigation className="w-4 h-4 text-[#007AFF] fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-gray-900 tracking-tight drop-shadow-sm leading-none truncate max-w-[220px]">{currentAddress || '2nd line, Palakkad, India'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <span className="text-[10px] text-gray-600 font-bold drop-shadow-sm mt-0.5 leading-none capitalize">{currentAddressType || 'Current Location'}</span>
          </div>
        </div>
      </div>

      {/* Location Sheet - Image 2 */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100]"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setIsSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 bg-[#F8F9FB] rounded-t-[32px] z-[101] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Handle */}
              <div className="flex justify-center p-4 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-6 h-6 text-gray-800" />
                  <h2 className="text-lg font-bold text-gray-800">Select a location</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6 no-scrollbar">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for area, street name..."
                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
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

                {searchQuery ? (
                  /* Search Results List */
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
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
                                onAddressSelect(displayName, 'Location', lat, lon);
                                setIsSheetOpen(false);
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
                  </div>
                ) : (
                  <>
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                      <button 
                        onClick={() => setIsAddAddressOpen(true)}
                        className="w-full flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <Plus className="w-5 h-5 text-[#007AFF]" />
                          <span className="text-sm font-bold text-[#007AFF]">Add address</span>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                      </button>
                      
                      <button 
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className={`w-full flex items-center gap-4 p-4 active:bg-gray-50 disabled:opacity-70 border-b border-gray-50 ${currentAddressType === 'Current Location' ? 'bg-[#007AFF]/5' : ''}`}
                      >
                        <Navigation className={`w-5 h-5 text-[#007AFF] ${isLocating ? 'animate-pulse' : ''}`} />
                        <div className="flex flex-col items-start flex-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-[#007AFF]">
                              {isLocating ? 'Detecting location...' : detectedAddress ? 'Use detected location' : 'Use your current location'}
                            </span>
                            {currentAddressType === 'Current Location' && (
                              <div className="bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Active</div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {detectedAddress || 'Chakkanthara, Palakkad'}
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Saved Addresses */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="h-px bg-gray-200 flex-1" />
                        <span className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved Addresses</span>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>

                      {addresses.length === 0 && !isLocating && (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-400 font-medium">No saved addresses yet</p>
                        </div>
                      )}

                      {addresses.map((addr) => (
                        <div 
                          key={addr.id}
                          onClick={() => {
                            onAddressSelect(addr.address, addr.addressType, addr.lat, addr.lng);
                            setIsSheetOpen(false);
                          }}
                          className={`bg-white rounded-2xl p-4 shadow-sm border ${addr.address === currentAddress ? 'border-[#007AFF] ring-1 ring-[#007AFF]/10' : 'border-gray-50'} flex gap-4 active:scale-[0.98] transition-all cursor-pointer relative`}
                        >
                          <div className="flex flex-col items-center gap-1 pt-1">
                            {addr.addressType === 'home' ? (
                              <HomeIcon className={`w-5 h-5 ${addr.address === currentAddress ? 'text-[#007AFF]' : 'text-gray-600'}`} />
                            ) : addr.addressType === 'work' ? (
                              <Briefcase className={`w-5 h-5 ${addr.address === currentAddress ? 'text-[#007AFF]' : 'text-gray-600'}`} />
                            ) : (
                              <MapPin className={`w-5 h-5 ${addr.address === currentAddress ? 'text-[#007AFF]' : 'text-gray-600'}`} />
                            )}
                            <span className={`text-[10px] font-bold ${addr.address === currentAddress ? 'text-[#007AFF]' : 'text-gray-500'}`}>
                              {getDistanceDisplay(addr.lat, addr.lng)}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h3 className={`text-sm font-bold ${addr.address === currentAddress ? 'text-[#007AFF]' : 'text-gray-800'} capitalize`}>{addr.addressType || 'Other'}</h3>
                              {addr.address === currentAddress && (
                                <div className="bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Active</div>
                              )}
                            </div>
                            <p className={`text-xs ${addr.address === currentAddress ? 'text-gray-700' : 'text-gray-500'} leading-relaxed`}>{addr.address}</p>
                            <p className={`text-[10px] ${addr.address === currentAddress ? 'text-gray-500' : 'text-gray-400'} font-medium`}>Phone number: {addr.receiverPhone}</p>
                            
                            <div className="flex gap-3 pt-2">
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === addr.id ? null : addr.id);
                                  }}
                                  className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center active:bg-gray-100"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-[#007AFF]" />
                                </button>

                                <AnimatePresence>
                                  {activeMenuId === addr.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[100px]"
                                    >
                                      <button 
                                        onClick={(e) => handleEdit(e, addr)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-[#007AFF]" />
                                        Edit
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteId(addr.id);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <button 
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center"
                              >
                                <Share2 className="w-4 h-4 text-[#007AFF]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="fixed inset-0 bg-black/60 z-[2000] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-white rounded-[24px] p-6 z-[2001] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Delete Address?</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    Are you sure you want to remove this address from your saved list?
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    onClick={() => handleDelete(deleteId)}
                    className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-100 active:scale-[0.98] transition-all"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="w-full bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddAddressOpen && (
          <AddAddressForm 
            onBack={() => {
              setIsAddAddressOpen(false);
              setEditAddressData(null);
            }}
            editData={editAddressData}
            onSave={(data) => {
              console.log('Saved address:', data);
              onAddressSelect(data.address, data.addressType, data.lat, data.lng);
              setIsAddAddressOpen(false);
              setEditAddressData(null);
              setIsSheetOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default LocationSelector;
