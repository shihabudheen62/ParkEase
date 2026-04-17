import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Search, 
  MapPin, 
  Navigation as NavIcon, 
  MoreVertical, 
  Clock, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Booking, Slot } from '../types';
import { format, differenceInSeconds, parseISO, isAfter, isBefore } from 'date-fns';

interface BookingsProps {
  setActiveTab: (tab: string) => void;
}

const Bookings: React.FC<BookingsProps> = ({ setActiveTab }) => {
  const [view, setView] = useState<'active' | 'past'>('active');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Update current time every second for the countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch all slots first to have them ready for lookup
    const fetchSlots = async () => {
      try {
        const slotsSnapshot = await getDocs(collection(db, 'slots'));
        const slotsMap: Record<string, Slot> = {};
        slotsSnapshot.forEach(doc => {
          slotsMap[doc.id] = { id: doc.id, ...doc.data() } as Slot;
        });
        setSlots(slotsMap);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'slots');
      }
    };

    fetchSlots();

    // Subscribe to user's bookings
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData: Booking[] = [];
      snapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() } as Booking);
      });
      // Sort by start time descending
      setBookings(bookingsData.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeBookings = useMemo(() => {
    return bookings.filter(b => {
      const end = new Date(b.endTime);
      return b.status === 'CONFIRMED' && isAfter(end, now);
    });
  }, [bookings, now]);

  const pastBookings = useMemo(() => {
    return bookings.filter(b => {
      const end = new Date(b.endTime);
      return b.status === 'CANCELLED' || (b.status === 'CONFIRMED' && isBefore(end, now));
    });
  }, [bookings, now]);

  const formatTimeRemaining = (endTime: string) => {
    const totalSeconds = differenceInSeconds(new Date(endTime), now);
    if (totalSeconds <= 0) return "00:00:00";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map(v => v < 10 ? "0" + v : v)
      .join(":");
  };

  const getProgress = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const total = differenceInSeconds(end, start);
    const elapsed = differenceInSeconds(now, start);
    
    if (elapsed <= 0) return 0;
    return Math.min(100, (elapsed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto no-scrollbar pb-24">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="relative"
          >
            <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-[#007AFF] opacity-20" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-[#007AFF]" />
            </div>
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#1A1C1E]">Empty</h3>
            <p className="text-sm text-gray-500 max-w-[240px] mx-auto">
              You don't have any active or past bookings yet. Start exploring to find the perfect spot!
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="bg-[#007AFF] text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100"
            onClick={() => setActiveTab('explore')}
          >
            Explore Nearby
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto no-scrollbar pb-24">
      {/* View Toggle */}
      <div className="px-6 pt-8 pb-4">
        <div className="bg-gray-100 p-1 rounded-2xl flex">
          <button
            onClick={() => setView('active')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              view === 'active' ? 'bg-white text-[#1A1C1E] shadow-sm' : 'text-gray-500'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setView('past')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              view === 'past' ? 'bg-white text-[#1A1C1E] shadow-sm' : 'text-gray-500'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {view === 'active' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#1A1C1E]">Active Booking</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#007AFF] rounded-full">
                <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Live</span>
              </div>
            </div>

            {activeBookings.length > 0 ? (
              activeBookings.map(booking => {
                const slot = slots[booking.slotId];
                if (!slot) return null;

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-[#007AFF] rounded-[32px] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden"
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    
                    <div className="relative flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black leading-tight">{slot.name}</h3>
                        <div className="flex items-center gap-1.5 text-blue-100 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{slot.address}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center min-w-[80px]">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Slot</p>
                        <p className="text-lg font-black">{booking.slotNumber}</p>
                      </div>
                    </div>

                    <div className="relative space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Time Remaining</p>
                          <p className="text-5xl font-black tracking-tighter">
                            {formatTimeRemaining(booking.endTime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold opacity-60">Started at {format(new Date(booking.startTime), 'hh:mm a')}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgress(booking.startTime, booking.endTime)}%` }}
                            className="h-full bg-white rounded-full"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${slot.lat},${slot.lng}`;
                            window.open(url, '_blank');
                          }}
                          className="flex-1 bg-white text-[#007AFF] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                          <MapPin className="w-5 h-5 fill-current" />
                          <span>Navigate</span>
                        </button>
                        <button className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 active:scale-[0.98] transition-transform">
                          <MoreVertical className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">No active bookings at the moment</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#1A1C1E]">Booking History</h2>
              <button className="text-xs font-bold text-[#007AFF]">View All</button>
            </div>

            <div className="space-y-4">
              {pastBookings.length > 0 ? (
                pastBookings.map(booking => {
                  const slot = slots[booking.slotId];
                  if (!slot) return null;

                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="bg-white p-4 rounded-[28px] border border-gray-100 flex items-center gap-4 shadow-sm"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                        <img 
                          src={slot.images?.[0] || `https://picsum.photos/seed/${slot.id}/200/200`} 
                          alt={slot.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-[#1A1C1E] truncate pr-2">{slot.name}</h4>
                          <span className="font-black text-[#1A1C1E] text-sm">
                            ${booking.totalPrice?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mb-3">
                          {format(new Date(booking.startTime), 'MMM dd, yyyy')} • {
                            (() => {
                              const diff = differenceInSeconds(new Date(booking.endTime), new Date(booking.startTime));
                              const h = Math.floor(diff / 3600);
                              const m = Math.floor((diff % 3600) / 60);
                              return `${h > 0 ? h + 'h ' : ''}${m}m`;
                            })()
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            booking.status === 'CANCELLED' 
                              ? 'bg-red-50 text-red-500' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {booking.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                          </span>
                          {booking.status === 'CONFIRMED' && (
                            <button className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-[#007AFF] rounded-lg text-[9px] font-black uppercase tracking-wider">
                              <FileText className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center"
                  >
                    <Clock className="w-10 h-10 text-gray-300" />
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[#1A1C1E]">No History</h3>
                    <p className="text-sm text-gray-400 font-medium max-w-[200px]">
                      Your past bookings will appear here once they are completed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
