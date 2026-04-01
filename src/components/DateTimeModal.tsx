import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloseRounded as X, 
  ChevronLeftRounded as ChevronLeft, 
  ChevronRightRounded as ChevronRight, 
  AccessTimeRounded as Clock, 
  LoginRounded as LogIn, 
  LogoutRounded as LogOut, 
  EditRounded as Edit2 
} from '@mui/icons-material';

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryDate: Date;
  exitDate: Date;
  onApply: (entry: Date, exit: Date) => void;
  pricePerHour: number;
  initialMode?: 'entry' | 'exit';
}

const DateTimeModal: React.FC<DateTimeModalProps> = ({ 
  isOpen, 
  onClose, 
  entryDate: initialEntry, 
  exitDate: initialExit, 
  onApply,
  pricePerHour,
  initialMode = 'entry'
}) => {
  const [viewDate, setViewDate] = useState(new Date(initialEntry));
  const [tempEntry, setTempEntry] = useState(new Date(initialEntry));
  const [tempExit, setTempExit] = useState(new Date(initialExit));
  const [activeTimeSelector, setActiveTimeSelector] = useState<'entry' | 'exit'>(initialMode);

  // Sync active selector when initialMode changes (e.g. when opening from different buttons)
  React.useEffect(() => {
    if (isOpen) {
      setActiveTimeSelector(initialMode);
    }
  }, [isOpen, initialMode]);

  // Calendar logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const days = [];
    // Previous month padding
    const prevMonthDays = daysInMonth(year, month - 1);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year, isPadding: true });
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, month, year, isPadding: false });
    }
    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const isSelected = (day: number, month: number, year: number) => {
    const d = new Date(year, month, day);
    return d.toDateString() === tempEntry.toDateString() || d.toDateString() === tempExit.toDateString();
  };

  const isInRange = (day: number, month: number, year: number) => {
    const d = new Date(year, month, day);
    return d > tempEntry && d < tempExit;
  };

  const handleDateClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);
    
    if (activeTimeSelector === 'entry') {
      clickedDate.setHours(tempEntry.getHours(), tempEntry.getMinutes());
      setTempEntry(clickedDate);
      if (tempExit <= clickedDate) {
        setTempExit(new Date(clickedDate.getTime() + 12 * 60 * 60 * 1000));
      }
    } else {
      clickedDate.setHours(tempExit.getHours(), tempExit.getMinutes());
      if (clickedDate > tempEntry) {
        setTempExit(clickedDate);
      } else {
        // If user selects exit before entry, maybe switch to entry? 
        // For now just reset entry to 12h before
        setTempExit(clickedDate);
        setTempEntry(new Date(clickedDate.getTime() - 12 * 60 * 60 * 1000));
      }
    }
  };

  // Duration calculation
  const diffMs = tempExit.getTime() - tempEntry.getTime();
  const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  const d = Math.floor(totalHours / 24);
  const h = Math.floor(totalHours % 24);

  // Pricing
  const dailyRate = pricePerHour * 12;
  const baseRate = d > 0 
    ? (d * dailyRate) + Math.min(h * pricePerHour, dailyRate)
    : Math.min(totalHours * pricePerHour, dailyRate);
  const processingFee = 45.00;
  const tax = baseRate * 0.18;
  const total = baseRate + processingFee + tax;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    if (activeTimeSelector === 'entry') {
      const newEntry = new Date(tempEntry);
      newEntry.setHours(hours, minutes);
      setTempEntry(newEntry);
      if (tempExit <= newEntry) {
        setTempExit(new Date(newEntry.getTime() + 2 * 60 * 60 * 1000));
      }
    } else {
      const newExit = new Date(tempExit);
      newExit.setHours(hours, minutes);
      if (newExit > tempEntry) {
        setTempExit(newExit);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[2000] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[2001] h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
              <button onClick={onClose} className="p-2 -ml-2">
                <X className="w-6 h-6 text-gray-400" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Select Date & Time</h2>
              <div className="w-10" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
              {/* Check-in / Check-out Summary Boxes */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveTimeSelector('entry')}
                  className={`
                    p-4 rounded-2xl border transition-all cursor-pointer
                    ${activeTimeSelector === 'entry' ? 'border-[#007AFF] bg-blue-50/30' : 'border-gray-100 bg-gray-50/50'}
                  `}
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-in</p>
                  <p className="text-sm font-black text-gray-900">{formatTime(tempEntry)}</p>
                  <p className="text-[10px] font-semibold text-gray-400">
                    {tempEntry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div 
                  onClick={() => setActiveTimeSelector('exit')}
                  className={`
                    p-4 rounded-2xl border transition-all cursor-pointer
                    ${activeTimeSelector === 'exit' ? 'border-[#007AFF] bg-blue-50/30' : 'border-gray-100 bg-gray-50/50'}
                  `}
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-out</p>
                  <p className="text-sm font-black text-gray-900">{formatTime(tempExit)}</p>
                  <p className="text-[10px] font-semibold text-gray-400">
                    {tempExit.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Calendar Card */}
              <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-gray-900">{monthName}</h3>
                  <div className="flex gap-4">
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-1 hover:bg-gray-50 rounded-full transition-colors">
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-1 hover:bg-gray-50 rounded-full transition-colors">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <span key={d} className="text-[10px] font-bold text-gray-400 uppercase mb-4">{d}</span>
                  ))}
                  {calendarDays.map((d, i) => {
                    const dateObj = new Date(d.year, d.month, d.day);
                    const isStart = dateObj.toDateString() === tempEntry.toDateString();
                    const isEnd = dateObj.toDateString() === tempExit.toDateString();
                    const inRange = dateObj > tempEntry && dateObj < tempExit;

                    return (
                      <button 
                        key={i}
                        onClick={() => !d.isPadding && handleDateClick(d.day, d.month, d.year)}
                        className={`
                          relative h-12 flex flex-col items-center justify-center text-sm font-bold transition-all
                          ${d.isPadding ? 'text-gray-200' : 'text-gray-900'}
                          ${isStart || isEnd ? 'text-white z-10' : ''}
                        `}
                      >
                        {inRange && (
                          <div className="absolute inset-y-1 inset-x-0 bg-[#007AFF]/20" />
                        )}
                        {isStart && tempExit.toDateString() !== tempEntry.toDateString() && (
                          <div className="absolute inset-y-1 left-1/2 right-0 bg-[#007AFF]/20" />
                        )}
                        {isEnd && tempExit.toDateString() !== tempEntry.toDateString() && (
                          <div className="absolute inset-y-1 left-0 right-1/2 bg-[#007AFF]/20" />
                        )}
                        {(isStart || isEnd) && (
                          <motion.div 
                            layoutId="selectedDay"
                            className="absolute inset-1 bg-[#007AFF] rounded-full"
                          />
                        )}
                        <span className="relative z-20">{d.day}</span>
                        {isStart && <span className="relative z-20 text-[7px] uppercase mt-0.5">In</span>}
                        {isEnd && <span className="relative z-20 text-[7px] uppercase mt-0.5">Out</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Badge */}
              <div className="flex justify-center">
                <div className="bg-[#007AFF] text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-blue-100/50">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">{d} Days, {h} Hours</span>
                </div>
              </div>

              {/* Single Time Selector */}
              <div className="space-y-4">
                <div className="p-6 rounded-[32px] border border-[#007AFF] bg-blue-50/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center">
                      {activeTimeSelector === 'entry' ? <LogIn className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {activeTimeSelector === 'entry' ? 'Check-in Time' : 'Check-out Time'}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900">
                          {formatTime(activeTimeSelector === 'entry' ? tempEntry : tempExit).split(' ')[0]}
                        </span>
                        <span className="text-sm font-bold text-gray-400 uppercase">
                          {formatTime(activeTimeSelector === 'entry' ? tempEntry : tempExit).split(' ')[1]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-[#007AFF]">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <input 
                      type="time"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      value={activeTimeSelector === 'entry' ? tempEntry.toTimeString().slice(0, 5) : tempExit.toTimeString().slice(0, 5)}
                      onChange={handleTimeChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 bg-white border-t border-gray-50 space-y-4 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Estimated Total</span>
                <span className="text-2xl font-black text-gray-900">₹{total.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => onApply(tempEntry, tempExit)}
                className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-full shadow-xl shadow-blue-200 active:scale-[0.98] transition-transform"
              >
                Apply Changes
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DateTimeModal;
