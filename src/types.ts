export interface Slot {
  id: string;
  name: string;
  address: string;
  price: number;
  rating: number;
  distance: string;
  type: string;
  images: string[];
  isVerified: boolean;
  amenities: string[];
  reviews: number;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'DISABLED';
  isAvailable: boolean;
  isOccupied?: boolean;
  slotNumber?: string;
  rows?: number;
  cols?: number;
  levels?: number;
  ownerUid?: string;
}

export interface Booking {
  id: string;
  userId: string;
  slotId: string;
  ownerUid?: string;
  slotNumber: string;
  slotName?: string;
  slotAddress?: string;
  slotImage?: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalPrice: number;
  createdAt: string;
}
