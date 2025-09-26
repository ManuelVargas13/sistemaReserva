import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2'; // ← AGREGAR IMPORT

interface Booking {
  id: number;
  userId: number;
  flightId: number;
  seats: string[];
  class: string;
  passengers: { name: string; document: string; age: number }[];
  bookingDate: string;
  status: string;
  ticketUrl?: string;
  totalPrice?: number;
}

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

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './bookings.component.html',
})
export class BookingsComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  filteredBookings = signal<Booking[]>([]);
  flights = signal<Flight[]>([]);
  airlines = signal<any[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchFlights();
    this.fetchAirlines();
    this.fetchBookings();
  }

  fetchBookings() {
    this.loading.set(true);
    const userId = Number(localStorage.getItem('loggedUserId'));
    if (!userId) {
      this.error.set('No hay usuario logueado. Por favor inicia sesión.');
      this.loading.set(false);
      return;
    }

    this.http.get<Booking[]>('http://localhost:3000/bookings').subscribe({
      next: (data) => {
        const userBookings = data.filter((b) => Number(b.userId) === userId);
        this.bookings.set(userBookings);
        this.filteredBookings.set(userBookings);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar reservas');
        this.loading.set(false);
      },
    });
  }

  fetchFlights() {
    this.http.get<Flight[]>('http://localhost:3000/flights').subscribe({
      next: (data) => this.flights.set(data),
    });
  }

  fetchAirlines() {
    this.http.get<any[]>('http://localhost:3000/airlines').subscribe({
      next: (data) => this.airlines.set(data),
    });
  }

  getTotalPrice(booking: Booking): number {
    const flight = this.getFlight(booking.flightId);
    if (!flight) return booking.totalPrice || 0;

    const unitPrice = booking.class === 'business'
      ? flight.businessPrice
      : flight.economyPrice;

    return unitPrice * booking.passengers.length;
  }

  downloadTicket(url: string, booking: Booking) {
    const flight = this.getFlight(booking.flightId);
    const airline = this.getAirlineName(flight?.airline || '');
    const totalPrice = this.getTotalPrice(booking);
    const unitPrice = booking.class === 'business' ? flight?.businessPrice : flight?.economyPrice;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket de Reserva #${booking.id}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; }
          .ticket { border: 2px solid #007bff; border-radius: 10px; padding: 20px; background: #f8f9fa; }
          .header { text-align: center; color: #007bff; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 15px; }
          .badge { background: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
          .badge.success { background: #28a745; }
          .badge.info { background: #17a2b8; margin: 2px; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .col { flex: 1; }
          .price-section { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .total { font-size: 18px; font-weight: bold; color: #28a745; }
          .passengers { margin: 15px 0; }
          .passenger-item { padding: 8px; border-left: 3px solid #007bff; margin: 5px 0; background: white; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>🎫 Ticket de Reserva</h1>
            <h2>Reserva #${booking.id}</h2>
            <span class="badge ${booking.status === 'confirmed' ? 'success' : ''}">${booking.status.toUpperCase()}</span>
          </div>

          <div class="row">
            <div class="col">
              <h3>✈️ ${flight?.flightNumber || 'N/A'}</h3>
              <p><strong>${flight?.origin || 'N/A'} → ${flight?.destination || 'N/A'}</strong></p>
              <p>Aerolínea: ${airline}</p>
            </div>
            <div class="col" style="text-align: right;">
              <p><strong>Fecha de vuelo:</strong> ${flight?.departure || 'N/A'}</p>
              <p><strong>Fecha de reserva:</strong> ${booking.bookingDate}</p>
              <p><strong>Clase:</strong> <span class="badge">${booking.class.toUpperCase()}</span></p>
            </div>
          </div>

          <div class="row">
            <div class="col">
              <p><strong>Asientos:</strong></p>
              ${booking.seats.map(seat => `<span class="badge info">${seat}</span>`).join(' ')}
            </div>
            <div class="col" style="text-align: right;">
              <p><strong>Pasajeros:</strong> ${booking.passengers.length} persona${booking.passengers.length === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div class="passengers">
            <h4>👥 Lista de Pasajeros:</h4>
            ${booking.passengers.map(p => `
              <div class="passenger-item">
                <strong>${p.name}</strong><br>
                <small>Documento: ${p.document} | Edad: ${p.age} años</small>
              </div>
            `).join('')}
          </div>

          <div class="price-section">
            <div class="row">
              <span>Precio unitario:</span>
              <span>$${unitPrice || 0}</span>
            </div>
            <div class="row">
              <span>Cantidad de pasajeros:</span>
              <span>${booking.passengers.length}x</span>
            </div>
            <hr>
            <div class="row total">
              <span>TOTAL A PAGAR:</span>
              <span>$${totalPrice}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <small style="color: #6c757d;">
              Ticket generado el ${new Date().toLocaleDateString('es-PE')} a las ${new Date().toLocaleTimeString('es-PE')}<br>
              Sistema de Reservas de Vuelos
            </small>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
    }
  }

  // ✅ MÉTODO ACTUALIZADO CON SWEETALERT2
  cancelBooking(id: number) {
    const booking = this.bookings().find(b => b.id === id);
    const flight = booking ? this.getFlight(booking.flightId) : null;
    const totalPrice = booking ? this.getTotalPrice(booking) : 0;

    Swal.fire({
      title: '¿Cancelar Reserva?',
      html: `
        <div class="text-start">
          <p class="mb-2"><strong>Reserva #${id}</strong></p>
          ${flight ? `
            <p class="mb-1"><strong>Vuelo:</strong> ${flight.flightNumber}</p>
            <p class="mb-1"><strong>Ruta:</strong> ${flight.origin} → ${flight.destination}</p>
          ` : ''}
          ${booking ? `
            <p class="mb-1"><strong>Asientos:</strong> ${booking.seats.join(', ')}</p>
            <p class="mb-1"><strong>Clase:</strong> ${booking.class}</p>
            <p class="mb-1"><strong>Pasajeros:</strong> ${booking.passengers.length}</p>
            <p class="mb-1"><strong>Total:</strong> <span class="text-success fw-bold">$${totalPrice}</span></p>
          ` : ''}
        </div>
        <hr>
        <p class="text-warning mb-0">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>¡Atención!</strong> Esta acción no se puede deshacer.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-x-circle me-2"></i>Sí, cancelar reserva',
      cancelButtonText: '<i class="bi bi-arrow-left me-2"></i>No, mantener reserva',
      customClass: {
        popup: 'swal-wide',
        confirmButton: 'btn-lg',
        cancelButton: 'btn-lg'
      },
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Mostrar loading
        Swal.fire({
          title: 'Cancelando reserva...',
          text: 'Por favor espera',
          icon: 'info',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Realizar cancelación
        this.http.patch(`http://localhost:3000/bookings/${id}`, { status: 'cancelled' }).subscribe({
          next: () => {
            // Recargar datos
            this.fetchBookings();

            // Mostrar éxito
            Swal.fire({
              title: '¡Reserva Cancelada!',
              html: `
                <div class="text-center">
                  <i class="bi bi-check-circle-fill text-success fs-1 d-block mb-3"></i>
                  <p class="mb-2">La reserva #${id} ha sido cancelada exitosamente.</p>
                  ${booking ? `<p class="text-muted">Los asientos ${booking.seats.join(', ')} ahora están disponibles.</p>` : ''}
                </div>
              `,
              icon: 'success',
              confirmButtonColor: '#28a745',
              confirmButtonText: '<i class="bi bi-check me-2"></i>Entendido'
            });
          },
          error: (err) => {
            console.error('Error al cancelar reserva:', err);

            // Mostrar error
            Swal.fire({
              title: 'Error al cancelar',
              html: `
                <div class="text-center">
                  <i class="bi bi-x-circle-fill text-danger fs-1 d-block mb-3"></i>
                  <p class="mb-2">No se pudo cancelar la reserva #${id}.</p>
                  <p class="text-muted">Por favor intenta nuevamente o contacta al soporte.</p>
                </div>
              `,
              icon: 'error',
              confirmButtonColor: '#dc3545',
              confirmButtonText: '<i class="bi bi-arrow-clockwise me-2"></i>Intentar de nuevo'
            });

            this.error.set('No se pudo cancelar la reserva');
          }
        });
      }
    });
  }

  getFlight(flightId: number) {
    return this.flights().find((f) => f.id === flightId);
  }

  getAirlineName(airlineId: string) {
    return this.airlines().find((a) => a.id === airlineId)?.name || airlineId;
  }
}
