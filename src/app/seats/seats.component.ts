import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeatService } from '../services/seat.service';
import Swal from 'sweetalert2';

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

interface Passenger {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email?: string;
  phone?: string;
}

interface Airline {
  id: string;
  name: string;
  code: string;
}

@Component({
  selector: 'app-seats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seats.component.html'
})
export class SeatsComponent implements OnInit {
  flight = signal<Flight | null>(null);
  airlines = signal<Airline[]>([]);
  selectedSeats = signal<string[]>([]);
  occupiedSeats = signal<string[]>([]);
  seatClass = signal<'economy' | 'business'>('economy');
  passengers = signal<Passenger[]>([]);
  loading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private seatService: SeatService
  ) {}

  ngOnInit() {
    const flightId = Number(this.route.snapshot.paramMap.get('id'));

    if (flightId) {
      this.loadFlight(flightId);
      this.loadOccupiedSeats(flightId);
      this.loadAirlines();
    } else {
      console.log('NO FLIGHT ID FOUND');
    }

    const passengersData = this.route.snapshot.queryParams['passengers'];
    const seatClass = this.route.snapshot.queryParams['class'] || 'economy';

    if (passengersData) {
      try {
        const parsedPassengers = JSON.parse(decodeURIComponent(passengersData));
        this.passengers.set(parsedPassengers);
      } catch (error) {
        console.error('Error parsing passengers:', error);
        this.router.navigate(['/search']);
      }
    }

    this.seatClass.set(seatClass as 'economy' | 'business');
  }

  loadFlight(id: number) {
    this.loading.set(true);
    this.http.get<Flight>(`http://localhost:3000/flights/${id}`).subscribe({
      next: (data) => {
        this.flight.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading flight:', err);
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la información del vuelo',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  loadOccupiedSeats(flightId: number) {
    this.seatService.getOccupiedSeats(flightId).subscribe({
      next: (occupiedSeats) => {
        this.occupiedSeats.set(occupiedSeats);
      },
      error: (err) => {
        console.error('ERROR LOADING OCCUPIED SEATS:', err);
      }
    });
  }

  loadAirlines() {
    this.http.get<Airline[]>('http://localhost:3000/airlines').subscribe({
      next: (data) => this.airlines.set(data),
      error: (err) => console.error('Error loading airlines:', err)
    });
  }

  // Generar filas de asientos
  getBusinessRows(): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1); // Filas 1-5
  }

  getEconomyRows(): number[] {
    return Array.from({ length: 25 }, (_, i) => i + 6); // Filas 6-30
  }

  // Generar asientos por fila
  getSeatsInRow(row: number, classType: string, side: string = 'left'): string[] {
    const letters = classType === 'business'
      ? (side === 'left' ? ['A', 'B'] : ['C', 'D']) // 2-2 en business
      : (side === 'left' ? ['A', 'B', 'C'] : ['D', 'E', 'F']); // 3-3 en economy

    return letters.map(letter => `${row}${letter}`);
  }

  selectSeat(seat: string) {
    // Verificar si el asiento está ocupado
    if (this.occupiedSeats().includes(seat)) {
      Swal.fire({
        icon: 'error',
        title: 'Asiento ocupado',
        text: 'Este asiento ya está reservado por otro pasajero',
        confirmButtonColor: '#d33'
      });
      return;
    }

    // Verificar la clase del asiento
    const seatRow = parseInt(seat.substring(0, seat.length - 1));
    const isBusinessSeat = seatRow <= 5;
    const selectedClass = this.seatClass();

    if ((isBusinessSeat && selectedClass !== 'business') ||
        (!isBusinessSeat && selectedClass !== 'economy')) {
      Swal.fire({
        icon: 'warning',
        title: 'Clase incorrecta',
        text: `Este asiento pertenece a la clase ${isBusinessSeat ? 'ejecutiva' : 'económica'}`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const currentSelected = this.selectedSeats();
    const passengersCount = this.passengers().length;

    if (currentSelected.includes(seat)) {
      // Deseleccionar asiento
      this.selectedSeats.set(currentSelected.filter(s => s !== seat));
    } else {
      // Seleccionar asiento
      if (currentSelected.length < passengersCount) {
        this.selectedSeats.set([...currentSelected, seat]);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Límite alcanzado',
          text: `Solo puedes seleccionar ${passengersCount} asientos`,
          confirmButtonColor: '#3085d6'
        });
      }
    }
  }

  getSeatStatus(seat: string): string {
    if (this.occupiedSeats().includes(seat)) {
      return 'occupied';
    }
    if (this.selectedSeats().includes(seat)) {
      return 'selected';
    }
    return 'available';
  }

  getSeatClass(seat: string): string {
    const status = this.getSeatStatus(seat);
    const seatRow = parseInt(seat.substring(0, seat.length - 1));
    const isBusinessSeat = seatRow <= 5;
    const selectedClass = this.seatClass();

    let classes = [status];

    // Agregar clase según tipo de asiento
    if (isBusinessSeat) {
      classes.push('business-seat');
    } else {
      classes.push('economy-seat');
    }

    // Deshabilitar si no coincide con la clase seleccionada
    if ((isBusinessSeat && selectedClass !== 'business') ||
        (!isBusinessSeat && selectedClass !== 'economy')) {
      classes.push('disabled');
    }

    return classes.join(' ');
  }

  getSeatTooltip(seat: string): string {
    const status = this.getSeatStatus(seat);
    const seatRow = parseInt(seat.substring(0, seat.length - 1));
    const isBusinessSeat = seatRow <= 5;

    switch (status) {
      case 'occupied':
        return 'Asiento ocupado';
      case 'selected':
        return 'Asiento seleccionado';
      case 'available':
        return `Asiento ${seat} - ${isBusinessSeat ? 'Ejecutiva' : 'Económica'}`;
      default:
        return seat;
    }
  }

  getTotalPrice(): number {
    const flight = this.flight();
    if (!flight) return 0;

    const pricePerSeat = this.seatClass() === 'business'
      ? flight.businessPrice
      : flight.economyPrice;

    return pricePerSeat * this.passengers().length;
  }

  getAirlineName(airlineId: string): string {
    const airline = this.airlines().find(a => a.id === airlineId);
    return airline?.name || airlineId;
  }

  confirmReservation() {
    const userId = Number(localStorage.getItem('loggedUserId'));
    if (!userId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes iniciar sesión para realizar una reserva',
        confirmButtonColor: '#d33'
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    if (this.selectedSeats().length !== this.passengers().length) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección incompleta',
        text: `Debes seleccionar ${this.passengers().length} asiento(s)`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Confirmar reserva
    Swal.fire({
      title: '¿Confirmar reserva?',
      html: `
        <div class="text-start">
          <p><strong>Vuelo:</strong> ${this.flight()?.flightNumber}</p>
          <p><strong>Ruta:</strong> ${this.flight()?.origin} → ${this.flight()?.destination}</p>
          <p><strong>Asientos:</strong> ${this.selectedSeats().join(', ')}</p>
          <p><strong>Clase:</strong> ${this.seatClass() === 'business' ? 'Ejecutiva' : 'Económica'}</p>
          <p><strong>Total:</strong> ${this.getTotalPrice().toLocaleString('en-US', { style: 'currency', currency: 'PEN' })}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processReservation(userId);
      }
    });
  }

  processReservation(userId: number) {
    this.loading.set(true);

    const reservationData = {
      flightId: this.flight()!.id,
      seats: this.selectedSeats(),
      passengers: this.passengers(),
      class: this.seatClass(),
      userId
    };

    this.seatService.reserveSeats(reservationData).subscribe({
      next: (result) => {
        console.log('Reservation successful:', result);
        this.loading.set(false);

        Swal.fire({
          icon: 'success',
          title: '¡Reserva confirmada!',
          html: `
            <div class="text-center">
              <p>Tu reserva se ha procesado exitosamente</p>
              <p><strong>Código de reserva:</strong> #${result.booking.id}</p>
              <p class="text-muted">Recibirás un email de confirmación</p>
            </div>
          `,
          confirmButtonColor: '#28a745'
        }).then(() => {
          this.router.navigate(['/my-bookings']);
        });
      },
      error: (err) => {
        console.error('Reservation failed:', err);
        this.loading.set(false);

        Swal.fire({
          icon: 'error',
          title: 'Error en la reserva',
          text: err.message || 'No se pudo procesar la reserva. Intenta de nuevo.',
          confirmButtonColor: '#d33'
        });

        // Recargar asientos ocupados por si algo cambió
        this.loadOccupiedSeats(this.flight()!.id);
      }
    });
  }

  goBack() {
    this.router.navigate(['/search']);
  }

  // Método para cambiar clase de asiento
  onClassChange(newClass: 'economy' | 'business') {
    if (this.selectedSeats().length > 0) {
      Swal.fire({
        title: '¿Cambiar clase?',
        text: 'Esto deseleccionará los asientos actuales',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.selectedSeats.set([]);
          this.seatClass.set(newClass);
        }
      });
    } else {
      this.seatClass.set(newClass);
    }
  }
}
