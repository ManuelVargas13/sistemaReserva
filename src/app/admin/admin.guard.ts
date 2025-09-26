
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const isAdmin = auth.isAdmin();
  console.log('Guard admin, isAdmin:', isAdmin, 'Usuario:', auth.getUser());
  return isAdmin;
};
