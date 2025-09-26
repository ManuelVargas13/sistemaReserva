import { Component, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

import { Flight } from '../interfaces/flight.interface';
import { Airline } from '../interfaces/airline.interface';
import { Booking } from '../interfaces/booking.interface';

declare var $: any;

@Component({
  selector: 'app-flights-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flights-admin.component.html',
  styleUrl: './flights-admin.component.css'
})
export class FlightsAdminComponent implements OnInit, AfterViewInit {
  flights = signal<Flight[]>([]);
  airlines = signal<Airline[]>([]);
  bookings = signal<Booking[]>([]);
  loading = signal(false);
  error = signal('');
  editFlight: Flight | null = null;
  dataTable: any;

  newFlight = {
    flightNumber: '',
    origin: '',
    destination: '',
    departure: '',
    arrival: '',
    airline: '',
    totalSeats: 180,
    economyPrice: 0,
    businessPrice: 0
  };

  newAirline = {
    name: '',
    code: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchAllData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initDataTable();
    }, 500);
  }

  fetchAllData() {
    this.loading.set(true);

    forkJoin({
      flights: this.http.get<Flight[]>('http://localhost:3000/flights'),
      bookings: this.http.get<Booking[]>('http://localhost:3000/bookings'),
      airlines: this.http.get<Airline[]>('http://localhost:3000/airlines')
    }).subscribe({
      next: (data) => {
        this.bookings.set(data.bookings);
        this.airlines.set(data.airlines);

        const flightsWithAvailability = data.flights.map(flight => {
          const flightBookings = data.bookings.filter(
            booking => Number(booking.flightId) === Number(flight.id) && booking.status === 'confirmed'
          );

          // Contar asientos ocupados
          let occupiedCount = 0;
          flightBookings.forEach(booking => {
            if (booking.seats && Array.isArray(booking.seats)) {
              occupiedCount += booking.seats.length;
            }
          });

          const availableSeats = flight.totalSeats - occupiedCount;

          console.log(`FLIGHT ${flight.flightNumber}:`, {
            totalSeats: flight.totalSeats,
            occupiedCount,
            availableSeats
          });

          return {
            ...flight,
            availableSeats
          };
        });

        this.flights.set(flightsWithAvailability);
        this.loading.set(false);

        setTimeout(() => {
          this.refreshDataTable();
        }, 100);
      },
      error: (err) => {
        this.error.set('Error al cargar datos');
        this.loading.set(false);
        console.error('ERROR LOADING DATA:', err);
      }
    });
  }

  getOccupiedSeatsCount(flightId: number): number {
    const flightBookings = this.bookings().filter(
      booking => Number(booking.flightId) === Number(flightId) && booking.status === 'confirmed'
    );

    let occupiedCount = 0;
    flightBookings.forEach(booking => {
      if (booking.seats && Array.isArray(booking.seats)) {
        occupiedCount += booking.seats.length;
      }
    });

    return occupiedCount;
  }

  initDataTable() {
    if (this.dataTable) {
      this.dataTable.destroy();
    }

    this.dataTable = $('#flightsTable').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      },
      responsive: true,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
      order: [[0, 'asc']],
      columnDefs: [
        { orderable: false, targets: [8] }
      ],
      dom: 'Bfrtip',
      buttons: [
        'copy', 'csv', 'excel', 'pdf', 'print'
      ]
    });
  }

  refreshDataTable() {
    if (this.dataTable) {
      this.dataTable.destroy();
      setTimeout(() => {
        this.initDataTable();
      }, 100);
    }
  }

  fetchFlights() {
    this.fetchAllData();
  }

  fetchAirlines() {
    this.http.get<Airline[]>('http://localhost:3000/airlines').subscribe({
      next: (data) => this.airlines.set(data),
      error: (err) => console.error('Error al cargar aerolíneas:', err)
    });
  }

  async addFlight() {
    if (!this.newFlight.flightNumber || !this.newFlight.origin || !this.newFlight.destination) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor completa todos los campos obligatorios',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    try {
      const existingFlights = await this.http.get<Flight[]>('http://localhost:3000/flights').toPromise();

      let nextId = 1;
      if (existingFlights && existingFlights.length > 0) {
        const maxId = Math.max(...existingFlights.map(f => {
          const id = Number(f.id);
          return isNaN(id) ? 0 : id;
        }));
        nextId = maxId + 1;
      }

      const flight = {
        id: String(nextId),
        ...this.newFlight,
        availableSeats: this.newFlight.totalSeats
      };

      console.log('🛫 Creando vuelo con ID:', nextId);

      this.http.post<Flight>('http://localhost:3000/flights', flight).subscribe({
        next: (newFlight) => {

          Swal.fire({
            icon: 'success',
            title: 'Vuelo agregado',
            html: `
              <div class="text-start">
                <p><strong>ID:</strong> ${newFlight.id}</p>
                <p><strong>Vuelo:</strong> ${newFlight.flightNumber}</p>
                <p><strong>Ruta:</strong> ${newFlight.origin} → ${newFlight.destination}</p>
                <p><strong>Total asientos:</strong> ${newFlight.totalSeats}</p>
                <p><strong>Asientos disponibles:</strong> ${newFlight.availableSeats}</p>
              </div>
            `,
            confirmButtonColor: '#3085d6'
          });

          this.resetNewFlight();
          this.fetchAllData();
        },
        error: (err) => {
          console.error('Error creando vuelo:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear el vuelo. Verifica que el número de vuelo no exista.',
            confirmButtonColor: '#d33'
          });
        }
      });

    } catch (error) {
      console.error('Error obteniendo próximo ID:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar ID del vuelo',
        confirmButtonColor: '#d33'
      });
    }
  }

  addAirline() {
    const id = this.newAirline.code.toUpperCase();
    const airline = {
      id,
      ...this.newAirline,
      code: this.newAirline.code.toUpperCase()
    };

    this.http.post<Airline>('http://localhost:3000/airlines', airline).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Aerolínea creada',
          text: 'La aerolínea se ha creado exitosamente',
          confirmButtonColor: '#3085d6'
        });
        this.resetNewAirline();
        this.fetchAirlines();
        const modal = document.getElementById('airlineModal');
        if (modal) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modal);
          modalInstance?.hide();
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo crear la aerolínea',
          confirmButtonColor: '#d33'
        });
        console.error(err);
      }
    });
  }

  startEdit(flight: Flight) {
    this.editFlight = { ...flight };
  }

  saveEdit() {
    if (!this.editFlight) return;

    const occupiedCount = this.getOccupiedSeatsCount(this.editFlight.id);
    this.editFlight.availableSeats = this.editFlight.totalSeats - occupiedCount;

    this.http.put<Flight>(`http://localhost:3000/flights/${this.editFlight.id}`, this.editFlight).subscribe({
      next: (updatedFlight) => {
        Swal.fire({
          icon: 'success',
          title: 'Vuelo actualizado',
          html: `
            <div class="text-start">
              <p><strong>Vuelo:</strong> ${updatedFlight.flightNumber}</p>
              <p><strong>Total asientos:</strong> ${updatedFlight.totalSeats}</p>
              <p><strong>Asientos ocupados:</strong> ${occupiedCount}</p>
              <p><strong>Asientos disponibles:</strong> ${updatedFlight.availableSeats}</p>
            </div>
          `,
          confirmButtonColor: '#3085d6'
        });

        this.editFlight = null;
        this.fetchAllData();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron guardar los cambios',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  cancelEdit() {
    this.editFlight = null;
  }

  deleteFlight(id: number) {
    const flight = this.flights().find(f => f.id === id);
    const occupiedCount = this.getOccupiedSeatsCount(id);

    Swal.fire({
      title: '¿Estás seguro?',
      html: `
        <div class="text-start">
          <p><strong>Vuelo:</strong> ${flight?.flightNumber}</p>
          <p><strong>Asientos ocupados:</strong> ${occupiedCount}</p>
          ${occupiedCount > 0 ? '<p class="text-warning"><strong>Este vuelo tiene reservas confirmadas!</strong></p>' : ''}
          <p class="text-danger">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`http://localhost:3000/flights/${id}`).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El vuelo ha sido eliminado',
              confirmButtonColor: '#3085d6'
            });
            this.fetchAllData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el vuelo',
              confirmButtonColor: '#d33'
            });
            console.error(err);
          }
        });
      }
    });
  }

  getAirlineName(airlineId: string): string {
    return this.airlines().find(a => a.id === airlineId)?.name || airlineId;
  }

  getFlightStats(flight: Flight) {
    const occupiedCount = this.getOccupiedSeatsCount(flight.id);
    const occupancyPercentage = flight.totalSeats > 0 ?
      Math.round((occupiedCount / flight.totalSeats) * 100) : 0;

    return {
      occupiedSeats: occupiedCount,
      availableSeats: flight.availableSeats,
      occupancyPercentage
    };
  }

  private resetNewFlight() {
    this.newFlight = {
      flightNumber: '',
      origin: '',
      destination: '',
      departure: '',
      arrival: '',
      airline: '',
      totalSeats: 180,
      economyPrice: 0,
      businessPrice: 0
    };
  }

  private resetNewAirline() {
    this.newAirline = {
      name: '',
      code: ''
    };
  }
}
