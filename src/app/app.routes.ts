import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth-guard';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
	{
		path: 'booking',
		loadChildren: () => import('./booking').then(m => m.bookingRoutes),
    canActivate: [authGuard]
	},
	{
		path: 'auth',
		loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
    canActivate: [guestGuard]
	},
	{
		path: 'admin',
		canActivate: [authGuard, adminGuard],
		loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
	},
	{
		path: '',
		loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes),
    canActivate: [authGuard]
	},
	{
		path: 'flights/search',
		loadChildren: () => import('./flights/search/search.routes').then(m => m.searchRoutes),
    canActivate: [authGuard]
	},
	{
		path: 'flights/:id/seats',
		loadChildren: () => import('./flights/seats/seats.routes').then(m => m.seatsRoutes),
    canActivate: [authGuard]
	},
	{
		path: 'bookings',
		loadComponent: () => import('./bookings/bookings.component').then(m => m.BookingsComponent),
    canActivate: [authGuard]
	},
  {
    path: '**',
    redirectTo: '/auth'
  },
];
