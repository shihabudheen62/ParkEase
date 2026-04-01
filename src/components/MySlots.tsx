import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit3, 
  MapPin, 
  Star, 
  TrendingUp, 
  CheckCircle2,
  DollarSign,
  LayoutGrid,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Slot } from '../types';
import { toast } from 'sonner';
import { useCurrency } from '../CurrencyContext';
import ListSpotForm from './ListSpotForm';

const PhotoSlider: React.FC<{ images: string[] }> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative h-full w-full group overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 pointer-events-none" />
          
          {/* Navigation Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Arrows (Visible on hover) */}
          <button 
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

interface MySlotsProps {
  onFormToggle?: (isOpen: boolean) => void;
}

const MySlots: React.FC<MySlotsProps> = ({ onFormToggle }) => {
  const { user } = useAuth();
  const { currencySymbol } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    onFormToggle?.(showForm && hasChanges);
  }, [showForm, hasChanges, onFormToggle]);

  const [editingSpot, setEditingSpot] = useState<Slot | null>(null);
  const [listedSpots, setListedSpots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const avgRating = useMemo(() => {
    if (listedSpots.length === 0) return 0;
    const totalRating = listedSpots.reduce((acc, spot) => acc + (spot.rating || 0), 0);
    return (totalRating / listedSpots.length).toFixed(1);
  }, [listedSpots]);

  useEffect(() => {
    if (!user || listedSpots.length === 0) {
      setMonthlyRevenue(0);
      return;
    }

    const slotIds = listedSpots.map(s => s.id);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Query bookings for the current month
    // We query by ownerUid if available, or just fetch and filter
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'CONFIRMED'),
      where('createdAt', '>=', startOfMonth.toISOString())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let revenue = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check if the booking belongs to one of the user's slots
        if (data.ownerUid === user.uid || slotIds.includes(data.slotId)) {
          revenue += data.totalPrice || 0;
        }
      });
      setMonthlyRevenue(revenue);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [user, listedSpots]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'slots'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const spotsData: any[] = [];
      snapshot.forEach((doc) => {
        spotsData.push({ id: doc.id, ...doc.data() });
      });
      setListedSpots(spotsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'slots');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleAvailable = async (id: string) => {
    const spot = listedSpots.find(s => s.id === id);
    if (!spot) return;

    const spotRef = doc(db, 'slots', id);
    try {
      await updateDoc(spotRef, { isAvailable: !spot.isAvailable });
      toast.success(`Spot marked as ${!spot.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `slots/${id}`);
      toast.error('Failed to update availability');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const spot = listedSpots.find(s => s.id === id);
    if (!spot) return;

    const newStatus = spot.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const spotRef = doc(db, 'slots', id);
    try {
      await updateDoc(spotRef, { status: newStatus });
      toast.success(`Spot status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `slots/${id}`);
      toast.error('Failed to update status');
    }
  };

  const handleEdit = (spot: any) => {
    setEditingSpot(spot);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingSpot(null);
    setShowForm(true);
  };

  const handleSaveSpot = async (data: any) => {
    if (!user) return;

    setIsSaving(true);
    const slotId = data.id || Math.random().toString(36).substr(2, 9);
    const spotRef = doc(db, 'slots', slotId);

    const slotData = {
      id: slotId,
      name: data.name,
      address: data.address,
      price: Number(data.price),
      status: data.status,
      images: data.images,
      isAvailable: data.isAvailable,
      type: data.type,
      amenities: data.amenities,
      position: data.position,
      rows: data.rows,
      cols: data.cols,
      levels: data.levels,
      ownerUid: user.uid,
      lat: data.position[0],
      lng: data.position[1],
      rating: data.rating ?? 5.0,
      reviews: data.reviews ?? 0,
      createdAt: data.createdAt || new Date().toISOString(),
      isVerified: data.isVerified ?? false,
    };

    try {
      await setDoc(spotRef, slotData, { merge: true });
      toast.success(editingSpot ? 'Spot updated successfully' : 'Spot listed successfully');
      setShowForm(false);
      setEditingSpot(null);
    } catch (error) {
      console.error("Error saving spot:", error);
      toast.error('Failed to save spot. Please check your connection or permissions.');
      try {
        handleFirestoreError(error, OperationType.WRITE, `slots/${slotId}`);
      } catch (e) {
        // handleFirestoreError throws, which is expected for the agent
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full w-full relative">
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto no-scrollbar pb-24"
          >
            <div className="p-6 space-y-8">
              {/* Header */}
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold text-[#1A1C1E] tracking-tight">My Listed Spots</h1>
                <p className="text-[#44474E] text-sm font-medium leading-relaxed">
                  Manage your available parking spaces and earnings.
                </p>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-1 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-200 flex justify-between items-center relative overflow-hidden"
                >
                  <div className="space-y-2 relative z-10">
                    <p className="text-[13px] font-bold text-[#44474E] uppercase tracking-wider">Active Spots</p>
                    <p className="text-4xl font-extrabold text-[#007AFF]">
                      {listedSpots.filter(s => s.status === 'ACTIVE').length.toString().padStart(2, '0')}
                    </p>
                  </div>
                  <CheckCircle2 className="w-20 h-20 text-gray-50 absolute -right-4 -bottom-4 rotate-12" />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#D3E3FD] p-6 rounded-[24px] shadow-sm flex justify-between items-center relative overflow-hidden"
                >
                  <div className="space-y-2 relative z-10">
                    <p className="text-[13px] font-bold text-[#041E49] uppercase tracking-wider">Monthly Revenue</p>
                    <p className="text-4xl font-extrabold text-[#041E49]">{currencySymbol}{monthlyRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-20 h-20 text-[#041E49]/5 absolute -right-4 -bottom-4 rotate-12" />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-200 flex justify-between items-center relative overflow-hidden"
                >
                  <div className="space-y-2 relative z-10">
                    <p className="text-[13px] font-bold text-[#44474E] uppercase tracking-wider">Avg. Rating</p>
                    <div className="flex items-center gap-2">
                      <p className="text-4xl font-extrabold text-[#1A1C1E]">{avgRating}</p>
                      <Star className="w-6 h-6 text-[#007AFF] fill-[#007AFF]" />
                    </div>
                  </div>
                  <Star className="w-20 h-20 text-gray-50 absolute -right-4 -bottom-4 rotate-12" />
                </motion.div>
              </div>

              {/* Spots List */}
              <div className="space-y-4">
                {listedSpots.map((spot, index) => (
                  <motion.div 
                    key={spot.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-gray-200"
                  >
                    <div className="relative h-48">
                      <PhotoSlider images={spot.images} />
                      <button 
                        onClick={() => handleToggleStatus(spot.id)}
                        className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm active:scale-95 transition-transform z-10"
                      >
                        <div className={`w-2 h-2 rounded-full ${spot.status === 'ACTIVE' ? 'bg-[#007AFF] animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-[10px] font-black text-[#1A1C1E] tracking-widest uppercase">{spot.status}</span>
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="text-xl font-extrabold text-[#1A1C1E] leading-tight">{spot.name}</h3>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <MapPin className="w-4 h-4 text-[#007AFF]" />
                            <span className="text-xs font-medium">{spot.address}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-[#007AFF] tracking-tight">{currencySymbol}{spot.price.toFixed(2)}</p>
                          <p className="text-[9px] font-bold text-[#44474E] uppercase tracking-widest">per hour</p>
                        </div>
                      </div>

                      <div className="h-px bg-gray-50 w-full" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#1A1C1E]">Available now</span>
                          <button 
                            onClick={() => handleToggleAvailable(spot.id)}
                            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${spot.isAvailable ? 'bg-[#007AFF]' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${spot.isAvailable ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleEdit(spot)}
                          className="bg-[#F0F4F9] text-[#1A1C1E] px-6 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm active:scale-95 transition-transform"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating Action Button */}
            <button 
              onClick={handleAdd}
              className="fixed right-6 bottom-24 w-14 h-14 bg-[#007AFF] text-white rounded-full shadow-xl shadow-blue-200 flex items-center justify-center active:scale-90 transition-transform z-40"
            >
              <Plus className="w-7 h-7 stroke-[3]" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-full w-full"
          >
            <ListSpotForm 
              onBack={() => setShowForm(false)} 
              onSave={handleSaveSpot}
              onChange={setHasChanges}
              initialData={editingSpot}
              isSaving={isSaving}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MySlots;
