import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeatService } from '../../services/seat.service';
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

@Component({
  selector: 'app-seats',
  standalone: true,
  templateUrl: './seats.component.html',
  styleUrls: ['./seats.component.css'],
  imports: [CommonModule],
})
export class SeatsComponent implements OnInit {
  flight = signal<Flight | null>(null);
  airlines = signal<any[]>([]);
  selectedSeats = signal<string[]>([]);
  occupiedSeats = signal<string[]>([]);
  seatClass = signal<'economy' | 'business'>('economy');
  passengers = signal<any[]>([]);
  loading = signal(false);
  seatRows = signal<any[][]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private seatService: SeatService
  ) {
    console.log('SEATS CONSTRUCTOR CALLED');
  }

  ngOnInit() {
    // OBTENER FLIGHT ID DE LA URL
    const flightId = Number(this.route.snapshot.paramMap.get('id'));

    if (flightId) {
      this.loadFlight(flightId);
      this.loadOccupiedSeats(flightId); // ← CARGAR ASIENTOS OCUPADOS
      this.loadAirlines();
    }

    // Obtener datos de navegación/localStorage si existen
    this.loadNavigationData();
  }

  loadFlight(id: number) {
    this.loading.set(true);
    this.http.get<Flight>(`http://localhost:3000/flights/${id}`).subscribe({
      next: (data) => {
        this.flight.set(data);
        this.loadSeats(); // Regenerar asientos con nueva data
        this.loading.set(false);
      },
      error: (err) => {
        console.error('ERROR LOADING FLIGHT:', err);
        this.loading.set(false);
      }
    });
  }

  loadOccupiedSeats(flightId: number) {

    this.seatService.getOccupiedSeats(flightId).subscribe({
      next: (occupiedSeats) => {
        this.occupiedSeats.set(occupiedSeats);
        this.loadSeats(); // Regenerar asientos con asientos ocupados actualizados
      },
      error: (err) => {
        console.error('ERROR LOADING OCCUPIED SEATS:', err);
      }
    });
  }

  loadAirlines() {
    this.http.get<any[]>('http://localhost:3000/airlines').subscribe({
      next: (data) => this.airlines.set(data),
      error: (err) => console.error('ERROR LOADING AIRLINES:', err)
    });
  }

  loadNavigationData() {

    // Obtener datos de navegación
    const nav = this.router.getCurrentNavigation();
    let state = nav?.extras?.state;

    // Si no hay state en navegación, leer desde localStorage
    if (!state) {

      const localState = localStorage.getItem('selectedFlightState');

      if (localState) {
        try {
          state = JSON.parse(localState);
          console.log('Parsed state from localStorage:', state);
        } catch (err) {
          console.error('Error parsing localStorage state:', err);
        }
      }
    }

    // CARGAR DATOS DEL STATE
    if (state) {
      if (state['passengers']) {
        this.passengers.set(state['passengers']);
      }
      if (state['class']) {
        this.seatClass.set(state['class']);
      }
    }

    if (this.passengers().length === 0) {
      this.passengers.set([{
        firstName: 'Pasajero',
        lastName: '1',
        documentType: 'DNI',
        documentNumber: '00000000'
      }]);
    }
  }

  loadSeats() {
    const flight = this.flight();
    if (!flight) return;

    const occupiedSeats = this.occupiedSeats();
    const totalSeats = flight.totalSeats || 180;

    // 20% business, 80% economy
    const businessSeats = Math.floor(totalSeats * 0.2);
    const economySeats = totalSeats - businessSeats;
    const seatsPerRow = 6;

    const businessRowsCount = Math.ceil(businessSeats / seatsPerRow);
    const economyRowsCount = Math.ceil(economySeats / seatsPerRow);

    const seatRows = [];

    // Business seats
    let seatNumber = 1;
    for (let i = 0; i < businessRowsCount; i++) {
      const row = [];
      for (let j = 0; j < seatsPerRow && seatNumber <= businessSeats; j++) {
        const id = `B${seatNumber}`;
        row.push({
          id,
          status: occupiedSeats.includes(id) ? 'occupied' : 'available',
          class: 'business'
        });
        seatNumber++;
      }
      seatRows.push(row);
    }

    // Economy seats
    seatNumber = 1;
    for (let i = 0; i < economyRowsCount; i++) {
      const row = [];
      for (let j = 0; j < seatsPerRow && seatNumber <= economySeats; j++) {
        const id = `E${seatNumber}`;
        row.push({
          id,
          status: occupiedSeats.includes(id) ? 'occupied' : 'available',
          class: 'economy'
        });
        seatNumber++;
      }
      seatRows.push(row);
    }
    this.seatRows.set(seatRows);
  }

  selectSeat(seat: any) {

    if (seat.status === 'occupied') {
      Swal.fire({
        icon: 'error',
        title: 'Asiento ocupado',
        text: 'Este asiento ya está reservado por otro pasajero',
        confirmButtonColor: '#d33'
      });
      return;
    }

    if (seat.status !== 'available') return;

    // Validar clase
    const claseSeleccionada = this.seatClass();
    const esEconomy = seat.id.startsWith('E');
    const esBusiness = seat.id.startsWith('B');

    if (
      (claseSeleccionada === 'economy' && !esEconomy) ||
      (claseSeleccionada === 'business' && !esBusiness)
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Clase incorrecta',
        text: `Solo puedes seleccionar asientos de clase ${claseSeleccionada === 'economy' ? 'Económica' : 'Ejecutiva'}.`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const selected = this.selectedSeats();
    const passengersCount = this.passengers().length || 1;

    if (selected.includes(seat.id)) {
      this.selectedSeats.set(selected.filter(s => s !== seat.id));
    } else {
      if (selected.length < passengersCount) {
        this.selectedSeats.set([...selected, seat.id]);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Límite alcanzado',
          text: `Solo puedes seleccionar ${passengersCount} asiento(s)`,
          confirmButtonColor: '#3085d6'
        });
      }
    }
  }

  changeClass(cls: 'economy' | 'business') {
    this.seatClass.set(cls);
    this.selectedSeats.set([]);
  }

  confirmReservation() {
    const passengersCount = this.passengers().length || 1;

    if (this.selectedSeats().length !== passengersCount) {
      Swal.fire({
        icon: 'info',
        title: 'Selecciona los asientos',
        text: `Debes seleccionar ${passengersCount} asiento(s) para continuar.`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // NO RESERVAR AÚN - Solo guardar datos y navegar
    const reservationData = {
      flight: this.flight(),
      seats: this.selectedSeats(),
      class: this.seatClass(),
      totalPrice: this.getTotalPrice(),
      passengersCount: this.selectedSeats().length
    };

    // Guardar en localStorage para la página booking
    localStorage.setItem('reservationData', JSON.stringify(reservationData));
    localStorage.setItem('selectedSeats', JSON.stringify(this.selectedSeats()));
    localStorage.setItem('selectedClass', this.seatClass());

    // NAVEGAR A BOOKING (no reservar todavía)
    this.router.navigate(['/booking'], {
      state: {
        flight: this.flight(),
        seats: this.selectedSeats(),
        class: this.seatClass(),
        totalPrice: this.getTotalPrice()
      }
    });
  }

  getAirlineName(id: string) {
    return this.airlines().find(a => a.id === id)?.name || id;
  }

  getSeatTooltip(seat: any): string {
    if (seat.status === 'occupied') {
      return 'Asiento ocupado';
    }
    if (seat.class === 'business' && this.seatClass() !== 'business') {
      return 'Selecciona clase ejecutiva para este asiento';
    }
    if (seat.class === 'economy' && this.seatClass() !== 'economy') {
      return 'Selecciona clase económica para este asiento';
    }
    return `Asiento ${seat.id} - ${seat.class === 'business' ? 'Ejecutiva' : 'Económica'}`;
  }

  getTotalPrice(): number {
    const flight = this.flight();
    if (!flight) return 0;

    const pricePerSeat = this.seatClass() === 'business'
      ? flight.businessPrice
      : flight.economyPrice;

    return pricePerSeat * this.selectedSeats().length;
  }

  goBack() {
    this.router.navigate(['/flights/search']);
  }
}
