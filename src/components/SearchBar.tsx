import React, { useState } from 'react';
import { 
  SearchRounded as Search, 
  TuneRounded as Settings2, 
  AccessTimeRounded as Clock, 
  DirectionsCarRounded as Car, 
  ElectricBoltRounded as Zap, 
  CloseRounded as X, 
  AutorenewRounded as Loader2 
} from '@mui/icons-material';

interface SearchBarProps {
  onSearch: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onSearch(parseFloat(lat), parseFloat(lon), display_name);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-12 max-w-2xl mx-auto w-full bg-gradient-to-b from-white/80 to-transparent">
      <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-3 flex items-center gap-3 border border-gray-100">
        <Search className="text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where do you want to park?" 
          className="flex-1 bg-transparent outline-none text-sm text-gray-700"
          autoFocus
        />
        {isSearching ? (
          <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
        ) : (
          <button type="button" onClick={onClose}>
            <X className="text-gray-400 w-5 h-5 hover:text-gray-600" />
          </button>
        )}
        <div className="w-px h-6 bg-gray-200"></div>
        <Settings2 className="text-gray-400 w-5 h-5" />
      </form>

      {/* Filters */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
        <button className="bg-[#007AFF] text-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-md">
          <Clock className="w-3 h-3" /> 2 Hours
        </button>
        <button className="bg-white text-gray-700 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-sm border border-gray-100">
          <Car className="w-3 h-3" /> SUV
        </button>
        <button className="bg-white text-gray-700 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-sm border border-gray-100">
          <Zap className="w-3 h-3" /> EV Charge
        </button>
        <button className="bg-white text-gray-700 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-sm border border-gray-100">
           Underground
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
