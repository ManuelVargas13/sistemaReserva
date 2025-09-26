import { Component, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

declare var $: any;

interface ReportData {
  totalFlights: number;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
}

interface FlightOccupancy {
  id: number;
  flightNumber: string;
  origin: string;
  destination: string;
  airline: string;
  totalSeats: number;
  occupiedSeats: number;
  occupancyPercentage: number;
  revenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  bookings: number;
}

@Component({
  selector: 'app-reports-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-admin.component.html'
})
export class ReportsAdminComponent implements OnInit, AfterViewInit {
  loading = signal(false);
  reportData = signal<ReportData>({
    totalFlights: 0,
    totalBookings: 0,
    totalRevenue: 0,
    occupancyRate: 0
  });
  flightOccupancy = signal<FlightOccupancy[]>([]);
  monthlyRevenue = signal<MonthlyRevenue[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadReports();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initDataTable();
    }, 500);
  }

  initDataTable() {
    $('#reportsTable').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      },
      responsive: true,
      pageLength: 10,
      order: [[4, 'desc']], // Ordenar por % ocupación
      columnDefs: [
        { orderable: false, targets: [4] } // Progress bar no ordenable
      ]
    });
  }

  loadReports() {
    this.loading.set(true);
    Promise.all([
      this.loadGeneralStats(),
      this.loadFlightOccupancy(),
      this.loadMonthlyRevenue()
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  async loadGeneralStats() {
    try {
      const [flights, bookings] = await Promise.all([
        this.http.get<any[]>('http://localhost:3000/flights').toPromise(),
        this.http.get<any[]>('http://localhost:3000/bookings').toPromise()
      ]);

      const totalFlights = flights?.length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
      const totalBookings = confirmedBookings.length;

      // CALCULAR ASIENTOS OCUPADOS DESDE BOOKINGS
      let totalRevenue = 0;
      let totalSeats = 0;
      let totalOccupiedSeats = 0;

      // Calcular total de asientos disponibles
      flights?.forEach(flight => {
        totalSeats += flight.totalSeats || 0;
      });

      // CALCULAR ASIENTOS OCUPADOS Y REVENUE DESDE BOOKINGS
      confirmedBookings.forEach(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        if (flight) {
          // Contar asientos ocupados
          if (booking.seats && Array.isArray(booking.seats)) {
            totalOccupiedSeats += booking.seats.length;
          } else if (booking.seat) {
            totalOccupiedSeats += 1; // Para compatibilidad con formato antiguo
          }

          // Calcular revenue
          const price = booking.class === 'business' ? flight.businessPrice : flight.economyPrice;
          const seatCount = booking.seats?.length || booking.passengers?.length || 1;
          totalRevenue += price * seatCount;
        }
      });

      const occupancyRate = totalSeats > 0 ? Math.round((totalOccupiedSeats / totalSeats) * 100) : 0;

      this.reportData.set({
        totalFlights,
        totalBookings,
        totalRevenue,
        occupancyRate
      });
    } catch (error) {
      console.error('Error loading general stats:', error);
    }
  }

  async loadFlightOccupancy() {
    try {
      const [flights, bookings, airlines] = await Promise.all([
        this.http.get<any[]>('http://localhost:3000/flights').toPromise(),
        this.http.get<any[]>('http://localhost:3000/bookings').toPromise(),
        this.http.get<any[]>('http://localhost:3000/airlines').toPromise()
      ]);

      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];

      const occupancyData: FlightOccupancy[] = flights?.map(flight => {
        const flightBookings = confirmedBookings.filter(b => b.flightId === flight.id);

        let occupiedSeats = 0;
        flightBookings.forEach(booking => {
          if (booking.seats && Array.isArray(booking.seats)) {
            occupiedSeats += booking.seats.length;
          } else if (booking.seat) {
            occupiedSeats += 1; // Para compatibilidad
          }
        });

        const occupancyPercentage = flight.totalSeats > 0 ? Math.round((occupiedSeats / flight.totalSeats) * 100) : 0;

        let revenue = 0;
        flightBookings.forEach(booking => {
          const price = booking.class === 'business' ? flight.businessPrice : flight.economyPrice;
          const seatCount = booking.seats?.length || booking.passengers?.length || 1;
          revenue += price * seatCount;
        });

        const airline = airlines?.find(a => a.id === flight.airline);

        return {
          id: flight.id,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          airline: airline?.name || flight.airline,
          totalSeats: flight.totalSeats,
          occupiedSeats,
          occupancyPercentage,
          revenue
        };
      }) || [];

      this.flightOccupancy.set(occupancyData);
    } catch (error) {
      console.error('Error loading flight occupancy:', error);
    }
  }

  async loadMonthlyRevenue() {
    try {
      const [flights, bookings] = await Promise.all([
        this.http.get<any[]>('http://localhost:3000/flights').toPromise(),
        this.http.get<any[]>('http://localhost:3000/bookings').toPromise()
      ]);

      const monthlyData: { [key: string]: { revenue: number; bookings: number } } = {};

      const confirmedBookings = bookings?.filter(booking => booking.status === 'confirmed') || [];

      confirmedBookings.forEach(booking => {
        const flight = flights?.find(f => f.id === booking.flightId);
        if (flight && booking.bookingDate) {
          const date = new Date(booking.bookingDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, bookings: 0 };
          }

          const price = booking.class === 'business' ? flight.businessPrice : flight.economyPrice;

          // Usar seats.length si existe, sino passengers.length
          const seatCount = booking.seats?.length || booking.passengers?.length || 1;

          monthlyData[monthKey].revenue += price * seatCount;
          monthlyData[monthKey].bookings += 1;
        }
      });

      const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => {
        // Convertir "2025-09" a "septiembre 2025"
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long'
        });

        return {
          month: monthName,
          revenue: data.revenue,
          bookings: data.bookings
        };
      }).sort((a, b) => {
        // Ordenar por fecha (más reciente primero)
        const dateA = new Date(`01 ${a.month}`);
        const dateB = new Date(`01 ${b.month}`);
        return dateB.getTime() - dateA.getTime();
      });

      this.monthlyRevenue.set(monthlyRevenue);
    } catch (error) {
      console.error('Error loading monthly revenue:', error);
    }
  }

  getOccupancyColor(percentage: number): string {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  refreshReports() {
    this.loadReports();
    setTimeout(() => {
      $('#reportsTable').DataTable().destroy();
      this.initDataTable();
    }, 100);
  }
}
