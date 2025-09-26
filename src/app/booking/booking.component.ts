import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { SeatService } from '../services/seat.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
})
export class BookingComponent implements OnInit {
  bookingForm;
  flight = signal<any>(null);
  seats = signal<string[]>([]);
  bookingClass = signal<string>('economy');
  passengersCount = signal<number>(1);
  paymentMethod = signal<string>('card');
  success = signal<boolean>(false);
  loading = signal<boolean>(false);
  airlines = signal<any[]>([]);
  paymentMethods = signal<any[]>([]);

  get passengerControls() {
    return (this.bookingForm.get('passengers') as FormArray)?.controls;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private seatService: SeatService
  ) {
    this.bookingForm = this.fb.group({
      passengers: this.fb.array([]),
      paymentMethod: ['', Validators.required]
    });
  }

  ngOnInit() {
    console.log('🎯 BOOKING COMPONENT INITIALIZED');

    // Cargar métodos de pago
    this.http.get<any[]>('http://localhost:3000/paymentMethods').subscribe({
      next: (data) => {
        this.paymentMethods.set(data);
      },
      error: (err) => {
        console.error('Error al cargar métodos de pago:', err);
        this.paymentMethods.set([]);
      }
    });

    // Cargar aerolíneas
    this.http.get<any[]>('http://localhost:3000/airlines').subscribe({
      next: data => this.airlines.set(data),
      error: err => console.error('Error al cargar aerolíneas:', err)
    });

    // Cargar datos de navegación
    this.loadBookingData();
  }

  loadBookingData() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;

    if (state && state['flight']) {
      console.log('📱 Data from navigation state:', state);
      this.flight.set(state['flight']);
      this.seats.set(state['seats'] || []);
      this.bookingClass.set(state['class'] || 'economy');
      this.initPassengers(state['seats']?.length || 1);
    } else {
      const reservationData = localStorage.getItem('reservationData');
      const selectedSeats = localStorage.getItem('selectedSeats');
      const selectedClass = localStorage.getItem('selectedClass');

      if (reservationData) {
        try {
          const data = JSON.parse(reservationData);

          this.flight.set(data.flight);
          this.seats.set(data.seats || []);
          this.bookingClass.set(data.class || 'economy');
          this.initPassengers(data.seats?.length || 1);
        } catch (err) {
          console.error('Error parsing reservation data:', err);
        }
      }

      if (selectedSeats) {
        try {
          const seats = JSON.parse(selectedSeats);
          this.seats.set(seats);
          this.initPassengers(seats.length);
        } catch (err) {
          console.error('Error parsing selected seats:', err);
        }
      }

      if (selectedClass) {
        this.bookingClass.set(selectedClass);
      }
    }
  }

  initPassengers(count: number) {
    console.log('👥 Initializing passengers:', count);

    const arr = this.bookingForm.get('passengers') as FormArray;
    arr.clear();

    for (let i = 0; i < count; i++) {
      arr.push(this.fb.group({
        name: ['', Validators.required],
        document: ['', Validators.required],
        age: ['', [Validators.required, Validators.min(1), Validators.max(120)]]
      }));
    }

    this.passengersCount.set(count);
  }

  submit() {

    if (!this.bookingForm.valid) {
      // Marcar todos los campos como touched para mostrar errores
      this.markFormGroupTouched(this.bookingForm);
      return;
    }

    this.loading.set(true);

    const userId = Number(localStorage.getItem('loggedUserId'));
    if (!userId) {
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes iniciar sesión para realizar una reserva',
        confirmButtonColor: '#d33'
      }).then(() => {
        this.router.navigate(['/auth']);
      });
      return;
    }

    const formValue = this.bookingForm.value;
    const passengers = formValue.passengers as any[] || [];
    const paymentMethodId = formValue.paymentMethod || '';

    if (!this.flight() || !this.seats().length || !passengers.length || !paymentMethodId) {
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Faltan datos para completar la reserva',
        confirmButtonColor: '#d33'
      });
      return;
    }

    const reservationData = {
      flightId: Number(this.flight()!.id),
      seats: this.seats(),
      passengers: passengers,
      class: this.bookingClass(),
      userId,
      paymentMethod: paymentMethodId
    };

    console.log('🎫 CONFIRMING FINAL RESERVATION:', reservationData);

    // Usar SeatService para la reserva final
    this.seatService.reserveSeats(reservationData).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.success.set(true);

        Swal.fire({
          icon: 'success',
          title: '¡Reserva confirmada!',
          text: 'Tu reserva se ha procesado exitosamente',
          confirmButtonColor: '#28a745'
        }).then(() => {
          // Limpiar localStorage
          localStorage.removeItem('reservationData');
          localStorage.removeItem('selectedSeats');
          localStorage.removeItem('selectedClass');

          // Ir a mis reservas
          this.router.navigate(['/bookings']);
        });
      },
      error: (err) => {
        console.error('❌ RESERVATION FAILED:', err);
        this.loading.set(false);

        Swal.fire({
          icon: 'error',
          title: 'Error en la reserva',
          text: err.message || 'No se pudo procesar la reserva',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  goBack() {
    const flightId = this.flight()?.id;
    if (flightId) {
      this.router.navigate([`/flights/${flightId}/seats`]);
    } else {
      this.router.navigate(['/flights/search']);
    }
  }

  getAirlineName(id: string): string {
    return this.airlines().find(a => a.id === id)?.name || id;
  }

  getClassPrice(): number {
    if (!this.flight()) return 0;
    return this.bookingClass() === 'business'
      ? this.flight().businessPrice
      : this.flight().economyPrice;
  }

  getTotalPrice(): number {
    return this.getClassPrice() * (this.seats()?.length || 1);
  }

  // Método auxiliar para marcar formulario como touched
  private markFormGroupTouched(formGroup: any) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          this.markFormGroupTouched(arrayControl);
        });
      }
    });
  }
}
