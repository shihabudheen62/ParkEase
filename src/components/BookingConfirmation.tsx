import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Navigation, 
  Share2, 
  HelpCircle, 
  CreditCard,
  Star,
  MapPin,
  Calendar,
  Clock,
  X,
  Maximize2,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Slot, Booking } from '../types';
import { toast } from 'sonner';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import DateTimeModal from './DateTimeModal';
import SlotMap from './SlotMap';
import CheckoutForm from './CheckoutForm';

// Initialize Stripe outside component to avoid re-initialization
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface BookingConfirmationProps {
  slot: Slot;
  onBack: () => void;
  onSuccess?: () => void;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ slot, onBack, onSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'entry' | 'exit'>('entry');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isMockPayment, setIsMockPayment] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // State for selected slot number
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<string | null>(null);
  
  // Initialize dates
  const now = new Date();
  const defaultExit = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12 hours
  
  const [entryDate, setEntryDate] = useState(now);
  const [exitDate, setExitDate] = useState(defaultExit);

  // Fetch bookings for this slot
  useEffect(() => {
    if (!slot.id) return;

    const q = query(
      collection(db, 'bookings'),
      where('slotId', '==', slot.id),
      where('status', '==', 'CONFIRMED')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(fetchedBookings);
    }, (error) => {
      console.error("Error fetching bookings:", error);
    });

    return () => unsubscribe();
  }, [slot.id]);

  // Determine occupied slots based on selected time range
  const occupiedSlots = useMemo(() => {
    return bookings
      .filter(booking => {
        const bStart = new Date(booking.startTime).getTime();
        const bEnd = new Date(booking.endTime).getTime();
        const eStart = entryDate.getTime();
        const eEnd = exitDate.getTime();

        // Check for overlap
        return (eStart < bEnd && eEnd > bStart);
      })
      .map(booking => booking.slotNumber);
  }, [bookings, entryDate, exitDate]);

  // Automatically select the first available slot
  useEffect(() => {
    const rows = slot.rows || 5;
    const cols = slot.cols || 7;
    const levels = slot.levels || 1;
    
    const allSlots: string[] = [];
    // We generate in the same order as the UI (Levels 1..N, Rows A..Z, Cols 1..N)
    for (let l = 1; l <= levels; l++) {
      for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 1; c <= cols; c++) {
          const slotId = levels > 1 ? `L${l}-${rowLabel}${c}` : `${rowLabel}${c}`;
          allSlots.push(slotId);
        }
      }
    }

    const firstAvailable = allSlots.find(s => !occupiedSlots.includes(s));
    
    // If no slot is selected, or the current one is occupied, pick the first available
    if (!selectedSlotNumber || occupiedSlots.includes(selectedSlotNumber)) {
      if (firstAvailable) {
        setSelectedSlotNumber(firstAvailable);
      }
    }
  }, [occupiedSlots, slot.rows, slot.cols, slot.levels]);
  
  const images = slot.images && slot.images.length > 0 
    ? slot.images 
    : ['https://picsum.photos/seed/parking/800/600'];

  // Calculate duration and pricing
  const diffMs = exitDate.getTime() - entryDate.getTime();
  const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  
  // Pricing logic: 
  // Daily cap of 12 hours worth of price (common in parking)
  const dailyRate = slot.price * 12; 
  const baseRate = totalDays > 0 
    ? (totalDays * dailyRate) + Math.min(remainingHours * slot.price, dailyRate)
    : Math.min(totalHours * slot.price, dailyRate);

  const processingFee = 45.00; // In Rupees
  const tax = baseRate * 0.18; // 18% GST
  const total = baseRate + processingFee + tax;

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      hour12: true 
    };
    if (date.getMinutes() !== 0) {
      options.minute = '2-digit';
    }
    
    return {
      time: date.toLocaleTimeString('en-US', options),
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  };

  const handleApplyChanges = (newEntry: Date, newExit: Date) => {
    setEntryDate(newEntry);
    setExitDate(newExit);
    setIsModalOpen(false);
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${slot.lat},${slot.lng}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: `Parking at ${slot.name}`,
      text: `I just booked a parking spot at ${slot.name} (${slot.address}). Check it out!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const openModal = (mode: 'entry' | 'exit') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      const bookingData = {
        userId: auth.currentUser?.uid,
        slotId: slot.id,
        ownerUid: slot.ownerUid,
        slotNumber: selectedSlotNumber,
        slotName: slot.name,
        slotAddress: slot.address,
        slotImage: images[0],
        startTime: entryDate.toISOString(),
        endTime: exitDate.toISOString(),
        status: 'CONFIRMED',
        totalPrice: total,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      toast.success('Booking confirmed successfully!');
      setIsStripeModalOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Payment succeeded but booking record failed. Please contact support.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!auth.currentUser) {
      toast.error('Please sign in to book a spot');
      return;
    }

    if (!selectedSlotNumber) {
      toast.error('Please select a slot from the map');
      setIsMapModalOpen(true);
      return;
    }

    setIsInitializingPayment(true);
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, currency: 'inr' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const { clientSecret, isMock } = await response.json();
      setClientSecret(clientSecret);
      setIsMockPayment(!!isMock);
      setIsStripeModalOpen(true);
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setIsInitializingPayment(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <DateTimeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entryDate={entryDate}
        exitDate={exitDate}
        onApply={handleApplyChanges}
        pricePerHour={slot.price}
        initialMode={modalMode}
      />
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-gray-900 tracking-tight">Confirm Booking</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="max-w-2xl mx-auto w-full p-6 space-y-8">
          {/* Booking Summary Card */}
          <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                <img 
                  src={images[0]} 
                  alt={slot.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {slot.type}
                  </span>
                  {slot.isVerified && (
                    <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Verified
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{slot.name}</h2>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="line-clamp-1">{slot.address}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Selected Slot Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Slot</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSlotNumber || 'Not selected'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMapModalOpen(true)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                {selectedSlotNumber ? 'Change' : 'Select Slot'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleNavigate}
              className="flex items-center gap-3 p-4 bg-[#F0F7FF] rounded-2xl active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center text-white">
                <MapPin className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xs font-bold text-gray-700">Navigate</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-3 p-4 bg-[#F0F7FF] rounded-2xl active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center text-white">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-700">Share Spot</span>
            </button>
          </div>

        {/* Duration & Entry */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Duration & Entry</h3>
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => openModal('entry')}
              className="relative bg-[#F8FAFC] p-4 rounded-2xl border border-gray-200 space-y-1 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase">Entry Time</p>
              <p className="text-lg font-black text-gray-900">{formatDateTime(entryDate).time}</p>
              <p className="text-[10px] font-semibold text-gray-400">{formatDateTime(entryDate).date}</p>
            </div>
            <div 
              onClick={() => openModal('exit')}
              className="relative bg-[#F8FAFC] p-4 rounded-2xl border border-gray-200 space-y-1 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase">Exit Time</p>
              <p className="text-lg font-black text-gray-900">{formatDateTime(exitDate).time}</p>
              <p className="text-[10px] font-semibold text-gray-400">{formatDateTime(exitDate).date}</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Payment Method</h3>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gray-50 rounded flex items-center justify-center border border-gray-100">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                  alt="Visa" 
                  className="h-3 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">•••• 4242</p>
                <p className="text-[10px] text-gray-400 font-medium">Personal Card</p>
              </div>
            </div>
            <button className="text-[#007AFF] text-xs font-bold">Change</button>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-[#F1F5F9] p-6 rounded-3xl space-y-4">
          <h3 className="font-bold text-gray-900">Price Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">
                Base Rate ({totalDays > 0 ? `${totalDays}d ` : ''}{remainingHours.toFixed(1)}h)
              </span>
              <span className="text-gray-900 font-bold">₹{baseRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Processing Fee</span>
              <span className="text-gray-900 font-bold">₹{processingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">GST (18%)</span>
              <span className="text-gray-900 font-bold">₹{tax.toFixed(2)}</span>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-[#007AFF]">₹{total.toFixed(2)}</span>
          </div>
        </div>

        </div>
      </div>

      {/* Fixed Confirm Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-50 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-[100]">
        <button 
          onClick={handleConfirmBooking}
          disabled={isInitializingPayment}
          className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-full shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {isInitializingPayment ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Initializing Payment...</span>
            </>
          ) : (
            'Confirm & Reserve Spot'
          )}
        </button>
      </div>

      {/* Stripe Payment Modal */}
      <AnimatePresence>
        {isStripeModalOpen && clientSecret && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStripeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="mb-6">
                <h3 className="text-xl font-black text-gray-900">Complete Payment</h3>
                <p className="text-sm text-gray-500 font-medium">Securely pay for your parking spot</p>
              </div>

              <Elements stripe={stripePromise} options={isMockPayment ? undefined : { clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm 
                  amount={total} 
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setIsStripeModalOpen(false)}
                  isMock={isMockPayment}
                />
              </Elements>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slot Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMapModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full h-[90vh] mt-auto bg-white rounded-t-[40px] overflow-hidden shadow-2xl"
            >
              <SlotMap 
                selectedSlot={selectedSlotNumber}
                onSelect={(id) => setSelectedSlotNumber(id)}
                onClose={() => setIsMapModalOpen(false)}
                rows={slot.rows}
                cols={slot.cols}
                levels={slot.levels}
                occupiedSlots={occupiedSlots}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingConfirmation;
