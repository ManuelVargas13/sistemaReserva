import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user = signal<any>(null);
  adminStats = signal({
    totalFlights: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  userStats = signal({
    bookingsCount: 0,
    totalFlights: 0,
    uniqueDestinations: 0,
    totalSpent: 0,
    upcomingFlights: 0
  });

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.user.set(this.auth.getUser());

    if (this.isAdmin()) {
      this.loadAdminStats();
    } else {
      this.loadUserStats();
    }
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  getUserName(): string {
    return this.user()?.name || 'Usuario';
  }

  loadAdminStats() {
    // Cargar estadísticas generales del sistema
    Promise.all([
      this.http.get<any[]>('http://localhost:3000/flights').toPromise(),
      this.http.get<any[]>('http://localhost:3000/bookings').toPromise(),
      this.http.get<any[]>('http://localhost:3000/users').toPromise()
    ]).then(([flights, bookings, users]) => {
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];

      // Calcular ingresos totales
      let totalRevenue = 0;
      confirmedBookings.forEach(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        if (flight) {
          const price = booking.class === 'business' ? flight.businessPrice : flight.economyPrice;
          totalRevenue += price * (booking.seats?.length || 1);
        }
      });

      this.adminStats.set({
        totalFlights: flights?.length || 0,
        totalBookings: confirmedBookings.length,
        totalUsers: users?.length || 0,
        totalRevenue: Math.round(totalRevenue)
      });
    }).catch(err => {
      console.error('Error loading admin stats:', err);
    });
  }

  loadUserStats() {
    const userId = Number(localStorage.getItem('loggedUserId'));

    Promise.all([
      this.http.get<any[]>('http://localhost:3000/bookings').toPromise(),
      this.http.get<any[]>('http://localhost:3000/flights').toPromise()
    ]).then(([bookings, flights]) => {
      const userBookings = bookings?.filter(b => Number(b.userId) === userId) || [];
      const confirmedBookings = userBookings.filter(b => b.status === 'confirmed');

      // Calcular destinos únicos
      const destinations = new Set();
      confirmedBookings.forEach(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        if (flight) {
          destinations.add(flight.destination);
        }
      });

      // Calcular total gastado
      let totalSpent = 0;
      confirmedBookings.forEach(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        if (flight) {
          const price = booking.class === 'business' ? flight.businessPrice : flight.economyPrice;
          totalSpent += price * (booking.seats?.length || 1);
        }
      });

      // Próximos vuelos
      const now = new Date();
      const upcoming = confirmedBookings.filter(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        return flight && new Date(flight.departure) > now;
      });

      this.userStats.set({
        bookingsCount: confirmedBookings.length,
        totalFlights: confirmedBookings.length,
        uniqueDestinations: destinations.size,
        totalSpent: Math.round(totalSpent),
        upcomingFlights: upcoming.length
      });
    }).catch(err => {
      console.error('Error loading user stats:', err);
    });
  }

  showPopularDestinations() {
    Swal.fire({
      title: '🌍 Destinos Populares',
      html: `
        <div class="text-start">
          <div class="row">
            <div class="col-6 mb-3">
              <div class="card h-100">
                <div class="card-body text-center">
                  <h6>🇪🇸 Madrid</h6>
                  <small class="text-muted">Desde $450</small>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="card h-100">
                <div class="card-body text-center">
                  <h6>🇺🇸 Nueva York</h6>
                  <small class="text-muted">Desde $680</small>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="card h-100">
                <div class="card-body text-center">
                  <h6>🇫🇷 París</h6>
                  <small class="text-muted">Desde $520</small>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="card h-100">
                <div class="card-body text-center">
                  <h6>🇯🇵 Tokio</h6>
                  <small class="text-muted">Desde $890</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Buscar Vuelos',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#007bff'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = '/flights/search';
      }
    });
  }

  editProfile() {
    Swal.fire({
      title: '👤 Editar Perfil',
      text: 'Esta funcionalidad estará disponible próximamente',
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#007bff'
    });
  }
}
