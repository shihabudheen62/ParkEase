import L from 'leaflet';
import { Slot } from './types';

export const SLOTS: Slot[] = [];

export const createPriceIcon = (price: number, currencySymbol: string = '$', isOccupied: boolean = false) => {
  const bgColor = isOccupied ? '#EA4335' : '#000000';
  const text = isOccupied ? 'Occupied' : `${currencySymbol} ${price.toFixed(2)}`;
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="background-color: ${bgColor}" class="text-white px-3 py-1.5 rounded-2xl shadow-2xl flex items-center justify-center font-bold text-sm relative whitespace-nowrap border border-white/10">
        ${text}
        <div style="background-color: ${bgColor}" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-r border-b border-white/10"></div>
      </div>
    `,
    iconSize: [isOccupied ? 85 : 70, 35],
    iconAnchor: [isOccupied ? 42.5 : 35, 35],
  });
};

export const createTargetIcon = () => {
  return L.divIcon({
    className: 'custom-target-icon',
    html: `
      <div class="w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-[#007AFF]">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/></svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const createPinIcon = () => {
  return L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <div class="flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#007AFF" stroke="none"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Leaflet default icon fix
export const setupLeafletIcons = () => {
    const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;
};
