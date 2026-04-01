import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import { Slot } from '../types';
import { SLOTS, createPriceIcon } from '../constants';
import { useCurrency } from '../CurrencyContext';

interface MapComponentProps {
  onSelectSlot: (slot: Slot) => void;
  center: [number, number];
  userLocation: [number, number] | null;
  slots: Slot[];
}

// Helper component to recenter map smoothly
const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  onSelectSlot, 
  center, 
  userLocation, 
  slots
}) => {
  const { currencySymbol } = useCurrency();
  const userIcon = L.divIcon({
    className: 'user-location-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
        <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer 
        center={center} 
        zoom={12} 
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <RecenterMap center={center} />
        
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {slots.map(slot => (
          <Marker 
            key={slot.id} 
            position={[slot.lat, slot.lng]}
            icon={createPriceIcon(slot.price, currencySymbol, slot.isOccupied)}
            eventHandlers={{
              click: () => onSelectSlot(slot),
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-xs">{slot.name}</p>
                <p className="text-[10px] text-gray-500">{currencySymbol} {slot.price}/hr</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
