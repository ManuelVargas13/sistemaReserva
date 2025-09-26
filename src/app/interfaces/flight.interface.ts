export interface Flight {
  id: number;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  airline: string;
  totalSeats: number;
  availableSeats: number;
  economyPrice: number;
  businessPrice: number;
}
