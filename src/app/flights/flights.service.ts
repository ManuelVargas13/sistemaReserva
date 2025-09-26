import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class FlightsService {
  flights = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  async searchFlights(origin: string, destination: string, date: string, passengers: number, flightClass: string) {
    try {

      const allFlights = await this.http.get<any[]>('http://localhost:3000/flights').toPromise() || [];

      const filteredFlights = allFlights.filter(flight => {
        let originMatch = true;
        let destinationMatch = true;

        if (origin && origin.trim()) {
          originMatch = flight.origin.toLowerCase().includes(origin.toLowerCase().trim());
        }

        if (destination && destination.trim()) {
          destinationMatch = flight.destination.toLowerCase().includes(destination.toLowerCase().trim());
        }

        let dateMatch = true;
        if (date && date.trim()) {
          const flightDate = new Date(flight.departure).toISOString().split('T')[0];
          dateMatch = flightDate === date;
        }

        let hasCapacity = true;
        if (passengers > 0) {
          if (flightClass === 'business') {
            hasCapacity = (flight.businessSeats || flight.availableSeats || 0) >= passengers;
          } else {
            hasCapacity = (flight.economySeats || flight.availableSeats || 0) >= passengers;
          }
        }

        const matches = originMatch && destinationMatch && dateMatch && hasCapacity;

        return matches;
      });
      return filteredFlights;

    } catch (error) {
      console.error('Error en búsqueda de vuelos:', error);
      throw error;
    }
  }
}
