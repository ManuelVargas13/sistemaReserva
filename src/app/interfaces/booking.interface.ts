export interface Booking {
  id: number;
  userId: number;
  flightId: number;
  seats: string[];
  class: 'economy' | 'business';
  passengers: Passenger[];
  bookingDate: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Passenger {
  firstName?: string;
  lastName?: string;
  name?: string;
  documentType?: 'DNI' | 'Passport' | 'CE';
  documentNumber?: string;
  document?: string;
  email?: string;
  age?: number;
}
