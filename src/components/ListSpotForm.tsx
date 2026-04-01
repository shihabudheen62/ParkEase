import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageUtils';
import { 
  ArrowLeft, 
  MapPin, 
  Search, 
  Navigation, 
  Home, 
  Trees, 
  Umbrella, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Camera, 
  UploadCloud,
  X,
  DollarSign,
  Edit3,
  Check,
  LocateFixed,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { createPinIcon } from '../constants';
import { useCurrency } from '../CurrencyContext';
import SlotMap from './SlotMap';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ListSpotFormProps {
  onBack: () => void;
  onSave: (data: any) => void;
  onChange?: (hasChanges: boolean) => void;
  initialData?: any;
  isSaving?: boolean;
}

// Map Handler Component
const MapHandler: React.FC<{ 
  position: [number, number]; 
  isAdjusting: boolean; 
  onMove: (lat: number, lng: number) => void;
}> = ({ position, isAdjusting, onMove }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  useMapEvents({
    moveend: () => {
      if (isAdjusting) {
        const center = map.getCenter();
        onMove(center.lat, center.lng);
      }
    }
  });

  return null;
};

const ListSpotForm: React.FC<ListSpotFormProps> = ({ onBack, onSave, onChange, initialData, isSaving }) => {
  const { currencySymbol } = useCurrency();
  const [address, setAddress] = useState(initialData?.address || '');
  const [name, setName] = useState(initialData?.name || '');
  const [spotType, setSpotType] = useState<'indoor' | 'outdoor' | 'covered'>(initialData?.type || 'outdoor');
  const [price, setPrice] = useState<number>(initialData?.price ?? 4.50);
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities || ['24/7 Access']);
  const [rows, setRows] = useState<number>(initialData?.rows || 5);
  const [cols, setCols] = useState<number>(initialData?.cols || 7);
  const [levels, setLevels] = useState<number>(initialData?.levels || 1);
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [position, setPosition] = useState<[number, number]>(initialData?.position || [9.9312, 76.2673]); // Default to Kochi
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSlotMap, setShowSlotMap] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect location for new spots
  useEffect(() => {
    if (!initialData) {
      handleLocateMe();
    }
  }, [initialData]);

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const handleAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    fileList.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const compressed = await compressImage(base64String, 800, 800, 0.6);
          setImages(prev => [...prev, compressed]);
        } catch (error) {
          console.error("Compression failed:", error);
          setImages(prev => [...prev, base64String]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input value so the same file can be uploaded again if removed
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSearch = async () => {
    if (!address) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPosition([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapMove = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        await handleMapMove(latitude, longitude);
        setIsSearching(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsSearching(false);
      }
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a spot name');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter a street address');
      return;
    }
    if (images.length === 0) {
      toast.error('Please add at least one photo');
      return;
    }

    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    onSave({
      ...initialData,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      name: name || 'New Parking Spot',
      address,
      price,
      status: initialData?.status || 'DISABLED',
      images,
      isAvailable: initialData?.isAvailable ?? false,
      type: spotType,
      amenities,
      position,
      rows,
      cols,
      levels
    });
  };

  const hasChanges = useMemo(() => {
    if (!initialData) {
      // For new listings, show if name or address is not empty, or position changed from default
      const defaultPos: [number, number] = [45.523062, -122.676482];
      return name.trim() !== '' || 
             address.trim() !== '' || 
             position[0] !== defaultPos[0] || 
             position[1] !== defaultPos[1] ||
             amenities.length !== 1 || // default is ['24/7 Access']
             price !== 4.50 ||
             rows !== 5 ||
             cols !== 7 ||
             levels !== 1 ||
             images.length > 1; // default is 1 placeholder image
    }

    // For existing listings, compare with initialData
    const initialPos = initialData.position || [0, 0];
    const initialAmenities = [...(initialData.amenities || [])].sort();
    const currentAmenities = [...amenities].sort();
    
    return name !== (initialData.name || '') ||
           address !== (initialData.address || '') ||
           spotType !== (initialData.type || 'outdoor') ||
           price !== (initialData.price || 4.50) ||
           rows !== (initialData.rows || 5) ||
           cols !== (initialData.cols || 7) ||
           levels !== (initialData.levels || 1) ||
           JSON.stringify(initialAmenities) !== JSON.stringify(currentAmenities) ||
           JSON.stringify(images) !== JSON.stringify(initialData.images || []) ||
           position[0] !== initialPos[0] ||
           position[1] !== initialPos[1];
  }, [name, address, spotType, price, amenities, images, position, initialData, rows, cols, levels]);

  useEffect(() => {
    onChange?.(hasChanges);
  }, [hasChanges, onChange]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-48">
        <div className="p-6 space-y-6">
          {/* Header */}
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-[#1A1C1E] active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-[#1A1C1E] tracking-tight">
              {initialData ? 'Edit your spot' : 'List your spot'}
            </h1>
            <p className="text-[#44474E] text-sm font-medium leading-relaxed">
              {initialData 
                ? 'Update your parking space details to keep them accurate.' 
                : 'Earn extra income by sharing your unused parking space with our community.'}
            </p>
          </div>

        {/* Spot Details Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <Edit3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Spot Details</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#44474E] uppercase tracking-widest ml-1">Spot Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oakwood Garden Driveway"
              className="w-full bg-[#E9ECF1] border-none rounded-2xl py-4 px-4 text-sm font-medium focus:ring-2 focus:ring-[#007AFF] transition-all outline-none"
            />
          </div>
        </div>

        {/* Spot Location Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Spot Location</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#44474E] uppercase tracking-widest ml-1">Street Address</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. 123 Green Valley Road"
                className="w-full bg-[#E9ECF1] border-none rounded-2xl py-4 pl-12 pr-14 text-sm font-medium focus:ring-2 focus:ring-[#007AFF] transition-all outline-none"
              />
              <button 
                onClick={handleLocateMe}
                disabled={isSearching}
                title="Use current location"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#007AFF] text-white w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LocateFixed className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="relative h-64 rounded-[28px] overflow-hidden bg-gray-200 border border-gray-100 shadow-inner">
            <MapContainer 
              center={position} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              dragging={isAdjusting}
              scrollWheelZoom={isAdjusting}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <MapHandler position={position} isAdjusting={isAdjusting} onMove={handleMapMove} />
              <Marker position={position} icon={createPinIcon()} />
            </MapContainer>
            
            {/* Overlay for adjustment mode */}
            {isAdjusting && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
                <div className="w-8 h-8 border-2 border-[#007AFF] rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-[#007AFF] rounded-full" />
                </div>
              </div>
            )}

            {/* Adjust Pin Button */}
            <button 
              onClick={() => setIsAdjusting(!isAdjusting)}
              className={`absolute bottom-4 right-4 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-black text-sm active:scale-95 transition-all z-[1001] ${
                isAdjusting 
                  ? 'bg-[#388E3C] text-white' 
                  : 'bg-white text-[#007AFF]'
              }`}
            >
              {isAdjusting ? (
                <><Check className="w-5 h-5" /> Done</>
              ) : (
                <><Navigation className="w-5 h-5 rotate-45" /> Adjust Pin</>
              )}
            </button>
            
            {isAdjusting && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-[1001]">
                Drag map to position pin
              </div>
            )}
          </div>
        </div>

        {/* Parking Layout Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Parking Layout</h2>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-medium ml-1 mb-4">
              Define the capacity and structure of your parking facility.
            </p>
            
            {/* Grid Configuration */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Levels</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  value={levels}
                  onChange={(e) => setLevels(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#E9ECF1] border-none rounded-xl py-3 px-3 text-sm font-bold text-[#1A1C1E] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Rows</label>
                <input 
                  type="number" 
                  min="1"
                  max="20"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#E9ECF1] border-none rounded-xl py-3 px-3 text-sm font-bold text-[#1A1C1E] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cols</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#E9ECF1] border-none rounded-xl py-3 px-3 text-sm font-bold text-[#1A1C1E] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Spot Type Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <Home className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Spot Type</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'indoor', label: 'Indoor', icon: Home },
              { id: 'outdoor', label: 'Outdoor', icon: Trees },
              { id: 'covered', label: 'Covered', icon: Umbrella },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setSpotType(type.id as any)}
                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-[24px] transition-all duration-300 ${
                  spotType === type.id 
                    ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-100' 
                    : 'bg-[#F0F4F9] text-[#1A1C1E] hover:bg-[#E2E8F0]'
                }`}
              >
                <type.icon className={`w-8 h-8 ${spotType === type.id ? 'text-white' : 'text-[#1A1C1E]'}`} />
                <span className="font-bold text-sm tracking-wide">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Pricing</h2>
          </div>

          <div className="bg-[#F0F4F9] p-8 rounded-[32px] space-y-6">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-400">{currencySymbol}</span>
                <input 
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-32 text-4xl font-black text-[#007AFF] bg-transparent border-b-2 border-blue-200 focus:border-[#007AFF] outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xl font-bold text-gray-400">/hr</span>
              </div>
              <p className="text-xs font-bold text-[#44474E] mt-2">
                Recommended price for this area: <span className="text-[#007AFF]">{currencySymbol}3.50 - {currencySymbol}5.00</span>
              </p>
            </div>

            <div className="px-4">
              <input 
                type="range" 
                min="1" 
                max="5000" 
                step="0.5"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
              />
            </div>
          </div>
        </div>

        {/* Amenities Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Amenities</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { id: 'ev', label: 'EV Charging', icon: Zap },
              { id: 'security', label: 'Security', icon: ShieldCheck },
              { id: 'access', label: '24/7 Access', icon: Clock },
              { id: 'cctv', label: 'CCTV', icon: Camera },
            ].map((amenity) => {
              const isSelected = amenities.includes(amenity.label);
              return (
                <button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.label)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 ${
                    isSelected 
                      ? 'bg-blue-100 border-blue-200 text-[#007AFF]' 
                      : 'bg-white border-gray-100 text-[#44474E]'
                  }`}
                >
                  <amenity.icon className={`w-4 h-4 ${isSelected ? 'text-[#007AFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold">{amenity.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photos Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
              <Camera className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1C1E]">Photos</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={handleAddPhotoClick}
              className="aspect-square rounded-[24px] border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center gap-2 text-[#007AFF] active:scale-95 transition-transform"
            >
              <UploadCloud className="w-8 h-8 opacity-60" />
              <span className="text-xs font-bold">Add Photo</span>
            </button>
            {images.map((img, index) => (
              <div key={index} className="aspect-square rounded-[24px] overflow-hidden relative group">
                <img 
                  src={img} 
                  alt={`Preview ${index}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-[11px] italic text-[#44474E] font-medium leading-relaxed">
            Tip: Clear photos showing the entrance and surroundings get 40% more bookings.
          </p>
        </div>

        </div>
      </div>

      {/* Fixed Submit Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 z-[2000] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"
          >
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-[#007AFF] text-white py-5 rounded-full font-black text-lg shadow-xl shadow-blue-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                initialData ? 'Save Changes' : 'Publish My Listing'
              )}
            </button>
            <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              By {initialData ? 'saving' : 'publishing'}, you agree to our <span className="text-[#007AFF] underline">host terms</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot Map Modal removed as it's not needed for creation */}
    </div>
  );
};

export default ListSpotForm;
