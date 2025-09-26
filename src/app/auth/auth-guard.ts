import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = auth.isAuthenticated();
  console.log('Auth Guard - isAuthenticated:', isAuthenticated, 'Usuario:', auth.getUser());

  if (isAuthenticated) {
    return true;
  }

  // Si no está autenticado, redirigir al login
  console.log('Acceso denegado, redirigiendo al login');
  router.navigate(['/auth']);
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = auth.isAuthenticated();
  console.log('Guest Guard - isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    return true;
  }

  // Si ya está autenticado, redirigir al dashboard
  console.log('Usuario ya logueado, redirigiendo al dashboard');
  router.navigate(['/']);
  return false;
};
