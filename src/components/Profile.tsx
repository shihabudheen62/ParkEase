import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { 
  EditRounded as Pencil, 
  ChevronRightRounded as ChevronRight, 
  DirectionsCarRounded as Car, 
  CreditCardRounded as CreditCard, 
  SettingsRounded as Settings, 
  HelpOutlineRounded as HelpCircle, 
  LogoutRounded as LogOut,
  FavoriteRounded as Heart,
  AddCircleRounded as PlusCircle,
  LocalParkingRounded as ParkingCircle,
  BookmarkRounded as Bookmark,
  AutorenewRounded as Loader2
} from '@mui/icons-material';
import { doc, updateDoc, arrayRemove, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Slot, Booking } from '../types';
import { toast } from 'sonner';
import { format, isAfter } from 'date-fns';

import SavedItems from './SavedItems';

interface ProfileProps {
  onSelectSlot?: (slot: Slot) => void;
  initialView?: 'main' | 'saved';
}

const Profile: React.FC<ProfileProps> = ({ onSelectSlot, initialView = 'main' }) => {
  const { user, profile, logout } = useAuth();
  const [savedSlots, setSavedSlots] = useState<Slot[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [view, setView] = useState<'main' | 'saved'>(initialView);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      // Fetch Saved Slots
      if (profile?.savedSlotIds && profile.savedSlotIds.length > 0) {
        try {
          const slotsRef = collection(db, 'slots');
          const q = query(slotsRef, where('__name__', 'in', profile.savedSlotIds.slice(0, 10)));
          const snapshot = await getDocs(q);
          const slots = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Slot))
            .filter(slot => slot.status === 'ACTIVE' && slot.isAvailable === true);
          setSavedSlots(slots);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'slots');
        }
      } else {
        setSavedSlots([]);
      }

      // Fetch Recent Bookings
      try {
        setIsLoadingActivities(true);
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef, 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setRecentBookings(bookings);
      } catch (error) {
        console.error("Error fetching recent bookings:", error);
        // We don't use handleFirestoreError here to avoid intrusive popups for background data
      } finally {
        setIsLoadingActivities(false);
      }
    };

    fetchProfileData();
  }, [user, profile?.savedSlotIds]);

  const removeSavedSlot = async (slotId: string) => {
    if (!user) return;
    
    setIsRemoving(slotId);
    const userRef = doc(db, 'users', user.uid);

    try {
      await updateDoc(userRef, {
        savedSlotIds: arrayRemove(slotId)
      });
      toast.success('Removed from saved');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to remove spot');
    } finally {
      setIsRemoving(null);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) { // 500KB limit for base64 storage
      toast.error('Image is too large. Please select an image under 500KB.');
      return;
    }

    setIsUpdatingPhoto(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      const userRef = doc(db, 'users', user.uid);

      try {
        await updateDoc(userRef, {
          photoURL: base64String
        });
        toast.success('Profile photo updated!');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        toast.error('Failed to update photo');
      } finally {
        setIsUpdatingPhoto(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsUpdatingPhoto(false);
    };

    reader.readAsDataURL(file);
  };

  const getAvatarColor = (seed: string) => {
    const colors = [
      'bg-red-500',
      'bg-pink-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-yellow-500',
      'bg-orange-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getInitial = () => {
    const name = profile?.displayName || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  if (view === 'saved') {
    return (
      <SavedItems 
        slots={savedSlots} 
        onBack={() => setView('main')} 
        onSelectSlot={onSelectSlot || (() => {})}
        onRemove={removeSavedSlot}
        isRemoving={isRemoving}
      />
    );
  }

  const menuItems = [
    { icon: Car, label: 'Vehicle Management' },
    { icon: CreditCard, label: 'Payment Methods' },
    { icon: Settings, label: 'Settings' },
    { icon: HelpCircle, label: 'Help Center' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-8 px-6">
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handlePhotoChange}
            className="hidden" 
            accept="image/*"
          />
          <div className={`w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ${profile?.photoURL ? 'bg-gray-100' : getAvatarColor(user?.uid || 'default')}`}>
            {isUpdatingPhoto ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={profile.displayName || 'User'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-4xl font-black text-white tracking-tighter">
                {getInitial()}
              </span>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUpdatingPhoto}
            className="absolute bottom-1 right-1 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center border-2 border-white shadow-md active:scale-90 transition-transform disabled:opacity-50"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        
        <h1 className="mt-4 text-2xl font-extrabold text-[#1A1C1E]">{profile?.displayName || 'User'}</h1>
        <div className="mt-2 bg-[#D3E3FD] px-4 py-1.5 rounded-full flex items-center gap-2">
          <Leaf className="w-3.5 h-3.5 text-[#041E49]" />
          <span className="text-[10px] font-black text-[#041E49] uppercase tracking-widest">
            {profile?.role === 'admin' ? 'Eco-Warrior Admin' : 'Eco-Warrior Gold'}
          </span>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-extrabold text-[#1A1C1E]">Recent Activity</h2>
            {recentBookings.length > 0 && (
              <button className="text-[#007AFF] text-sm font-bold">See All</button>
            )}
          </div>
          
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => {
                const isActive = isAfter(new Date(booking.endTime), new Date());
                return (
                  <div key={booking.id} className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-14 h-14 bg-[#D3E3FD] rounded-2xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[#007AFF] font-black text-2xl">P</span>
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <p className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-0.5">Parking Booking</p>
                        <h4 className="font-extrabold text-[#1A1C1E] text-base truncate pr-2">
                          {booking.slotName}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {format(new Date(booking.startTime), 'MMM dd')} • {format(new Date(booking.startTime), 'hh:mm a')} - {format(new Date(booking.endTime), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-4">
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isActive ? 'bg-blue-50 text-[#007AFF]' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isActive ? 'Active' : 'Paid'}
                      </div>
                      <p className="font-black text-lg text-[#1A1C1E]">
                        ₹{booking.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <ParkingCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-[#1A1C1E] text-sm">No recent activity</h4>
                <p className="text-[10px] text-gray-400 font-medium">Your parking history will appear here</p>
              </div>
            </div>
          )}
        </div>

        {/* Saved Places */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-extrabold text-[#1A1C1E]">Saved Places</h2>
            {savedSlots.length >= 4 && (
              <button 
                onClick={() => setView('saved')}
                className="text-[#007AFF] text-sm font-bold active:scale-95 transition-transform"
              >
                View All
              </button>
            )}
          </div>
          
          {savedSlots.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {savedSlots.map((slot) => (
                <div 
                  key={slot.id} 
                  onClick={() => onSelectSlot?.(slot)}
                  className="flex-shrink-0 w-44 space-y-3 cursor-pointer"
                >
                  <div className="relative h-44 rounded-[32px] overflow-hidden group">
                    <img 
                      src={slot.images[0]} 
                      alt={slot.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedSlot(slot.id);
                      }}
                      disabled={isRemoving === slot.id}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform disabled:opacity-50"
                    >
                      <Heart className={`w-4 h-4 ${isRemoving === slot.id ? 'text-gray-300' : 'text-[#EA4335] fill-[#EA4335]'}`} />
                    </button>
                  </div>
                  <div className="px-1">
                    <h4 className="font-bold text-[#1A1C1E] text-sm truncate">{slot.name}</h4>
                    <p className="text-[10px] text-gray-400 font-medium truncate">{slot.address}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => setView('saved')}
              className="bg-white rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-gray-200 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <Bookmark className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-[#1A1C1E] text-sm">No saved places yet</h4>
                <p className="text-[10px] text-gray-400 font-medium">Explore spots and save them for quick access</p>
              </div>
            </div>
          )}
        </div>

        {/* Account Management */}
        <div className="space-y-4">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Account Management</p>
          <div className="bg-white rounded-[32px] p-2 shadow-sm border border-gray-50">
            {menuItems.map((item, idx) => (
              <button 
                key={item.label} 
                className={`w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors rounded-2xl ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#F8FAFC] rounded-xl flex items-center justify-center text-gray-600">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-[#1A1C1E] text-sm">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={logout}
          className="w-full bg-[#FEF2F2] text-[#EA4335] py-5 rounded-[24px] font-bold text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all mb-8"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
