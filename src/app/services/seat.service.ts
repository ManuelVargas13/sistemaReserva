import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface Flight {
  id: number;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  airline: string;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: string[];
  economyPrice: number;
  businessPrice: number;
}

interface SeatReservationData {
  flightId: number;
  seats: string[];
  passengers: any[];
  class: string;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeatService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // Obtener asientos ocupados consultando SOLO bookings
  getOccupiedSeats(flightId: number): Observable<string[]> {
    const flightIdStr = flightId.toString(); // ← Convierte 101 a "101"

    return this.http.get<any[]>(`${this.apiUrl}/bookings`).pipe(
      map(bookings => {

        // Filtrar reservas confirmadas para este vuelo
        const confirmedBookings = bookings.filter(booking =>
          booking.flightId === flightIdStr &&
          booking.status === 'confirmed'
        );

        // Extraer todos los asientos
        const occupiedSeats: string[] = [];
        confirmedBookings.forEach(booking => {
          if (booking.seats && Array.isArray(booking.seats)) {
            occupiedSeats.push(...booking.seats);
          } else if (booking.seat) {
            occupiedSeats.push(booking.seat);
          }
        });

        // Eliminar duplicados
        const uniqueSeats = [...new Set(occupiedSeats)];

        return uniqueSeats;
      })
    );
  }

  // Verificar disponibilidad consultando bookings
  checkSeatAvailability(flightId: number, seats: string[]): Observable<boolean> {
    return this.getOccupiedSeats(flightId).pipe(
      map(occupiedSeats => {
        const isAvailable = !seats.some(seat => occupiedSeats.includes(seat));
        return isAvailable;
      })
    );
  }

  // Reservar asientos (SOLO crear booking, NO modificar flight)
  reserveSeats(reservationData: SeatReservationData): Observable<any> {
    const { flightId, seats, passengers, class: seatClass, userId } = reservationData;

    // 1. Verificar disponibilidad
    return this.checkSeatAvailability(flightId, seats).pipe(
      switchMap(available => {
        if (!available) {
          throw new Error('Uno o más asientos ya están ocupados');
        }

        // 2. Crear SOLO la reserva (NO actualizar flight)
        const booking = {
          userId: userId.toString(),
          flightId: flightId.toString(),
          seats,
          class: seatClass,
          passengers,
          bookingDate: new Date().toISOString(),
          status: 'confirmed'
        };

        return this.http.post<any>(`${this.apiUrl}/bookings`, booking).pipe(
          map(result => {
            console.log('BOOKING CREATED:', result);
            return { booking: result };
          })
        );
      })
    );
  }

  // Cancelar reserva
  cancelReservation(bookingId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/bookings/${bookingId}`).pipe(
      switchMap(booking => {
        const updatedBooking = {
          ...booking,
          status: 'cancelled'
        };

        return this.http.put<any>(`${this.apiUrl}/bookings/${bookingId}`, updatedBooking);
      })
    );
  }
}
