import React, { useState } from 'react';
import { 
  ChevronLeftRounded as ChevronLeft, 
  ShareRounded as Share2, 
  FavoriteRounded as Heart, 
  LocationOnRounded as MapPin, 
  VerifiedUserRounded as ShieldCheck, 
  VideocamRounded as Video, 
  ElectricBoltRounded as Zap, 
  UmbrellaRounded as Umbrella, 
  AutorenewRounded as RefreshCcw, 
  ChatRounded as MessageSquare,
  StarRounded as Star,
  ChevronRightRounded as ChevronRight
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Slot } from '../types';
import { createPinIcon } from '../constants';
import { useAuth } from '../AuthContext';
import { useCurrency } from '../CurrencyContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';

interface SlotDetailsProps {
  slot: Slot;
  onBack: () => void;
  onBookNow: () => void;
}

const SlotDetails: React.FC<SlotDetailsProps> = ({ slot, onBack, onBookNow }) => {
  const { user, profile } = useAuth();
  const { currencySymbol } = useCurrency();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const isSaved = profile?.savedSlotIds?.includes(slot.id) || false;

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to save spots');
      return;
    }

    setIsSaving(true);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isSaved) {
        await updateDoc(userRef, {
          savedSlotIds: arrayRemove(slot.id)
        });
        toast.success('Removed from saved');
      } else {
        await updateDoc(userRef, {
          savedSlotIds: arrayUnion(slot.id)
        });
        toast.success('Saved to your profile');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to update saved spots');
    } finally {
      setIsSaving(false);
    }
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % slot.images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + slot.images.length) % slot.images.length);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
      <div className="max-w-2xl mx-auto w-full flex flex-col min-h-full relative">
        {/* Header Image Section - Fixed height for visibility */}
        <div className="relative h-96 w-full bg-gray-200 overflow-hidden isolate flex-shrink-0 pb-12">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={currentImageIndex}
            src={slot.images[currentImageIndex]}
            alt={`${slot.name} ${currentImageIndex + 1}`}
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -200 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full object-cover absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
            referrerPolicy="no-referrer"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              const threshold = 50;
              if (info.offset.x < -threshold) {
                nextImage();
              } else if (info.offset.x > threshold) {
                prevImage();
              }
            }}
          />
        </AnimatePresence>

        <div className="absolute top-10 left-0 right-0 px-6 flex justify-between items-center z-30">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex gap-3">
            <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
              <Share2 className="w-5 h-5 text-gray-900" />
            </button>
            <button 
              onClick={toggleSave}
              disabled={isSaving}
              className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-900'}`} />
            </button>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2 z-30 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
          {slot.images.map((_, index) => (
            <button 
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
              className="relative h-1.5 flex items-center"
            >
              <motion.div 
                animate={{
                  width: index === currentImageIndex ? 20 : 6,
                  backgroundColor: index === currentImageIndex ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)"
                }}
                className="h-full rounded-full"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Content Section - Overlapping Hero */}
      <div className="relative -mt-8 bg-white rounded-t-[40px] p-6 space-y-6 z-20">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight pr-4">
              {slot.name}
            </h1>
            {slot.isVerified && (
              <div className="bg-[#F0F7FF] text-[#007AFF] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3" /> VERIFIED
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <MapPin className="w-4 h-4 text-[#007AFF]" />
            <span>{slot.address}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[#007AFF]">₹{slot.price.toFixed(2)}</span>
          <span className="text-gray-400 text-sm">/ hour</span>
        </div>

        {/* Location Mini Map */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Location</h2>
          <div className="h-48 w-full rounded-2xl overflow-hidden relative border border-gray-100">
            <MapContainer 
              center={[slot.lat, slot.lng]} 
              zoom={15} 
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
              dragging={false}
              touchZoom={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={[slot.lat, slot.lng]} icon={createPinIcon()} />
            </MapContainer>
            <div className="absolute bottom-3 right-3 z-[1000]">
              <button className="bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-[#007AFF] flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Open in Maps
              </button>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Amenities</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-700">CCTV Secured</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-700">EV Charging</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
                <Umbrella className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Covered</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
                <RefreshCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-700">24/7 Access</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">User Reviews</h2>
            <button className="text-[#007AFF] text-sm font-semibold">See all</button>
          </div>
          <div className="bg-[#F8FAFC] p-5 rounded-3xl space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-gray-900">4.8</span>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                  ))}
                </div>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div className="flex-1 italic text-gray-500 text-xs leading-relaxed">
                "The spot was super easy to find and the charging station worked perfectly. Very secure feeling!"
                <div className="mt-2 font-bold text-gray-900 not-italic">— Sarah J.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Host Info */}
        <div className="bg-white border border-gray-100 p-4 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus" 
                alt="Host" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Hosted by Marcus</h4>
              <p className="text-[10px] text-gray-400">Pro Host • 482 Bookings</p>
            </div>
          </div>
          <button className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Footer Booking */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-50 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-[1100]">
          <button 
            onClick={onBookNow}
            className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-full shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Book Now (₹{slot.price.toFixed(2)}/hr) <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlotDetails;
