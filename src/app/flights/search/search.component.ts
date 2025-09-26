import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FlightsService } from '../flights.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-search-flights',
  standalone: true,
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
})
export class SearchFlightsComponent {
  searchForm;
  flights = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  hasSearched = signal(false);

  classes = [
    { value: 'economy', label: 'Económica' },
    { value: 'business', label: 'Ejecutiva' }
  ];

  constructor(private fb: FormBuilder, private flightsService: FlightsService, private router: Router) {
    this.searchForm = this.fb.group({
      origin: ['', [Validators.required, Validators.minLength(2)]],
      destination: ['', [Validators.required, Validators.minLength(2)]],
      date: [''],
      passengers: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      class: ['economy', Validators.required]
    });
  }

  getFlightPrice(flight: any, flightClass: string): number {
    if (flightClass === 'business') {
      return flight.businessPrice || 0;
    } else {
      return flight.economyPrice || 0;
    }
  }

  getAirlineName(airlineId: string): string {
    const airlines: { [key: string]: string } = {
      '301': 'Latam',
      'MT1': 'Metropolitana',
      'bgnyzktr': 'Sky'
    };
    return airlines[airlineId] || airlineId;
  }

  async search() {
    this.loading.set(true);
    this.error.set('');
    this.hasSearched.set(false);

    try {
      const searchOrigin = String(this.searchForm.value.origin ?? '').trim();
      const searchDestination = String(this.searchForm.value.destination ?? '').trim();
      const date = String(this.searchForm.value.date ?? '');
      const passengers = Number(this.searchForm.value.passengers ?? 1);
      const flightClass = String(this.searchForm.value.class ?? 'economy');

      const flights = await this.flightsService.searchFlights(
        searchOrigin,
        searchDestination,
        date,
        passengers,
        flightClass
      );

      this.flights.set(flights);
      this.hasSearched.set(true);

      if (flights.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          html: `
            <div class="text-center">
              <i class="bi bi-airplane text-muted fs-2 mb-2"></i>
              <p class="mb-1">No se encontraron vuelos</p>
              <small class="text-muted">
                ${searchOrigin ? `Desde: <strong>${searchOrigin}</strong><br>` : ''}
                ${searchDestination ? `Hacia: <strong>${searchDestination}</strong><br>` : ''}
                ${date ? `Fecha: <strong>${date}</strong><br>` : ''}
                Pasajeros: <strong>${passengers}</strong>
              </small>
            </div>
          `,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#007bff'
        });
      }

    } catch (e) {
      console.error('Error en búsqueda:', e);
      this.error.set('Error al buscar vuelos');

      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo realizar la búsqueda. Inténtalo de nuevo.',
        confirmButtonText: 'Reintentar',
        confirmButtonColor: '#dc3545'
      });
    }

    this.loading.set(false);
  }

  private markFormGroupTouched() {
    Object.keys(this.searchForm.controls).forEach(field => {
      const control = this.searchForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  selectFlight(flight: any) {
    const passengersCount = this.searchForm.value.passengers || 1;
    const selectedClass = this.searchForm.value.class || 'economy';

    const passengersArray = [];
    for (let i = 1; i <= passengersCount; i++) {
      passengersArray.push({
        firstName: `Pasajero`,
        lastName: `${i}`,
        documentType: 'DNI',
        documentNumber: '00000000'
      });
    }

    const state = {
      flight,
      passengers: passengersArray,
      class: selectedClass,
      passengersCount: passengersCount
    };

    localStorage.setItem('selectedFlightState', JSON.stringify(state));
    localStorage.setItem('selectedFlight', JSON.stringify(flight));
    localStorage.setItem('searchPassengers', passengersCount.toString());
    localStorage.setItem('selectedClass', selectedClass);

    console.log('Vuelo seleccionado:', {
      flight: flight.flightNumber,
      passengersCount: passengersCount,
      class: selectedClass
    });

    this.router.navigate([`/flights/${flight.id}/seats`], {
      state: state
    });
  }

  get origin() { return this.searchForm.get('origin'); }
  get destination() { return this.searchForm.get('destination'); }
  get passengers() { return this.searchForm.get('passengers'); }
}
